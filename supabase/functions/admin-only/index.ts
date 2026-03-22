/**
 * CA Nexus Hub - Admin Only Edge Function
 * 
 * This function handles admin-only operations securely.
 * Verifies admin role server-side before executing any action.
 * 
 * Deploy: supabase functions deploy admin-only
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface AdminRequest {
  action: "get_all_leads" | "get_all_users" | "get_audit_logs" | "create_lead" | "update_lead" | "delete_lead" | "assign_lead";
  data?: Record<string, any>;
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

    // Server-side admin verification (cannot be spoofed by client)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      // Log unauthorized attempt
      await logAudit(supabaseAdmin, user.id, "UNAUTHORIZED_ADMIN_ACCESS", {
        attemptedAction: "Admin endpoint access",
        ip: req.headers.get("x-forwarded-for") || "unknown",
      });

      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { action, data }: AdminRequest = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Action required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    // Execute admin action server-side
    switch (action) {
      case "get_all_leads":
        // Admins can see ALL leads including contact info
        result = await getAllLeads(supabaseAdmin);
        break;

      case "get_all_users":
        result = await getAllUsers(supabaseAdmin);
        break;

      case "get_audit_logs":
        result = await getAuditLogs(supabaseAdmin);
        break;

      case "create_lead":
        result = await createLead(supabaseAdmin, user.id, data);
        break;

      case "update_lead":
        result = await updateLead(supabaseAdmin, user.id, data);
        break;

      case "delete_lead":
        result = await deleteLead(supabaseAdmin, user.id, data.leadId);
        break;

      case "assign_lead":
        result = await assignLead(supabaseAdmin, user.id, data);
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Log successful admin action
    await logAudit(supabaseAdmin, user.id, `ADMIN_${action}`, {
      ...data,
      performedAt: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Admin function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Admin functions - all server-side verified

async function getAllLeads(supabaseAdmin: any) {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

async function getAllUsers(supabaseAdmin: any) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, name, email, company_name, phone, role, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

async function getAuditLogs(supabaseAdmin: any) {
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) throw error;
  return data;
}

async function createLead(supabaseAdmin: any, adminId: string, data: any) {
  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .insert({
      title: data.title,
      description: data.description,
      category: data.category,
      company_name: data.company_name,
      phone: data.phone,
      email: data.email,
      budget: data.budget,
      status: "available",
    })
    .select()
    .single();

  if (error) throw error;
  return lead;
}

async function updateLead(supabaseAdmin: any, adminId: string, data: any) {
  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .update({
      title: data.title,
      description: data.description,
      category: data.category,
      company_name: data.company_name,
      phone: data.phone,
      email: data.email,
      budget: data.budget,
      status: data.status,
    })
    .eq("id", data.leadId)
    .select()
    .single();

  if (error) throw error;
  return lead;
}

async function deleteLead(supabaseAdmin: any, adminId: string, leadId: string) {
  const { error } = await supabaseAdmin
    .from("leads")
    .delete()
    .eq("id", leadId);

  if (error) throw error;
  return { deleted: true, leadId };
}

async function assignLead(supabaseAdmin: any, adminId: string, data: any) {
  // Mark lead as assigned to specific user
  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .update({
      status: "assigned",
      assigned_to: data.userId,
    })
    .eq("id", data.leadId)
    .select()
    .single();

  if (error) throw error;
  return lead;
}

// Secure audit logging - server determines user_id
async function logAudit(
  supabaseAdmin: any,
  userId: string,
  action: string,
  details: Record<string, any>
) {
  try {
    // Get user email from auth.users (server-side only)
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      user_email: userData?.user?.email || "unknown",
      action_type: action,
      details: JSON.stringify(details),
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}
