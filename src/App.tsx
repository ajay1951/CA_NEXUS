import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./lib/auth";
import AppLayout from "./layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import LeadMarketplace from "./pages/LeadMarketplace";
import MyPurchases from "./pages/MyPurchases";
import MyApprovedLeads from "./pages/MyApprovedLeads";
import LeadPayment from "./pages/LeadPayment";
import AIContentHub from "./pages/AIContentHub";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLeads from "./pages/AdminLeads";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import AdminLeadRequests from "./pages/AdminLeadRequests";
import Transactions from "./pages/Transactions";
import Inbox from "./pages/Inbox";
import ResetPassword from "./pages/ResetPassword";
import AuthModal from "./components/AuthModal";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { toast } from "sonner";
import { useState } from "react";

// Route protection component - server-side role verification
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    // Only show warning after loading completes
    if (!loading && !isAdmin && user) {
      toast.error("Access denied. Admin privileges required.");
    }
  }, [loading, isAdmin, user]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Protected route for authenticated users
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(true);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">Login Required</h2>
          <p className="text-slate-500 mt-2">Please login or sign up to access this page.</p>
          {!showAuthModal && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Open Login
            </button>
          )}
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<LeadMarketplace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected Routes - Auth Required */}
        <Route path="/my-purchases" element={
          <AuthRoute><MyPurchases /></AuthRoute>
        } />
        <Route path="/my-approved-leads" element={
          <AuthRoute><MyApprovedLeads /></AuthRoute>
        } />
        <Route path="/payment/:leadId" element={
          <AuthRoute><LeadPayment /></AuthRoute>
        } />
        <Route path="/ai" element={
          <AuthRoute><AIContentHub /></AuthRoute>
        } />
        <Route path="/transactions" element={
          <AuthRoute><Transactions /></AuthRoute>
        } />
        <Route path="/inbox" element={
          <AuthRoute><Inbox /></AuthRoute>
        } />
        
        {/* Admin Routes - Admin Role Required */}
        <Route path="/admin" element={
          <AdminRoute><AdminDashboard /></AdminRoute>
        } />
        <Route path="/admin/leads" element={
          <AdminRoute><AdminLeads /></AdminRoute>
        } />
        <Route path="/admin/audit-logs" element={
          <AdminRoute><AdminAuditLogs /></AdminRoute>
        } />
        <Route path="/admin/lead-requests" element={
          <AdminRoute><AdminLeadRequests /></AdminRoute>
        } />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout>
          <AnimatedRoutes />
        </AppLayout>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
