import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, ArrowLeft } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import PaymentButton from "../components/PaymentButton";
import { fadeUp, stagger } from "../lib/motion";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

type LeadState = {
  id: string;
  title: string;
  description: string;
  category: string;
  company_name: string;
  budget: number;
};

export default function LeadPayment() {
  const { user } = useAuth();
  const { leadId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [lead, setLead] = useState<LeadState | null>((location.state as any)?.lead || null);
  const [loading, setLoading] = useState(!lead);

  useEffect(() => {
    if (!lead && user && leadId) {
      fetchLeadForCheckout();
    }
  }, [lead, user, leadId]);

  const fetchLeadForCheckout = async () => {
    if (!user || !leadId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lead_requests")
        .select(
          `
          lead_id,
          leads (
            id,
            title,
            description,
            category,
            company_name,
            budget
          )
        `
        )
        .eq("lead_id", leadId)
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();

      if (error) {
        console.error("Error loading lead for payment:", error);
        return;
      }

      setLead((data as any)?.leads || null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-brand" />
            Lead Payment
          </h1>
          <p className="text-text-secondary mt-1">Complete payment to unlock approved lead details</p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/my-approved-leads")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </motion.div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : !lead || !user ? (
        <Card className="text-center py-12">
          <p className="text-text-muted">Lead not found or not approved for your account.</p>
        </Card>
      ) : (
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">{lead.title}</h2>
              <p className="text-text-secondary mt-1">{lead.company_name}</p>
            </div>
            <p className="text-sm text-text-secondary">{lead.description}</p>
            <PaymentButton
              lead={lead}
              userId={user.id}
              userEmail={user.email}
              userName={user.name || "User"}
              onSuccess={() => navigate("/my-approved-leads")}
            />
          </div>
        </Card>
      )}
    </motion.div>
  );
}
