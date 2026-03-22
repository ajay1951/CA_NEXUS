import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  Download,
  Shield,
  Eye,
  ShoppingCart,
  User,
  LogIn,
  FileText,
  Settings,
  Calendar,
  ChevronDown,
  RefreshCw
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { fadeUp, stagger } from "../lib/motion";
import { useAuth } from "../lib/auth";
import { getAuditLogs, exportAuditLogs, AuditAction } from "../lib/audit";

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action_type: AuditAction;
  lead_id: string;
  resource_type: string;
  resource_id: string;
  description: string;
  ip_address: string;
  user_agent: string;
  metadata: Record<string, any>;
  created_at: string;
}

const actionIcons: Record<string, any> = {
  LEAD_ACCESS: Eye,
  LEAD_VIEW_DETAILS: Eye,
  LEAD_PURCHASE: ShoppingCart,
  LEAD_UNLOCK: ShoppingCart,
  USER_LOGIN: LogIn,
  USER_LOGOUT: LogIn,
  DATA_EXPORT: Download,
  ADMIN_ACTION: Settings,
  LEAD_CREATE: FileText,
  LEAD_UPDATE: FileText,
  LEAD_DELETE: FileText,
};

const actionColors: Record<string, string> = {
  LEAD_ACCESS: "bg-blue-100 text-blue-700",
  LEAD_VIEW_DETAILS: "bg-blue-100 text-blue-700",
  LEAD_PURCHASE: "bg-emerald-100 text-emerald-700",
  LEAD_UNLOCK: "bg-purple-100 text-purple-700",
  USER_LOGIN: "bg-indigo-100 text-indigo-700",
  USER_LOGOUT: "bg-slate-100 text-slate-700",
  DATA_EXPORT: "bg-amber-100 text-amber-700",
  ADMIN_ACTION: "bg-red-100 text-red-700",
  LEAD_CREATE: "bg-emerald-100 text-emerald-700",
  LEAD_UPDATE: "bg-amber-100 text-amber-700",
  LEAD_DELETE: "bg-red-100 text-red-700",
};

const actionLabels: Record<string, string> = {
  LEAD_ACCESS: "Lead Accessed",
  LEAD_VIEW_DETAILS: "Viewed Details",
  LEAD_PURCHASE: "Lead Purchased",
  LEAD_UNLOCK: "Lead Unlocked",
  USER_LOGIN: "User Login",
  USER_LOGOUT: "User Logout",
  DATA_EXPORT: "Data Exported",
  ADMIN_ACTION: "Admin Action",
  LEAD_CREATE: "Lead Created",
  LEAD_UPDATE: "Lead Updated",
  LEAD_DELETE: "Lead Deleted",
};

export default function AdminAuditLogs() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin, selectedAction]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const filters = selectedAction !== "all" ? { actionType: selectedAction } : {};
      const data = await getAuditLogs({ ...filters, limit: 200 });
      setLogs(data as AuditLog[]);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      const data = await exportAuditLogs(
        startDate.toISOString(),
        endDate.toISOString()
      );

      // Create CSV
      const csv = convertToCSV(data);
      downloadCSV(csv, `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error("Error exporting logs:", error);
    } finally {
      setExporting(false);
    }
  };

  const convertToCSV = (data: any[]) => {
    const headers = [
      "Date",
      "Time",
      "User ID",
      "Email",
      "Action",
      "Lead ID",
      "Description",
      "IP Address",
    ];
    const rows = data.map((log) => {
      const date = new Date(log.created_at);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        log.user_id,
        log.user_email || "",
        log.action_type,
        log.lead_id || "",
        log.description || "",
        log.ip_address || "",
      ];
    });
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="text-center py-12 max-w-md">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Access Denied
          </h3>
          <p className="text-slate-500">
            Only administrators can view audit logs.
          </p>
        </Card>
      </div>
    );
  }

  const actionTypes = [
    { value: "all", label: "All Actions" },
    { value: "LEAD_PURCHASE", label: "Lead Purchases" },
    { value: "LEAD_VIEW_DETAILS", label: "Lead Views" },
    { value: "USER_LOGIN", label: "User Logins" },
    { value: "ADMIN_ACTION", label: "Admin Actions" },
    { value: "DATA_EXPORT", label: "Data Exports" },
  ];

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
            <div className="p-2 bg-amber-500 rounded-xl text-white">
              <Shield className="w-6 h-6" />
            </div>
            Audit Logs
          </h1>
          <p className="text-slate-500 mt-1">
            ICAI compliance tracking - Immutable record of all platform activities
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="secondary" onClick={fetchLogs} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={exporting} className="gap-2">
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12"
          />
        </div>
        
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="input-field md:w-64"
        >
          {actionTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </motion.div>

      {/* Stats */}
      <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Total Events</p>
          <p className="text-2xl font-bold text-slate-800">{logs.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Purchases</p>
          <p className="text-2xl font-bold text-emerald-600">
            {logs.filter(l => l.action_type === 'LEAD_PURCHASE').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Logins</p>
          <p className="text-2xl font-bold text-indigo-600">
            {logs.filter(l => l.action_type === 'USER_LOGIN').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Admin Actions</p>
          <p className="text-2xl font-bold text-red-600">
            {logs.filter(l => l.action_type === 'ADMIN_ACTION').length}
          </p>
        </Card>
      </motion.div>

      {/* Logs Table */}
      <motion.div variants={fadeUp}>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500">Date/Time</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500">Action</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td colSpan={5} className="py-4 px-4">
                        <Skeleton className="h-8" />
                      </td>
                    </tr>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const Icon = actionIcons[log.action_type] || FileText;
                    const colorClass = actionColors[log.action_type] || "bg-slate-100 text-slate-700";
                    
                    return (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {log.user_email || log.user_id}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                            <Icon className="w-3 h-3" />
                            {actionLabels[log.action_type] || log.action_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-slate-600 max-w-xs truncate">
                            {log.description || "-"}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-400 font-mono">
                            {log.ip_address || "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Compliance Notice */}
      <motion.div variants={fadeUp}>
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800">ICAI Compliance</h4>
              <p className="text-sm text-amber-700 mt-1">
                This audit log is immutable and maintained for ICAI compliance. 
                All lead accesses, purchases, and administrative actions are automatically recorded 
                with timestamps, user IDs, and IP addresses. Export logs regularly for record keeping.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
