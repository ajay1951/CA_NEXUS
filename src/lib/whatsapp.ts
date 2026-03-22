/**
 * WhatsApp Integration via Twilio
 * 
 * This library uses Supabase Edge Functions to securely send WhatsApp messages.
 * Twilio credentials are stored server-side and never exposed to the client.
 * 
 * To enable WhatsApp:
 * 1. Get Twilio Account SID, Auth Token, and Phone Number from Twilio
 * 2. Add secrets to Supabase:
 *    - supabase secrets set TWILIO_ACCOUNT_SID=your_sid
 *    - supabase secrets set TWILIO_AUTH_TOKEN=your_token
 *    - supabase secrets set TWILIO_PHONE_NUMBER=your_whatsapp_number
 * 3. Deploy Edge Function: supabase functions deploy send-whatsapp
 * 4. Configure Twilio webhook to point to your deployed function
 */

import { supabase } from './supabase';

// Edge Function URL - replace with your actual Supabase project URL
const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : 'http://localhost:54321/functions/v1';

export interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string;
  type?: "otp" | "nudge" | "document_request" | "approval_notification" | "lead_update";
  leadId?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
}

/**
 * Get authentication token for Edge Function calls
 */
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return session.access_token;
}

/**
 * Send WhatsApp message via Edge Function
 * Twilio credentials stay server-side - client never sees them
 */
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${EDGE_FUNCTION_URL}/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to send WhatsApp message');
    }

    const data = await response.json();
    return { 
      success: true, 
      messageId: data.messageSid,
      status: data.status 
    };
  } catch (error: any) {
    console.error('WhatsApp error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send OTP via WhatsApp for verification
 */
export async function sendOTP(phone: string, otp: string): Promise<WhatsAppResponse> {
  const message = `🔐 Your CA Nexus Hub OTP is: ${otp}

This OTP is valid for 10 minutes. Never share this with anyone.`;

  return sendWhatsAppMessage({ 
    to: phone, 
    body: message,
    type: "otp"
  });
}

/**
 * Send nudge/follow-up message to client
 */
export async function sendNudge(
  phone: string, 
  leadName: string, 
  caName: string,
  leadId?: string
): Promise<WhatsAppResponse> {
  const message = `Hi! This is a reminder about your inquiry for "${leadName}".

${caName} from CA Nexus Hub will reach out to you shortly.

Thank you for your patience!`;

  return sendWhatsAppMessage({ 
    to: phone, 
    body: message,
    type: "nudge",
    leadId
  });
}

/**
 * Send lead request notification
 */
export async function sendLeadRequestWhatsApp(
  phone: string,
  caName: string,
  leadTitle: string,
  leadId?: string
): Promise<WhatsAppResponse> {
  const message = `📋 New Lead Assignment

Hi! You have been assigned a new lead:

Lead: ${leadTitle}
CA: ${caName}

Please check your dashboard for details.`;

  return sendWhatsAppMessage({ 
    to: phone, 
    body: message,
    type: "lead_update",
    leadId
  });
}

/**
 * Send document request
 */
export async function sendDocumentRequest(
  phone: string,
  caName: string,
  documentType: string,
  leadTitle: string,
  leadId?: string
): Promise<WhatsAppResponse> {
  const message = `📄 Document Required

Hi! ${caName} is requesting the following document:

Type: ${documentType}
For: ${leadTitle}

Please upload the document through your dashboard or reply with the document.

Thank you!`;

  return sendWhatsAppMessage({ 
    to: phone, 
    body: message,
    type: "document_request",
    leadId
  });
}

/**
 * Send approval notification
 */
export async function sendApprovalNotification(
  phone: string,
  leadTitle: string,
  caName: string,
  leadId?: string
): Promise<WhatsAppResponse> {
  const message = `✅ Great News!

Your request for lead "${leadTitle}" has been approved by ${caName}!

This lead is now exclusively assigned to you. You can view the full details in your dashboard.

Best of luck with your new lead!`;

  return sendWhatsAppMessage({ 
    to: phone, 
    body: message,
    type: "approval_notification",
    leadId
  });
}

/**
 * Check if WhatsApp is configured (Edge Function is accessible)
 * Note: This is a best-effort check - the actual config is server-side
 */
export async function isWhatsAppConfigured(): Promise<boolean> {
  try {
    const token = await getAuthToken().catch(() => null);
    if (!token) return false;
    
    // Try a simple check by calling the function with a test message
    // This will fail gracefully if not configured
    const response = await fetch(`${EDGE_FUNCTION_URL}/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        to: '9999999999', // Invalid number for testing
        body: 'test',
        type: 'general'
      })
    });
    
    // If we get a response (even error), the function exists
    return response.status !== 404;
  } catch {
    return false;
  }
}

/**
 * Get WhatsApp configuration status
 * Note: Actual credentials are server-side, this is just for UI feedback
 */
export function getWhatsAppConfig() {
  return {
    // Returns true if the Edge Function URL is configured
    configured: !!import.meta.env.VITE_SUPABASE_URL,
    edgeFunctionUrl: EDGE_FUNCTION_URL,
  };
}
