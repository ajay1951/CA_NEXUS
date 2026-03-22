import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Building2,
  Calendar,
  Phone,
  Mail,
  Briefcase,
} from "lucide-react";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import { fadeUp, stagger } from "../lib/motion";
import { useAuth } from "../lib/auth";
import { getUserRequests, LeadRequest } from "../lib/leadRequests";
import { getPurchasedLeads } from "../lib/payment";

interface PurchasedLeadRow {
  lead_id?: string;
  leads?: {
    id: string;
    phone?: string;
    email?: string;
  };
}

export default function MyApprovedLeads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [approvedPaidLeads, setApprovedPaidLeads] = useState<LeadRequest[]>([]);
  const [approvedPendingPaymentLeads, setApprovedPendingPaymentLeads] = useState<LeadRequest[]>([]);
  const [purchasedRows, setPurchasedRows] = useState<PurchasedLeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchApprovedLeads();
  }, [user]);

  const purchasedByLeadId = useMemo(() => {
    const map = new Map<string, PurchasedLeadRow>();
    for (const row of purchasedRows) {
      const id = row.leads?.id || row.lead_id;
      if (id) map.set(id, row);
    }
    return map;
  }, [purchasedRows]);

  const fetchApprovedLeads = async () => {
    if (!user) return;
    try {
      const [requests, purchased] = await Promise.all([
        getUserRequests(user.id),
        getPurchasedLeads(user.id),
      ]);

      const purchasedData = (purchased || []) as PurchasedLeadRow[];
      setPurchasedRows(purchasedData);

      const approved = requests.filter((r) => r.status === "approved");
      const purchasedLeadIds = new Set(
        purchasedData.map((p) => p.leads?.id || p.lead_id).filter(Boolean)
      );

      setApprovedPaidLeads(approved.filter((r) => purchasedLeadIds.has(r.lead_id)));
      setApprovedPendingPaymentLeads(approved.filter((r) => !purchasedLeadIds.has(r.lead_id)));
    } catch (error) {
      console.error("Error fetching approved leads:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="text-center py-12 max-w-md">
          <Briefcase className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">Login Required</h3>
          <p className="text-text-muted">Please log in to view approved leads</p>
        </Card>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-semibold text-text-primary flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-brand" />
          My Approved Leads
        </h1>
        <p className="text-text-secondary mt-1">
          Leads approved by admin and reserved for you
        </p>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : approvedPaidLeads.length === 0 ? (
        <div className="space-y-4">
          <Card className="text-center py-12">
            <ShieldCheck className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No paid approved leads yet</h3>
            <p className="text-text-muted">Lead details appear here only after successful payment.</p>
          </Card>
          {approvedPendingPaymentLeads.length > 0 && (
            <Card>
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  {approvedPendingPaymentLeads.length} approved lead(s) are waiting for payment.
                </p>
                {approvedPendingPaymentLeads.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {request.leads?.title || "Approved Lead"}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {request.leads?.company_name || "Company unavailable"}
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        navigate(`/payment/${request.lead_id}`, { state: { lead: request.leads } })
                      }
                    >
                      Pay Now
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {approvedPendingPaymentLeads.length > 0 && (
            <Card>
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  {approvedPendingPaymentLeads.length} approved lead(s) are waiting for payment.
                </p>
                {approvedPendingPaymentLeads.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {request.leads?.title || "Approved Lead"}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {request.leads?.company_name || "Company unavailable"}
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        navigate(`/payment/${request.lead_id}`, { state: { lead: request.leads } })
                      }
                    >
                      Pay Now
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {approvedPaidLeads.map((request) => {
            const purchased = purchasedByLeadId.get(request.lead_id);
            const phone = purchased?.leads?.phone;
            const email = purchased?.leads?.email;

            return (
              <motion.div key={request.id} variants={fadeUp}>
                <Card>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-text-primary">
                        {request.leads?.title || "Approved Lead"}
                      </h3>
                      <span className="badge badge-success">Approved</span>
                    </div>

                    <div className="flex items-center gap-2 text-text-muted text-sm">
                      <Building2 className="w-4 h-4" />
                      <span>{request.leads?.company_name || "Company unavailable"}</span>
                    </div>

                    {request.leads?.description && (
                      <p className="text-sm text-text-secondary">{request.leads.description}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-text-muted" />
                        <span>{phone || "Contact hidden by policy"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-text-muted" />
                        <span>{email || "Contact hidden by policy"}</span>
                      </div>
                      <div className="flex items-center gap-2 md:col-span-2 text-text-muted">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Approved on{" "}
                          {request.reviewed_at
                            ? new Date(request.reviewed_at).toLocaleDateString("en-IN")
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

