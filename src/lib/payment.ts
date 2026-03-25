import { supabase } from './supabase';
import { logLeadPurchase, logLeadAccess } from './audit';

// Toggle between demo and live mode
const DEMO_MODE = true; // Set to TRUE for testing, FALSE for live payments

// Edge Function URL - replace with your actual Supabase project URL
const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : 'http://localhost:54321/functions/v1';

export interface CreateOrderParams {
  leadId: string;
  amount: number;
  userId: string;
  userEmail: string;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  leadId: string;
  userId: string;
}

interface LeadInfo {
  title: string;
  company_name: string;
  budget: number;
  category: string;
}

/**
 * Get Razorpay Key ID from environment (public key only)
 */
export function getRazorpayKeyId(): string {
  return import.meta.env.VITE_RAZORPAY_KEY_ID || '';
}

/**
 * Get lead details by ID
 */
async function getLeadById(leadId: string): Promise<LeadInfo | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('title, company_name, budget, category')
    .eq('id', leadId)
    .single();
  
  return data;
}

/**
 * Generate invoice number
 */
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true });
  
  const sequence = (count || 0) + 1;
  return `CANEXUS-${year}-${sequence.toString().padStart(5, '0')}`;
}

/**
 * Calculate GST
 */
function calculateGST(amount: number, rate: number = 18): { subtotal: number; gst: number; total: number } {
  const subtotal = amount;
  const gst = (amount * rate) / 100;
  const total = subtotal + gst;
  return { subtotal, gst, total };
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
 * Call Edge Function securely
 */
async function callEdgeFunction(functionName: string, body: Record<string, any>): Promise<any> {
  const token = await getAuthToken();
  
  const response = await fetch(`${EDGE_FUNCTION_URL}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `Edge function failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Create a Razorpay order for lead purchase
 * Uses Edge Function to keep Razorpay secret key server-side
 */
export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
  const { leadId, amount, userId, userEmail } = params;

  // Get lead details
  const lead = await getLeadById(leadId);
  if (!lead) {
    throw new Error('Lead not found');
  }

  // Calculate final amount with GST
  const { subtotal, gst, total } = calculateGST(amount);

  if (DEMO_MODE) {
    // Demo mode - simulate order creation
    console.log('Demo mode: Creating simulated order');
    const demoOrderId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save order to database
    const { error: orderError } = await supabase.from('orders').insert({
      user_id: userId,
      lead_id: leadId,
      amount: total,
      razorpay_order_id: demoOrderId,
      status: 'pending',
    });
    
    if (orderError) {
      console.error('Error creating order:', orderError);
      throw new Error('Failed to create order: ' + orderError.message);
    }

    // Also create invoice in demo mode
    const invoiceNumber = await generateInvoiceNumber();
    await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      user_id: userId,
      lead_id: leadId,
      subtotal: subtotal,
      gst_rate: 18,
      gst_amount: gst,
      total: total,
      status: 'pending',
    });

    return {
      orderId: demoOrderId,
      amount: Math.round(total * 100), // Convert to paise
      currency: 'INR',
    };
  }

  // LIVE MODE - Use Edge Function for secure Razorpay integration
  try {
    const result = await callEdgeFunction('create-payment', {
      leadId,
      amount: total,
      userEmail,
    });

    return {
      orderId: result.orderId,
      amount: result.amount,
      currency: result.currency,
    };
  } catch (error: any) {
    console.error('Error creating payment order:', error);
    throw new Error(error.message || 'Failed to create payment order');
  }
}

/**
 * Verify payment signature and complete purchase
 * Uses Edge Function to keep signature verification server-side
 */
export async function verifyPayment(params: VerifyPaymentParams): Promise<{ success: boolean; message: string }> {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, leadId, userId } = params;

  // In demo mode, skip signature verification
  if (DEMO_MODE || razorpayOrderId.startsWith('demo_')) {
    console.log('Demo mode: Simulating payment verification');
    
    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', razorpayOrderId)
      .single();

    // Update order status
    await supabase
      .from('orders')
      .update({
        razorpay_payment_id: razorpayPaymentId || `demo_payment_${Date.now()}`,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_order_id', razorpayOrderId);

    // Add to purchased_leads
    const { error: purchaseError } = await supabase.from('purchased_leads').insert({
      user_id: userId,
      lead_id: leadId,
      payment_id: razorpayPaymentId || `demo_payment_${Date.now()}`,
      payment_status: 'completed',
      amount: order?.amount || 0,
      payment_method: 'demo',
      paid_at: new Date().toISOString(),
    });

    if (purchaseError) {
      console.error('Error inserting purchased lead:', purchaseError);
      return { success: false, message: 'Failed to record purchase' };
    }

    // Update invoice status
    await supabase
      .from('invoices')
      .update({
        status: 'paid',
        sent_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)
      .eq('user_id', userId);

    // Record transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      lead_id: leadId,
      amount: order?.amount || 0,
      payment_method: 'demo',
      razorpay_payment_id: razorpayPaymentId || `demo_payment_${Date.now()}`,
      razorpay_order_id: razorpayOrderId,
      status: 'completed',
      type: 'purchase',
    });

    // Create audit logs
    await logLeadPurchase(userId, userId, leadId, 'Lead Purchase', order?.amount || 0);
    await logLeadAccess(userId, userId, leadId, 'Lead Unlocked after Purchase');

    return { success: true, message: 'Payment verified (Demo Mode)' };
  }

  // LIVE MODE - Use Edge Function for secure payment verification
  // Signature verification happens server-side - client cannot fake it
  try {
    const result = await callEdgeFunction('verify-payment', {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      leadId,
    });

    if (result.success) {
      // Log audit events
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('razorpay_order_id', razorpayOrderId)
        .single();

      const lead = await getLeadById(leadId);
      await logLeadPurchase(userId, userId, leadId, lead?.title || 'Lead', order?.amount || 0);
      await logLeadAccess(userId, userId, leadId, 'Lead Unlocked after Purchase');
    }

    return { success: result.success, message: result.message };
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return { success: false, message: error.message || 'Payment verification failed' };
  }
}

/**
 * Get user's purchased leads
 */
export async function getPurchasedLeads(userId: string) {
  const { data, error } = await supabase
    .from('purchased_leads')
    .select(`
      *,
      leads (
        id,
        title,
        description,
        category,
        phone,
        email,
        company_name,
        budget,
        created_at
      )
    `)
    .eq('user_id', userId)
    .eq('payment_status', 'completed')
    .order('paid_at', { ascending: false });

  if (error) {
    console.error('Error fetching purchased leads:', error);
    return [];
  }

  return data || [];
}

/**
 * Lightweight purchased lead IDs for quick UI checks
 */
export async function getPurchasedLeadIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('purchased_leads')
    .select('lead_id')
    .eq('user_id', userId)
    .eq('payment_status', 'completed');

  if (error) {
    console.error('Error fetching purchased lead ids:', error);
    return [];
  }

  return (data || []).map((row: any) => row.lead_id).filter(Boolean);
}

/**
 * Check if user has purchased a specific lead
 */
export async function hasUserPurchasedLead(userId: string, leadId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('purchased_leads')
    .select('id')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .eq('payment_status', 'completed')
    .single();

  return !error && !!data;
}

/**
 * Get user's transaction history
 */
export async function getTransactionHistory(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, leads(title, company_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's invoices
 */
export async function getInvoices(userId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, leads(title, company_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }

  return data || [];
}
