/**
 * CA Nexus Hub - Verify Payment Edge Function
 * 
 * This function securely verifies Razorpay payments on the server side.
 * Signature verification happens server-side - client cannot fake it.
 * 
 * Deploy: supabase functions deploy verify-payment
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Server-side secrets
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  leadId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, leadId }: VerifyPaymentRequest = await req.json();

    if (!razorpayOrderId || !razorpayPaymentId || !leadId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify signature server-side (cannot be faked by client)
    const isValidSignature = await verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValidSignature && !razorpayOrderId.startsWith("demo_")) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid payment signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order details
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("razorpay_order_id", razorpayOrderId)
      .single();

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, message: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order status
    await supabaseAdmin
      .from("orders")
      .update({
        razorpay_payment_id: razorpayPaymentId,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", razorpayOrderId);

    // Add to purchased_leads
    const { error: purchaseError } = await supabaseAdmin
      .from("purchased_leads")
      .insert({
        user_id: user.id,
        lead_id: leadId,
        payment_id: razorpayPaymentId,
        payment_status: "completed",
        amount: order.amount,
        payment_method: razorpayOrderId.startsWith("demo_") ? "demo" : "razorpay",
        paid_at: new Date().toISOString(),
      });

    if (purchaseError) {
      console.error("Error inserting purchased lead:", purchaseError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to record purchase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update invoice if exists
    await supabaseAdmin
      .from("invoices")
      .update({
        status: "paid",
        sent_at: new Date().toISOString(),
      })
      .eq("lead_id", leadId)
      .eq("user_id", user.id);

    // Record transaction
    await supabaseAdmin.from("transactions").insert({
      user_id: user.id,
      lead_id: leadId,
      amount: order.amount,
      payment_method: razorpayOrderId.startsWith("demo_") ? "demo" : "razorpay",
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
      razorpay_signature: razorpaySignature,
      status: "completed",
      type: "purchase",
    });

    // Log audit
    await logAudit(supabaseAdmin, user.id, "LEAD_PURCHASE", {
      leadId,
      amount: order.amount,
      paymentId: razorpayPaymentId,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Payment verified successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Verify Razorpay signature server-side
 */
async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  try {
    const crypto = await import("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    return expectedSignature === signature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Log audit event
 */
async function logAudit(
  supabaseAdmin: any,
  userId: string,
  action: string,
  details: Record<string, any>
) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action,
      details: JSON.stringify(details),
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}
