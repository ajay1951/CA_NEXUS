import { supabase } from './supabase';

// Audit Action Types
export type AuditAction = 
  | 'LEAD_ACCESS'
  | 'LEAD_VIEW_DETAILS'
  | 'LEAD_PURCHASE'
  | 'LEAD_UNLOCK'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'DATA_EXPORT'
  | 'ADMIN_ACTION'
  | 'LEAD_CREATE'
  | 'LEAD_UPDATE'
  | 'LEAD_DELETE';

export interface AuditLogParams {
  userId: string;
  userEmail?: string;
  actionType: AuditAction;
  leadId?: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Create an audit log entry
 * This is used for ICAI compliance to track all important actions
 */
export async function createAuditLog(params: AuditLogParams): Promise<boolean> {
  const { userId, userEmail, actionType, leadId, resourceType, resourceId, description, metadata } = params;

  try {
    // Get IP address and user agent from browser
    const ipAddress = await getClientIP();
    const userAgent = typeof window !== 'undefined' ? navigator.userAgent : 'unknown';

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        user_email: userEmail,
        action_type: actionType,
        lead_id: leadId,
        resource_type: resourceType,
        resource_id: resourceId,
        description: description,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: metadata || {},
      });

    if (error) {
      console.error('Failed to create audit log:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating audit log:', error);
    return false;
  }
}

/**
 * Get client IP address (approximation)
 */
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}

/**
 * Log a lead purchase action
 */
export async function logLeadPurchase(
  userId: string,
  userEmail: string,
  leadId: string,
  leadTitle: string,
  amount: number
) {
  return createAuditLog({
    userId,
    userEmail,
    actionType: 'LEAD_PURCHASE',
    leadId,
    resourceType: 'lead',
    resourceId: leadId,
    description: `Purchased lead: ${leadTitle} for ₹${amount}`,
    metadata: { amount, leadTitle },
  });
}

/**
 * Log a lead view action
 */
export async function logLeadView(
  userId: string,
  userEmail: string,
  leadId: string,
  leadTitle: string
) {
  return createAuditLog({
    userId,
    userEmail,
    actionType: 'LEAD_VIEW_DETAILS',
    leadId,
    resourceType: 'lead',
    resourceId: leadId,
    description: `Viewed lead details: ${leadTitle}`,
    metadata: { leadTitle },
  });
}

/**
 * Log a lead access/unlock action
 */
export async function logLeadAccess(
  userId: string,
  userEmail: string,
  leadId: string,
  leadTitle: string
) {
  return createAuditLog({
    userId,
    userEmail,
    actionType: 'LEAD_UNLOCK',
    leadId,
    resourceType: 'lead',
    resourceId: leadId,
    description: `Unlocked lead contact: ${leadTitle}`,
    metadata: { leadTitle },
  });
}

/**
 * Log user login
 */
export async function logUserLogin(userId: string, userEmail: string) {
  return createAuditLog({
    userId,
    userEmail,
    actionType: 'USER_LOGIN',
    description: `User logged in: ${userEmail}`,
  });
}

/**
 * Log user logout
 */
export async function logUserLogout(userId: string, userEmail: string) {
  return createAuditLog({
    userId,
    userEmail,
    actionType: 'USER_LOGOUT',
    description: `User logged out: ${userEmail}`,
  });
}

/**
 * Log admin actions
 */
export async function logAdminAction(
  userId: string,
  userEmail: string,
  action: string,
  details?: Record<string, any>
) {
  return createAuditLog({
    userId,
    userEmail,
    actionType: 'ADMIN_ACTION',
    resourceType: 'admin',
    description: `Admin action: ${action}`,
    metadata: details,
  });
}

/**
 * Get audit logs for admin view
 */
export async function getAuditLogs(filters?: {
  userId?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters?.actionType) {
    query = query.eq('action_type', filters.actionType);
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error } = await query.limit(filters?.limit || 100);

  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Export audit logs (for ICAI compliance)
 */
export async function exportAuditLogs(startDate: string, endDate: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error exporting audit logs:', error);
    return [];
  }

  return data || [];
}
