import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Briefcase, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  Search,
  Building2
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { fadeUp, stagger } from "../lib/motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

interface Lead {
  id: string;
  title: string;
  description: string;
  category: string;
  phone: string;
  email: string;
  company_name: string;
  budget: number;
  created_at: string;
}

const categories = [
  { value: "gst_audit", label: "GST Audit" },
  { value: "tax", label: "Tax Planning" },
  { value: "audit", label: "Audit" },
  { value: "advisory", label: "Advisory" },
];

export default function AdminLeads() {
  const { isAdmin } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "gst_audit",
    phone: "",
    email: "",
    company_name: "",
    budget: 0,
  });

  // Cache for leads data - persists during session
  const leadsCache = useRef<{ data: any[]; timestamp: number } | null>(null);
  const CACHE_DURATION = 30000; // 30 seconds cache

  useEffect(() => {
    if (isAdmin) {
      fetchLeads();
    }
  }, [isAdmin]);

  const fetchLeads = async () => {
    // Check cache first
    if (leadsCache.current && 
        Date.now() - leadsCache.current.timestamp < CACHE_DURATION) {
      setLeads(leadsCache.current.data);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, title, description, category, company_name, budget, status, created_by, assigned_to, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const leadsData = data || [];
      setLeads(leadsData);
      // Update cache
      leadsCache.current = { data: leadsData, timestamp: Date.now() };
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingLead) {
        // Update existing lead
        const { error } = await supabase
          .from("leads")
          .update(formData)
          .eq("id", editingLead.id);

        if (error) throw error;
        toast.success("Lead updated successfully");
      } else {
        // Create new lead
        const { error } = await supabase
          .from("leads")
          .insert(formData);

        if (error) throw error;
        toast.success("Lead created successfully");
      }

      setShowModal(false);
      setEditingLead(null);
      resetForm();
      fetchLeads();
    } catch (error) {
      console.error("Error saving lead:", error);
      toast.error("Failed to save lead");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Lead deleted successfully");
      fetchLeads();
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead");
    }
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      title: lead.title,
      description: lead.description,
      category: lead.category,
      phone: lead.phone,
      email: lead.email,
      company_name: lead.company_name,
      budget: lead.budget,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "gst_audit",
      phone: "",
      email: "",
      company_name: "",
      budget: 0,
    });
  };

  const openAddModal = () => {
    setEditingLead(null);
    resetForm();
    setShowModal(true);
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || lead.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="text-center py-12 max-w-md">
          <Briefcase className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Access Denied
          </h3>
          <p className="text-text-muted">
            You don't have permission to access this page.
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
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-brand" />
            Lead Management
          </h1>
          <p className="text-text-secondary mt-1">
            Add, edit, and manage your leads
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-text-muted">Total Leads</p>
          <p className="text-2xl font-bold text-text-primary">{leads.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted">GST Audit</p>
          <p className="text-2xl font-bold text-text-primary">
            {leads.filter(l => l.category === 'gst_audit').length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted">Tax Planning</p>
          <p className="text-2xl font-bold text-text-primary">
            {leads.filter(l => l.category === 'tax').length}
          </p>
        </Card>
      </motion.div>

      {/* Leads Table */}
      <motion.div variants={fadeUp}>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <Card className="text-center py-12">
            <Briefcase className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No leads found
            </h3>
            <Button onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add your first lead
            </Button>
          </Card>
        ) : (
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left p-4 font-medium text-text-muted">Company</th>
                  <th className="text-left p-4 font-medium text-text-muted">Title</th>
                  <th className="text-left p-4 font-medium text-text-muted">Category</th>
                  <th className="text-left p-4 font-medium text-text-muted">Budget</th>
                  <th className="text-right p-4 font-medium text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-t border-border hover:bg-background">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-brand" />
                        </div>
                        <span className="font-medium">{lead.company_name}</span>
                      </div>
                    </td>
                    <td className="p-4">{lead.title}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium
                        ${lead.category === 'gst_audit' ? 'bg-blue-100 text-blue-700' : ''}
                        ${lead.category === 'tax' ? 'bg-green-100 text-green-700' : ''}
                        ${lead.category === 'audit' ? 'bg-purple-100 text-purple-700' : ''}
                        ${lead.category === 'advisory' ? 'bg-orange-100 text-orange-700' : ''}
                      `}>
                        {lead.category.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-brand">
                      ₹{lead.budget.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(lead)}
                          className="p-2 hover:bg-surface rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4 text-text-muted" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {editingLead ? "Edit Lead" : "Add New Lead"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-surface rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Lead Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., GST Audit for Manufacturing Company"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand"
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Budget (₹) *
                    </label>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@company.com"
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingLead ? "Update Lead" : "Create Lead"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
