import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Download, 
  Search,
  Filter,
  IndianRupee,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Eye
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { fadeUp, stagger } from "../lib/motion";
import { useAuth } from "../lib/auth";
import { getTransactionHistory, getInvoices } from "../lib/payment";

interface Transaction {
  id: string;
  amount: number;
  status: string;
  type: string;
  payment_method: string;
  razorpay_payment_id: string;
  created_at: string;
  leads?: {
    title: string;
    company_name: string;
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  created_at: string;
  leads?: {
    title: string;
    company_name: string;
  };
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"transactions" | "invoices">("transactions");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txData, invData] = await Promise.all([
        getTransactionHistory(user!.id),
        getInvoices(user!.id)
      ]);
      setTransactions(txData as Transaction[]);
      setInvoices(invData as Invoice[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "failed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const filteredTransactions = transactions.filter(t => 
    searchQuery === "" ||
    t.leads?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.razorpay_payment_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInvoices = invoices.filter(inv =>
    searchQuery === "" ||
    inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.leads?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate totals
  const totalSpent = transactions
    .filter(t => t.status === "completed")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalPending = transactions
    .filter(t => t.status === "pending")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="text-center py-12 max-w-md">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Please Login
          </h3>
          <p className="text-slate-500">
            Login to view your transactions and invoices.
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
        <h1 className="text-3xl font-bold text-slate-800">
          Transactions & Invoices
        </h1>
        <p className="text-slate-500 mt-1">
          View your payment history and download invoices
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Spent</p>
              <p className="text-xl font-bold text-slate-800">
                ₹{totalSpent.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-xl font-bold text-slate-800">
                ₹{totalPending.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Invoices</p>
              <p className="text-xl font-bold text-slate-800">
                {invoices.length}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === "transactions"
              ? "text-indigo-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Transactions
          {activeTab === "transactions" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === "invoices"
              ? "text-indigo-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Invoices
          {activeTab === "invoices" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by lead name or payment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12"
          />
        </div>
      </motion.div>

      {/* Transactions List */}
      {activeTab === "transactions" && (
        <motion.div variants={fadeUp}>
          <Card>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${getStatusColor(transaction.status)}`}>
                        {getStatusIcon(transaction.status)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {transaction.leads?.title || "Lead Purchase"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {transaction.leads?.company_name || "Company"}
                        </p>
                        <p className="text-xs text-slate-400 font-mono mt-1">
                          {transaction.razorpay_payment_id || transaction.id}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800">
                        ₹{transaction.amount?.toLocaleString("en-IN") || 0}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Invoices List */}
      {activeTab === "invoices" && (
        <motion.div variants={fadeUp}>
          <Card>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No invoices found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {invoice.invoice_number}
                        </p>
                        <p className="text-sm text-slate-500">
                          {invoice.leads?.title || "Lead Purchase"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800">
                        ₹{invoice.total?.toLocaleString("en-IN") || 0}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                      <button className="flex items-center gap-1 text-xs text-indigo-600 mt-1 hover:underline">
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
