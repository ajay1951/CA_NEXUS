import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Briefcase, 
  Building2, 
  IndianRupee, 
  Phone, 
  Mail, 
  Calendar,
  MessageSquare,
  Sparkles,
  Copy,
  Check
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { fadeUp, stagger } from "../lib/motion";
import { useAuth } from "../lib/auth";
import { getPurchasedLeads } from "../lib/payment";

interface PurchasedLead {
  id: string;
  payment_status: string;
  paid_at: string;
  amount: number;
  leads: {
    id: string;
    title: string;
    description: string;
    category: string;
    phone: string;
    email: string;
    company_name: string;
    budget: number;
    created_at: string;
  };
}

export default function MyPurchases() {
  const { user } = useAuth();
  const [purchasedLeads, setPurchasedLeads] = useState<PurchasedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPurchasedLeads();
    }
  }, [user]);

  const fetchPurchasedLeads = async () => {
    if (!user) return;
    
    try {
      const leads = await getPurchasedLeads(user.id);
      setPurchasedLeads(leads as PurchasedLead[]);
    } catch (error) {
      console.error("Error fetching purchased leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "gst_audit":
        return "bg-blue-100 text-blue-700";
      case "tax":
        return "bg-green-100 text-green-700";
      case "audit":
        return "bg-purple-100 text-purple-700";
      case "advisory":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const openWhatsApp = (phone: string) => {
    const formatted = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${formatted}`, '_blank');
  };

  const openEmail = (email: string) => {
    window.open(`mailto:${email}`, '_blank');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="text-center py-12 max-w-md">
          <Briefcase className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Login Required
          </h3>
          <p className="text-text-muted">
            Please log in to view your purchased leads
          </p>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-semibold text-text-primary flex items-center gap-2">
          <Briefcase className="w-7 h-7 text-brand" />
          My Purchases
        </h1>
        <p className="text-text-secondary mt-1">
          Your purchased leads and client contacts
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-text-muted mb-1">Total Purchases</p>
          <p className="text-3xl font-bold text-text-primary">
            {purchasedLeads.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted mb-1">Total Investment</p>
          <p className="text-3xl font-bold text-brand flex items-center gap-1">
            <IndianRupee className="w-6 h-6" />
            {purchasedLeads.reduce((sum, pl) => sum + (pl.amount || 0), 0).toLocaleString('en-IN')}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted mb-1">Active Leads</p>
          <p className="text-3xl font-bold text-green-600">
            {purchasedLeads.filter(pl => pl.payment_status === 'completed').length}
          </p>
        </Card>
      </motion.div>

      {/* Purchased Leads List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : purchasedLeads.length === 0 ? (
        <Card className="text-center py-12">
          <Briefcase className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No purchases yet
          </h3>
          <p className="text-text-muted mb-4">
            Start by browsing our lead marketplace
          </p>
          <Button>Browse Leads</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {purchasedLeads.map((purchase) => (
            <motion.div key={purchase.id} variants={fadeUp}>
              <Card>
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Lead Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(purchase.leads.category)}`}>
                        {purchase.leads.category.replace("_", " ").toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Calendar className="w-3 h-3" />
                        Purchased on {new Date(purchase.paid_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                      {purchase.leads.title}
                    </h3>

                    <div className="flex items-center gap-2 text-text-muted mb-3">
                      <Building2 className="w-4 h-4" />
                      <span>{purchase.leads.company_name}</span>
                    </div>

                    <p className="text-sm text-text-secondary mb-4">
                      {purchase.leads.description}
                    </p>

                    <div className="flex items-center gap-2 text-brand font-semibold">
                      <IndianRupee className="w-4 h-4" />
                      <span>{purchase.leads.budget.toLocaleString('en-IN')}</span>
                      <span className="text-text-muted font-normal text-xs ml-2">
                        (Paid: ₹{purchase.amount?.toLocaleString('en-IN')})
                      </span>
                    </div>
                  </div>

                  {/* Contact Actions */}
                  <div className="lg:w-80 space-y-4">
                    <div className="bg-background border border-border rounded-xl p-4">
                      <h4 className="font-medium text-text-primary mb-3">Contact Information</h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-text-muted" />
                            <span className="text-sm text-text-secondary">{purchase.leads.phone}</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(purchase.leads.phone, purchase.id + 'phone')}
                            className="p-1 hover:bg-surface rounded"
                          >
                            {copiedId === purchase.id + 'phone' ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-text-muted" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-text-muted" />
                            <span className="text-sm text-text-secondary truncate">{purchase.leads.email}</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(purchase.leads.email, purchase.id + 'email')}
                            className="p-1 hover:bg-surface rounded"
                          >
                            {copiedId === purchase.id + 'email' ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-text-muted" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={() => openWhatsApp(purchase.leads.phone)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                      <Button 
                        variant="secondary"
                        className="flex-1"
                        onClick={() => openEmail(purchase.leads.email)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                    </div>

                    <Button 
                      variant="secondary" 
                      className="w-full"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Outreach Message
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
