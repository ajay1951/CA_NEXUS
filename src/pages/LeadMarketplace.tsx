import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Filter, 
  Briefcase, 
  Building2, 
  IndianRupee, 
  X,
  Grid,
  List,
  Sparkles,
  Clock,
  Shield,
  Lock,
  Hand
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import RequestAccessButton from "../components/RequestAccessButton";
import AuthModal from "../components/AuthModal";
import { fadeUp, stagger } from "../lib/motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { getPurchasedLeadIds } from "../lib/payment";
import { toast } from "sonner";

interface Lead {
  id: string;
  title: string;
  description: string;
  category: string;
  phone?: string;
  email?: string;
  company_name: string;
  budget: number;
  created_at: string;
  status?: string;
  assigned_to?: string;
}

const categories = [
  { value: "all", label: "All Categories" },
  { value: "gst_audit", label: "GST Audit" },
  { value: "tax", label: "Tax Planning" },
  { value: "audit", label: "Audit" },
  { value: "advisory", label: "Advisory" },
];

const budgets = [
  { value: "all", label: "Any Budget" },
  { value: "0-50000", label: "Under ₹50,000" },
  { value: "50000-100000", label: "₹50,000 - ₹1,00,000" },
  { value: "100000-250000", label: "₹1,00,000 - ₹2,50,000" },
  { value: "250000+", label: "₹2,50,000+" },
];

const categoryColors: Record<string, string> = {
  gst_audit: "badge-blue",
  tax: "badge-success",
  audit: "badge-purple",
  advisory: "badge-warning",
};

const categoryIcons: Record<string, string> = {
  gst_audit: "📋",
  tax: "📊",
  audit: "📝",
  advisory: "💼",
};

export default function LeadMarketplace() {
  const PAGE_SIZE = 18;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBudget, setSelectedBudget] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [purchasedLeadIds, setPurchasedLeadIds] = useState<Set<string>>(new Set());
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    fetchLeads(true);
  }, []);

  useEffect(() => {
    if (user) {
      checkPurchasedLeads();
    }
  }, [user?.id]);

  const fetchLeads = async (reset = false) => {
    if (isFetchingRef.current) return;
    if (!reset && (loadingMore || !hasMore)) return;
    isFetchingRef.current = true;

    if (reset) {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const nextPage = reset ? 0 : page;
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, title, description, category, company_name, budget, status, created_at"
        )
        .eq("status", "available")
        .range(from, to)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching leads:", error);
        return;
      }

      const batch = data || [];
      setLeads((prev) => {
        if (reset) return batch;
        return [...prev, ...batch];
      });
      setHasMore(batch.length === PAGE_SIZE);
      setPage(nextPage + 1);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      if (reset) setLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  const checkPurchasedLeads = async () => {
    if (!user) return;
    const purchasedIds = new Set(await getPurchasedLeadIds(user.id));
    setPurchasedLeadIds(purchasedIds);
  };

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (lead) =>
          lead.title.toLowerCase().includes(query) ||
          lead.company_name.toLowerCase().includes(query) ||
          lead.description.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((lead) => lead.category === selectedCategory);
    }

    if (selectedBudget !== "all") {
      const [min, max] = selectedBudget.split("-").map(Number);
      result = result.filter((lead) => {
        if (selectedBudget === "250000+") {
          return lead.budget >= 250000;
        }
        return lead.budget >= min && lead.budget <= max;
      });
    }

    return result;
  }, [leads, searchQuery, selectedCategory, selectedBudget]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchLeads(false);
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedBudget("all");
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-bold text-slate-800">
          Lead Marketplace
        </h1>
        <p className="text-slate-500 mt-1">
          Discover exclusive leads for your CA practice
        </p>
      </motion.div>

      {/* Exclusivity Banner */}
      <motion.div 
        variants={fadeUp}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl"
      >
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 flex-shrink-0" />
          <p className="font-medium text-sm md:text-base">
            <span className="font-bold">Exclusive Leads:</span> Each lead is given to only ONE expert. 
            Request access today and get sole ownership of every client you convert.
          </p>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={fadeUp} className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads by title, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12"
          />
        </div>
        
        <Button
          variant={showFilters ? "primary" : "secondary"}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {(selectedCategory !== "all" || selectedBudget !== "all") && (
            <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">
              Active
            </span>
          )}
        </Button>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-3 rounded-xl border transition-all ${
              viewMode === "grid"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-3 rounded-xl border transition-all ${
              viewMode === "list"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white rounded-2xl p-6 shadow-card border border-slate-100"
        >
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Budget Range
              </label>
              <select
                value={selectedBudget}
                onChange={(e) => setSelectedBudget(e.target.value)}
                className="input-field"
              >
                {budgets.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </motion.div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{filteredLeads.length}</span> leads found
        </p>
      </div>

      {/* Leads Grid */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <Card className="text-center py-16">
          <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            No leads found
          </h3>
          <p className="text-slate-500 mb-4">
            Try adjusting your search or filters
          </p>
          <Button onClick={clearFilters}>Clear Filters</Button>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <motion.div key={lead.id} variants={fadeUp}>
              <div 
                className="lead-card"
                onClick={() => setSelectedLead(lead)}
              >
                {/* Category Badge */}
                <div className="flex items-start justify-between mb-4">
                  <span className={`badge ${categoryColors[lead.category] || 'badge-primary'}`}>
                    {categoryIcons[lead.category]} {lead.category.replace("_", " ")}
                  </span>
                  {purchasedLeadIds.has(lead.id) && (
                    <span className="badge badge-success">
                      ✓ Purchased
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-semibold text-slate-800 mb-2 line-clamp-1">
                  {lead.title}
                </h3>
                
                {/* Company */}
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Building2 className="w-4 h-4" />
                  <span className="line-clamp-1">{lead.company_name}</span>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                  {lead.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-slate-500 text-sm">
                    <Lock className="w-4 h-4" />
                    <span>Exclusive Access</span>
                  </div>
                  <Button size="sm" className="gap-1">
                    <Hand className="w-3 h-3" />
                    Request Access
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <motion.div key={lead.id} variants={fadeUp}>
              <div 
                className="lead-card flex items-center"
                onClick={() => setSelectedLead(lead)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`badge ${categoryColors[lead.category] || 'badge-primary'}`}>
                      {categoryIcons[lead.category]} {lead.category.replace("_", " ")}
                    </span>
                    {purchasedLeadIds.has(lead.id) && (
                      <span className="badge badge-success">✓ Purchased</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">
                    {lead.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {lead.company_name}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Lock className="w-4 h-4" />
                      Exclusive
                    </span>
                  </div>
                </div>
                <Button className="ml-4 gap-1">
                  <Hand className="w-4 h-4" />
                  Request Access
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="flex flex-col items-center gap-3 pt-2">
          {loadingMore && <p className="text-sm text-slate-500">Loading more leads...</p>}
          {!loadingMore && hasMore && (
            <Button variant="secondary" onClick={() => fetchLeads(false)}>
              Load More
            </Button>
          )}
          <div ref={loadMoreRef} className="h-1 w-full" />
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Lead Details</h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`badge ${categoryColors[selectedLead.category] || 'badge-primary'}`}>
                    {categoryIcons[selectedLead.category]} {selectedLead.category.replace("_", " ")}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-slate-400">
                    <Clock className="w-4 h-4" />
                    Added {new Date(selectedLead.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  {selectedLead.title}
                </h3>
                <div className="flex items-center gap-2 text-slate-500">
                  <Building2 className="w-5 h-5" />
                  <span>{selectedLead.company_name}</span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-medium text-slate-700 mb-2">Description</h4>
                <p className="text-slate-600">{selectedLead.description}</p>
              </div>

              {/* Budget & Category */}
              <div className="grid grid-cols-2 gap-4">
                {user ? (
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <p className="text-sm text-indigo-600 mb-1">Lead Value</p>
                    <p className="text-3xl font-bold text-indigo-700 flex items-center gap-1">
                      <IndianRupee className="w-6 h-6" />
                      {selectedLead.budget.toLocaleString("en-IN")}
                    </p>
                  </div>
                ) : (
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <p className="text-sm text-indigo-600 mb-1">Lead Value</p>
                    <p className="text-2xl font-bold text-indigo-700">
                      Login to view
                    </p>
                  </div>
                )}
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-sm text-emerald-600 mb-1">Category</p>
                  <p className="text-xl font-bold text-emerald-700 capitalize">
                    {selectedLead.category.replace("_", " ")}
                  </p>
                </div>
              </div>

              {/* Exclusivity Info */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-indigo-600" />
                  <div>
                    <p className="font-semibold text-indigo-800">Exclusive Lead</p>
                    <p className="text-sm text-indigo-600">
                      Once approved, this lead is locked exclusively to you. Never shared with other CAs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Request Access Section */}
              {user ? (
                purchasedLeadIds.has(selectedLead.id) ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                    <h4 className="font-semibold text-emerald-700 mb-4">
                      Lead Purchased
                    </h4>
                    <p className="text-emerald-700 text-sm mb-4">
                      Contact details are available in My Purchases.
                    </p>
                    <Button variant="secondary" onClick={() => navigate("/my-purchases")}>
                      Open My Purchases
                    </Button>
                  </div>
                ) : (
                  <RequestAccessButton
                    lead={selectedLead}
                    userId={user.id}
                    onSuccess={() => {
                      toast.success("Request submitted! Admin will review shortly.");
                      setSelectedLead(null);
                    }}
                  />
                )
              ) : (
                <Card className="text-center py-6 bg-slate-50">
                  <p className="text-slate-500 mb-4">
                    Please log in to request access to this lead
                  </p>
                  <Button onClick={() => setShowAuthModal(true)}>Login to Continue</Button>
                </Card>
              )}

              {/* AI Suggestion */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-indigo-700 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-medium">AI Suggestion</span>
                </div>
                <p className="text-sm text-slate-600">
                  Use our AI Content Hub to generate a professional outreach message for this lead!
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </motion.div>
  );
}
