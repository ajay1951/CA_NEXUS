import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Briefcase, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock,
  Building2,
  User,
  Mail,
  Phone,
  ChevronDown,
  X,
  FileText,
  RefreshCw
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { fadeUp, stagger } from "../lib/motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { 
  getPendingRequests, 
  getAllRequests, 
  approveLeadRequest, 
  rejectLeadRequest,
  LeadRequest 
} from "../lib/leadRequests";

const statusColors: Record<string, string> = {
  pending: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  cancelled: "badge-gray",
};

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

export default function AdminLeadRequests() {
  const { isAdmin, user } = useAuth();
  const [requests, setRequests] = useState<LeadRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<LeadRequest | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [isAdmin, filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let data: LeadRequest[];
      if (filter === "pending") {
        data = await getPendingRequests();
      } else {
        data = await getAllRequests();
      }
      setRequests(data);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: LeadRequest) => {
    if (!user) return;
    setProcessingId(request.id);
    
    try {
      const result = await approveLeadRequest(request.id, user.id);
      
      if (result.success) {
        toast.success("Request approved! Lead locked to CA.");
        fetchRequests();
        
        // Send notification email (fire and forget)
        sendApprovalNotification(request);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!user || !rejectRequestId) return;
    setProcessingId(rejectRequestId);
    
    try {
      const result = await rejectLeadRequest(rejectRequestId, user.id, rejectNotes);
      
      if (result.success) {
        toast.success("Request rejected");
        fetchRequests();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    } finally {
      setProcessingId(null);
      setShowRejectModal(false);
      setRejectNotes("");
      setRejectRequestId(null);
    }
  };

  const sendApprovalNotification = async (request: LeadRequest) => {
    // Get CA's email and send notification
    const caEmail = request.profiles?.email;
    const caName = request.profiles?.name;
    const leadTitle = request.leads?.title;
    const companyName = request.leads?.company_name;

    if (caEmail) {
      try {
        // Send email via our API or directly
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'lead_approved',
            to: caEmail,
            data: { caName, leadTitle, companyName }
          }
        });
      } catch (e) {
        console.log('Email notification skipped');
      }
    }
  };

  const openRejectModal = (requestId: string) => {
    setRejectRequestId(requestId);
    setShowRejectModal(true);
  };

  const filteredRequests = requests.filter((req) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      req.leads?.title?.toLowerCase().includes(query) ||
      req.leads?.company_name?.toLowerCase().includes(query) ||
      req.profiles?.name?.toLowerCase().includes(query) ||
      req.profiles?.email?.toLowerCase().includes(query)
    );
  });

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="text-center py-12 max-w-md">
          <Briefcase className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Access Denied
          </h3>
          <p className="text-slate-500">
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
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <FileText className="w-6 h-6" />
            </div>
            Lead Access Requests
          </h1>
          <p className="text-slate-500 mt-1">
            Review and approve CA requests for exclusive lead access
          </p>
        </div>
        
        <Button 
          variant="secondary" 
          onClick={fetchRequests}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-slate-800">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Approved</p>
              <p className="text-2xl font-bold text-slate-800">
                {requests.filter(r => r.status === 'approved').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Rejected</p>
              <p className="text-2xl font-bold text-slate-800">
                {requests.filter(r => r.status === 'rejected').length}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Briefcase className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-800">
                {requests.length}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by CA name, company, or lead title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={filter === "pending" ? "primary" : "secondary"}
            onClick={() => setFilter("pending")}
            className="gap-2"
          >
            <Clock className="w-4 h-4" />
            Pending
          </Button>
          <Button
            variant={filter === "all" ? "primary" : "secondary"}
            onClick={() => setFilter("all")}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            All
          </Button>
        </div>
      </motion.div>

      {/* Requests List */}
      <motion.div variants={fadeUp}>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="text-center py-16">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No requests found
            </h3>
            <p className="text-slate-500">
              {filter === "pending" 
                ? "No pending requests at the moment" 
                : "No requests match your search"}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <motion.div
                key={request.id}
                variants={fadeUp}
                className="bg-white rounded-2xl p-6 shadow-card border border-slate-100 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`badge ${statusColors[request.status]}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                      <span className={`badge ${categoryColors[request.leads?.category || 'gst_audit']}`}>
                        {categoryIcons[request.leads?.category || 'gst_audit']} {request.leads?.category?.replace("_", " ")}
                      </span>
                    </div>

                    {/* Lead Info */}
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                      {request.leads?.title || 'Lead'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                      <Building2 className="w-4 h-4" />
                      {request.leads?.company_name || 'Company'}
                    </div>

                    {/* CA Info */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {request.profiles?.name || 'CA'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">
                          {request.profiles?.email || 'Email'}
                        </span>
                      </div>
                    </div>

                    {/* Request Date */}
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      Requested {new Date(request.requested_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(request)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1 text-red-600 hover:bg-red-50"
                          onClick={() => openRejectModal(request.id)}
                          disabled={processingId === request.id}
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </Button>
                      </>
                    )}
                    
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedRequest(request)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Request Details</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`badge ${statusColors[selectedRequest.status]} text-sm px-3 py-1`}>
                  {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                </span>
                {selectedRequest.status === 'approved' && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Lead locked to this CA
                  </span>
                )}
              </div>

              {/* Lead Details */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-700 mb-3">Lead Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Title</p>
                    <p className="font-medium">{selectedRequest.leads?.title}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Company</p>
                    <p className="font-medium">{selectedRequest.leads?.company_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Category</p>
                    <p className="font-medium capitalize">{selectedRequest.leads?.category?.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Budget</p>
                    <p className="font-medium">₹{selectedRequest.leads?.budget?.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Description</p>
                    <p className="font-medium">{selectedRequest.leads?.description}</p>
                  </div>
                </div>
              </div>

              {/* CA Details */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-700 mb-3">Chartered Accountant</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Name</p>
                    <p className="font-medium">{selectedRequest.profiles?.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p className="font-medium">{selectedRequest.profiles?.email}</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="text-sm">
                <p className="text-slate-500 mb-1">Requested: {new Date(selectedRequest.requested_at).toLocaleString()}</p>
                {selectedRequest.reviewed_at && (
                  <p className="text-slate-500">
                    Reviewed: {new Date(selectedRequest.reviewed_at).toLocaleString()}
                  </p>
                )}
                {selectedRequest.admin_notes && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                    <p className="text-amber-800 font-medium">Admin Notes:</p>
                    <p className="text-amber-700">{selectedRequest.admin_notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <Button
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      handleApprove(selectedRequest);
                      setSelectedRequest(null);
                    }}
                    disabled={processingId === selectedRequest.id}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve & Lock
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 gap-2 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      openRejectModal(selectedRequest.id);
                      setSelectedRequest(null);
                    }}
                    disabled={processingId === selectedRequest.id}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl"
          >
            <h2 className="text-xl font-bold text-slate-800 mb-4">Reject Request</h2>
            <p className="text-slate-500 mb-4">
              Are you sure you want to reject this access request? The lead will be made available to other CAs.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Reason for rejection..."
                className="input-field h-24"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNotes("");
                  setRejectRequestId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleReject}
                disabled={processingId !== null}
              >
                {processingId ? 'Processing...' : 'Reject Request'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
