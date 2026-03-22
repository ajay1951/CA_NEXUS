/**
 * CA Nexus Hub - Secure Payment Edge Function
 * 
 * This function handles Razorpay order creation securely on the server side.
 * API secrets are never exposed to the client.
 * 
 * Deploy: supabase functions deploy create-payment
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Razorpay API configuration - server-side only
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

// Supabase configuration
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface CreatePaymentRequest {
  leadId: string;
  amount: number;
  userId: string;
  userEmail: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { leadId, amount, userEmail }: CreatePaymentRequest = await req.json();

    if (!leadId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get lead details
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("id, title, company_name, budget, category")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate GST (18%)
    const subtotal = amount;
    const gst = (amount * 18) / 100;
    const total = subtotal + gst;

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder({
      amount: Math.round(total * 100), // Convert to paise
      currency: "INR",
      receipt: `lead_${leadId}_${Date.now()}`,
      notes: {
        leadId,
        userId: user.id,
        userEmail,
        leadTitle: lead.title,
      },
    });

    // Save order to database
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        lead_id: leadId,
        amount: total,
        razorpay_order_id: razorpayOrder.id,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error saving order:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return order details to client (only public info)
    return new Response(
      JSON.stringify({
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: RAZORPAY_KEY_ID, // Only return public key
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error creating payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Create Razorpay order on server
 */
async function createRazorpayOrder(params: {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}) {
  const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${credentials}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.description || "Failed to create Razorpay order");
  }

  return await response.json();
}
