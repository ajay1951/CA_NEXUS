import { supabase } from './supabase';

export interface LeadRequest {
  id: string;
  lead_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  leads?: {
    id: string;
    title: string;
    company_name: string;
    category: string;
    budget: number;
    description: string;
    phone: string;
    email: string;
    status: string;
    assigned_to: string | null;
  };
  profiles?: {
    id: string;
    name: string;
    email?: string;
    company_name?: string;
  };
}

export interface LeadTask {
  id: string;
  lead_id: string;
  user_id: string;
  lead_request_id: string | null;
  status: 'requested' | 'approved' | 'document_collection' | 'filing' | 'completed' | 'cancelled';
  otp_verified: boolean;
  documents: any[];
  current_step: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  leads?: {
    title: string;
    company_name: string;
    category: string;
    budget: number;
  };
}

async function fetchProfilesByUserIds(userIds: string[]): Promise<Map<string, LeadRequest['profiles']>> {
  const profileMap = new Map<string, LeadRequest['profiles']>();
  if (userIds.length === 0) return profileMap;

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, email, company_name')
    .in('id', userIds);

  if (error || !profiles) {
    console.error('Error fetching profiles for lead requests:', error);
    return profileMap;
  }

  for (const profile of profiles) {
    profileMap.set(profile.id, {
      id: profile.id,
      name: profile.name,
      email: profile.email ?? undefined,
      company_name: profile.company_name ?? undefined,
    });
  }

  return profileMap;
}

/**
 * Request access to a lead
 */
export async function requestLeadAccess(
  leadId: string,
  _userId: string
): Promise<{ success: boolean; message: string; request?: LeadRequest }> {
  try {
    // Always trust the authenticated Supabase user, not client-passed IDs
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return { success: false, message: 'Please log in again and retry' };
    }

    // Check if lead is available
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, status, assigned_to')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return { success: false, message: 'Lead not found' };
    }

    if (lead.status !== 'available') {
      return { success: false, message: 'This lead is not available for request' };
    }

    // Check if user already has a request for this lead
    const { data: existingRequest } = await supabase
      .from('lead_requests')
      .select('id, status')
      .eq('lead_id', leadId)
      .eq('user_id', authUser.id)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return { success: false, message: 'You already have a pending request for this lead' };
      }
      if (existingRequest.status === 'approved') {
        return { success: false, message: 'You already have access to this lead' };
      }
    }

    // Create request
    const { data: request, error } = await supabase
      .from('lead_requests')
      .insert({
        lead_id: leadId,
        user_id: authUser.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating request:', error);
      return { success: false, message: error.message };
    }

    // Update lead status to requested
    await supabase
      .from('leads')
      .update({ status: 'requested' })
      .eq('id', leadId);

    return { success: true, message: 'Request submitted successfully', request };
  } catch (error: any) {
    console.error('Error requesting lead access:', error);
    return { success: false, message: error.message || 'Failed to submit request' };
  }
}

/**
 * Get all pending requests (for admin)
 */
export async function getPendingRequests(): Promise<LeadRequest[]> {
  try {
    const { data, error } = await supabase
      .from('lead_requests')
      .select(`
        *,
        leads (
          id,
          title,
          company_name,
          category,
          budget,
          description,
          phone,
          email,
          status,
          assigned_to
        )
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }

    const requests = (data || []) as LeadRequest[];
    const userIds = [...new Set(requests.map((r) => r.user_id).filter(Boolean))];
    const profileMap = await fetchProfilesByUserIds(userIds);

    return requests.map((request) => ({
      ...request,
      profiles: profileMap.get(request.user_id),
    }));
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

/**
 * Get user's own requests
 */
export async function getUserRequests(userId: string): Promise<LeadRequest[]> {
  try {
    const { data, error } = await supabase
      .from('lead_requests')
      .select(`
        *,
        leads (
          id,
          title,
          company_name,
          category,
          budget,
          description,
          status
        )
      `)
      .eq('user_id', userId)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching user requests:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

/**
 * Check user's request status for a specific lead
 */
export async function getUserRequestForLead(
  leadId: string,
  userId: string
): Promise<LeadRequest | null> {
  try {
    const { data, error } = await supabase
      .from('lead_requests')
      .select('*')
      .eq('lead_id', leadId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Approve a lead request (admin only)
 */
export async function approveLeadRequest(
  requestId: string,
  adminId: string,
  adminNotes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: request, error: fetchError } = await supabase
      .from('lead_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, message: 'Request not found' };
    }

    if (request.status !== 'pending') {
      return { success: false, message: 'Request is not pending' };
    }

    // Approve the request
    const { error } = await supabase
      .from('lead_requests')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        admin_notes: adminNotes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error approving request:', error);
      return { success: false, message: error.message };
    }

    // Note: The trigger will handle lead status update

    return { success: true, message: 'Request approved successfully' };
  } catch (error: any) {
    console.error('Error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Reject a lead request (admin only)
 */
export async function rejectLeadRequest(
  requestId: string,
  adminId: string,
  adminNotes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: request, error: fetchError } = await supabase
      .from('lead_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, message: 'Request not found' };
    }

    if (request.status !== 'pending') {
      return { success: false, message: 'Request is not pending' };
    }

    // Reject the request
    const { error } = await supabase
      .from('lead_requests')
      .update({
        status: 'rejected',
        reviewed_by: adminId,
        admin_notes: adminNotes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error rejecting request:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Request rejected' };
  } catch (error: any) {
    console.error('Error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Cancel user's own request
 */
export async function cancelRequest(
  requestId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('lead_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error cancelling request:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Request cancelled' };
  } catch (error: any) {
    console.error('Error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get all approved requests with lead details (for admin)
 */
export async function getAllRequests(): Promise<LeadRequest[]> {
  try {
    const { data, error } = await supabase
      .from('lead_requests')
      .select(`
        *,
        leads (
          id,
          title,
          company_name,
          category,
          budget,
          description,
          phone,
          email,
          status,
          assigned_to
        )
      `)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching all requests:', error);
      return [];
    }

    const requests = (data || []) as LeadRequest[];
    const userIds = [...new Set(requests.map((r) => r.user_id).filter(Boolean))];
    const profileMap = await fetchProfilesByUserIds(userIds);

    return requests.map((request) => ({
      ...request,
      profiles: profileMap.get(request.user_id),
    }));
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

/**
 * Get lead task for a user
 */
export async function getUserLeadTask(
  leadId: string,
  userId: string
): Promise<LeadTask | null> {
  try {
    const { data, error } = await supabase
      .from('lead_tasks')
      .select(`
        *,
        leads (
          title,
          company_name,
          category,
          budget
        )
      `)
      .eq('lead_id', leadId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Update lead task status
 */
export async function updateLeadTaskStatus(
  leadId: string,
  userId: string,
  status: LeadTask['status'],
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('lead_tasks')
      .update({
        status,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating task status:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Task updated' };
  } catch (error: any) {
    console.error('Error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get all lead tasks (for admin)
 */
export async function getAllLeadTasks(): Promise<LeadTask[]> {
  try {
    const { data, error } = await supabase
      .from('lead_tasks')
      .select(`
        *,
        leads (
          title,
          company_name,
          category,
          budget
        ),
        profiles (
          name
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}
