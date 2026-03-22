import { supabase } from './supabase';

// Edge Function URL - replace with your actual Supabase project URL
const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : 'http://localhost:54321/functions/v1';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
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
 * Call Edge Function to send email securely
 * Resend API key stays server-side
 */
async function callEmailFunction(to: string, subject: string, html: string): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${EDGE_FUNCTION_URL}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ to, subject, html }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to send email');
    }

    const result = await response.json();
    return { success: true, message: result.messageId || 'Email sent successfully' };
  } catch (error: any) {
    console.error('Error sending email via Edge Function:', error);
    return { success: false, message: error.message || 'Failed to send email' };
  }
}

/**
 * Send an email using Resend via Edge Function
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; message: string }> {
  const { to, subject, html, text } = params;

  // Use Edge Function for secure email sending
  return callEmailFunction(to, subject, html);
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(
  userEmail: string,
  userName: string,
  leadTitle: string,
  companyName: string,
  amount: number
): Promise<{ success: boolean; message: string }> {
  const subject = 'Payment Successful - CA Nexus Hub';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #666; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Successful!</h1>
        </div>
        <div class="content">
          <p>Dear ${userName},</p>
          <p>Thank you for your purchase! Your payment has been successfully processed.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Lead Title:</span>
              <span>${leadTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Company:</span>
              <span>${companyName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount Paid:</span>
              <span>₹${amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <p>You can now access the lead details from your dashboard. The contact information is available in the "My Purchases" section.</p>
          
          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Review the lead details in your dashboard</li>
            <li>Contact the client using the provided information</li>
            <li>Use our AI tools to draft professional outreach messages</li>
          </ul>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} CA Nexus Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: userEmail, subject, html });
}

/**
 * Send lead details email (after purchase)
 */
export async function sendLeadDetailsEmail(
  userEmail: string,
  userName: string,
  lead: {
    title: string;
    company_name: string;
    phone: string;
    email: string;
    description: string;
    budget: number;
  }
): Promise<{ success: boolean; message: string }> {
  const subject = `Your Lead Details - ${lead.title} - CA Nexus Hub`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #666; }
        .contact-info { background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Lead Details</h1>
        </div>
        <div class="content">
          <p>Dear ${userName},</p>
          <p>Here are the contact details for your purchased lead:</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Company:</span>
              <span>${lead.company_name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Lead Type:</span>
              <span>${lead.title}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Budget:</span>
              <span>₹${lead.budget.toLocaleString('en-IN')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Description:</span>
              <span>${lead.description}</span>
            </div>
          </div>
          
          <div class="contact-info">
            <h3 style="margin-top: 0;">Contact Information</h3>
            <p><strong>Phone:</strong> ${lead.phone}</p>
            <p><strong>Email:</strong> ${lead.email}</p>
          </div>
          
          <p>We recommend reaching out to this lead at the earliest!</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} CA Nexus Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: userEmail, subject, html });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<{ success: boolean; message: string }> {
  const subject = 'Welcome to CA Nexus Hub!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; }
        .features { list-style: none; padding: 0; }
        .features li { padding: 10px 0; border-bottom: 1px solid #eee; }
        .cta { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to CA Nexus Hub!</h1>
        </div>
        <div class="content">
          <p>Dear ${userName},</p>
          <p>Thank you for joining CA Nexus Hub - the premier platform for Chartered Accountants to grow their practice!</p>
          
          <h3>Here's what you can do:</h3>
          <ul class="features">
            <li><strong>Browse Leads:</strong> Discover potential clients seeking GST, Tax, and Audit services</li>
            <li><strong>Purchase Leads:</strong> Get exclusive access to client contact details</li>
            <li><strong>AI Content Hub:</strong> Generate professional LinkedIn posts and WhatsApp messages</li>
            <li><strong>Track Progress:</strong> Manage your leads and convert them into clients</li>
          </ul>
          
          <a href="#" class="cta">Get Started</a>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} CA Nexus Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: userEmail, subject, html });
}

/**
 * Send lead request notification to admin
 */
export async function sendLeadRequestNotification(
  adminEmail: string,
  caName: string,
  caEmail: string,
  leadTitle: string,
  companyName: string
): Promise<{ success: boolean; message: string }> {
  const subject = `🔔 New Lead Access Request - ${leadTitle}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #666; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .cta { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Lead Request</h1>
        </div>
        <div class="content">
          <p>A Chartered Accountant has requested access to a lead.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">CA Name:</span>
              <span>${caName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">CA Email:</span>
              <span>${caEmail}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Lead Title:</span>
              <span>${leadTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Company:</span>
              <span>${companyName}</span>
            </div>
          </div>
          
          <p>Please review and approve or reject this request.</p>
          <a href="#" class="cta">Review Request</a>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} CA Nexus Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: adminEmail, subject, html });
}

/**
 * Send lead approved notification to CA
 */
export async function sendLeadApprovedNotification(
  caEmail: string,
  caName: string,
  leadTitle: string,
  companyName: string
): Promise<{ success: boolean; message: string }> {
  const subject = `✅ Lead Access Approved - ${leadTitle}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .highlight { background: #d1fae5; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .cta { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Request Approved!</h1>
        </div>
        <div class="content">
          <p>Dear ${caName},</p>
          <p>Your request for lead <strong>"${leadTitle}"</strong> from <strong>${companyName}</strong> has been <strong>approved</strong>.</p>
          
          <div class="highlight">
            <p class="font-bold text-emerald-800">🎉 Exclusive Access Granted!</p>
            <p class="text-emerald-700">This lead is now locked exclusively to you. It will not be shared with any other CA.</p>
          </div>
          
          <p>You can now access the full lead details from your dashboard.</p>
          <a href="#" class="cta">View Lead Details</a>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} CA Nexus Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: caEmail, subject, html });
}

/**
 * Send lead rejected notification to CA
 */
export async function sendLeadRejectedNotification(
  caEmail: string,
  caName: string,
  leadTitle: string,
  companyName: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const subject = `❌ Lead Access Request Update - ${leadTitle}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Request Update</h1>
        </div>
        <div class="content">
          <p>Dear ${caName},</p>
          <p>Your request for lead <strong>"${leadTitle}"</strong> from <strong>${companyName}</strong> was not approved at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          
          <p>You can browse other available leads in the marketplace.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} CA Nexus Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: caEmail, subject, html });
}

/**
 * Send document upload reminder
 */
export async function sendDocumentReminder(
  caEmail: string,
  caName: string,
  leadTitle: string,
  currentStep: string
): Promise<{ success: boolean; message: string }> {
  const subject = `📋 Document Reminder - ${leadTitle}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .cta { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Action Required</h1>
        </div>
        <div class="content">
          <p>Dear ${caName},</p>
          <p>This is a reminder to complete the <strong>${currentStep}</strong> step for lead <strong>"${leadTitle}"</strong>.</p>
          
          <p>Please upload the required documents to proceed with the filing process.</p>
          <a href="#" class="cta">Upload Documents</a>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} CA Nexus Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: caEmail, subject, html });
}
