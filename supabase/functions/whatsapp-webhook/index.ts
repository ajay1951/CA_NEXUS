/**
 * CA Nexus Hub - WhatsApp Webhook Edge Function
 * 
 * This function receives incoming WhatsApp messages from Twilio webhooks.
 * It stores messages in the database and can trigger automated responses.
 * 
 * Deploy: supabase functions deploy whatsapp-webhook
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Twilio webhook verification token
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";

interface TwilioWebhook {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  ProfileName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Handle GET request for Twilio webhook verification
    if (req.method === "GET") {
      return new Response(
        "CA Nexus Hub WhatsApp Webhook is active",
        { headers: { ...corsHeaders, "Content-Type": "text/plain" } }
      );
    }

    const formData = await req.formData();
    
    const webhookData: TwilioWebhook = {
      MessageSid: formData.get("MessageSid") as string || "",
      AccountSid: formData.get("AccountSid") as string || "",
      From: formData.get("From") as string || "",
      To: formData.get("To") as string || "",
      Body: formData.get("Body") as string || "",
      ProfileName: formData.get("ProfileName") as string || undefined,
    };

    if (!webhookData.MessageSid || !webhookData.From) {
      return new Response(
        "Missing required fields",
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/plain" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Extract phone number from "whatsapp:+1234567890"
    const fromNumber = webhookData.From.replace("whatsapp:", "");
    
    // Try to find user by phone number
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, phone, full_name")
      .eq("phone", fromNumber)
      .single();

    // Try to find lead by client phone (for document collection flow)
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, client_phone, status")
      .eq("client_phone", fromNumber)
      .single();

    // Store the incoming message
    await supabaseAdmin.from("whatsapp_messages").insert({
      user_id: user?.id || null,
      lead_id: lead?.id || null,
      direction: "inbound",
      message_type: "incoming",
      content: webhookData.Body,
      twilio_sid: webhookData.MessageSid,
      from_number: fromNumber,
      to_number: webhookData.To.replace("whatsapp:", ""),
      status: "received",
      created_at: new Date().toISOString(),
    });

    // Process the message and determine response
    const response = await processIncomingMessage(
      supabaseAdmin,
      webhookData.Body,
      user,
      lead
    );

    // If there's an automated response, send it
    if (response && lead?.id) {
      await sendAutomatedResponse(supabaseAdmin, fromNumber, response, lead.id);
    }

    // Return TwiML response (empty for now - we handle responses separately)
    return new Response(
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>",
      { headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      "Error processing webhook",
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/plain" } }
    );
  }
});

/**
 * Process incoming message and determine automated response
 */
async function processIncomingMessage(
  supabaseAdmin: any,
  body: string,
  user: any,
  lead: any
): Promise<string | null> {
  const message = body.trim().toLowerCase();

  // If no lead found, welcome message
  if (!lead) {
    return "Welcome to CA Nexus Hub! We're connecting you with a Chartered Accountant. Please wait while we process your request.";
  }

  // Check current lead status for document collection flow
  if (lead.status === "document_collection") {
    // Check if this is a document upload confirmation
    if (message.includes("document") || message.includes("uploaded")) {
      // Update lead status
      await supabaseAdmin
        .from("leads")
        .update({ status: "document_received", updated_at: new Date().toISOString() })
        .eq("id", lead.id);

      return "Thank you for uploading your documents. Your CA will review them shortly.";
    }
  }

  // Default: acknowledge receipt
  return "Thank you for your message. Your CA will get back to you shortly.";
}

/**
 * Send automated response via Twilio
 */
async function sendAutomatedResponse(
  supabaseAdmin: any,
  to: string,
  message: string,
  leadId: string
) {
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER") || "";

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const formData = new URLSearchParams();
  formData.append("From", `whatsapp:${TWILIO_PHONE_NUMBER}`);
  formData.append("To", `whatsapp:+${to}`);
  formData.append("Body", message);

  try {
    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (response.ok) {
      const messageData = await response.json();
      
      // Log the outgoing message
      await supabaseAdmin.from("whatsapp_messages").insert({
        lead_id: leadId,
        direction: "outbound",
        message_type: "automated",
        content: message,
        twilio_sid: messageData.sid,
        status: messageData.status,
        created_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error sending automated response:", error);
  }
}
