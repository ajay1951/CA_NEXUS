/**
 * CA Nexus Hub - Secure WhatsApp Edge Function
 * 
 * This function sends WhatsApp messages via Twilio API on the server side.
 * API credentials are never exposed to the client.
 * 
 * Deploy: supabase functions deploy send-whatsapp
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Server-side only - Twilio credentials
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER") || "";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface WhatsAppRequest {
  to: string;
  body: string;
  type?: "otp" | "nudge" | "document_request" | "approval_notification" | "lead_update";
  leadId?: string;
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

    const { to, body, type, leadId }: WhatsAppRequest = await req.json();

    if (!to || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting check (max 10 WhatsApp per hour per user)
    try {
      const { data: rateCheck } = await supabaseAdmin.rpc(
        "check_rate_limit",
        { p_action_type: "whatsapp", p_max_per_hour: 10 }
      );
      
      if (!rateCheck) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (rateError) {
      console.log("Rate limit check failed:", rateError);
    }

    // Format phone number for WhatsApp (must start with country code)
    let formattedTo = to;
    if (!to.startsWith("+")) {
      formattedTo = "+91" + to; // Default to India
    }

    // Send WhatsApp via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append("From", `whatsapp:${TWILIO_PHONE_NUMBER}`);
    formData.append("To", `whatsapp:${formattedTo}`);
    formData.append("Body", body);

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Twilio error:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to send WhatsApp message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageData = await response.json();

    // Log the message in database if it's related to a lead
    if (leadId) {
      await supabaseAdmin.from("whatsapp_messages").insert({
        user_id: user.id,
        lead_id: leadId,
        direction: "outbound",
        message_type: type || "general",
        content: body,
        twilio_sid: messageData.sid,
        status: messageData.status,
        created_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ success: true, messageSid: messageData.sid, status: messageData.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
