import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Briefcase,
  ShoppingCart,
  Sparkles,
  ChevronLeft,
  Shield,
  Settings,
  Zap,
  LogOut,
  ClipboardList,
  CreditCard,
  MessageCircle,
  X,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../lib/auth";

interface SidebarProps {
  onClose?: () => void;
}

const adminNavItems = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Leads",
    path: "/leads",
    icon: Briefcase,
  },
  {
    label: "My Purchases",
    path: "/my-purchases",
    icon: ShoppingCart,
    adminHidden: true,
  },
  {
    label: "My Approved Leads",
    path: "/my-approved-leads",
    icon: ShieldCheck,
    adminHidden: true,
  },
  {
    label: "AI Hub",
    path: "/ai",
    icon: Sparkles,
  },
  {
    label: "Inbox",
    path: "/inbox",
    icon: MessageCircle,
  },
  {
    label: "Transactions",
    path: "/transactions",
    icon: CreditCard,
  },
  {
    label: "Admin",
    path: "/admin",
    icon: Shield,
    adminOnly: true,
  },
  {
    label: "Manage Leads",
    path: "/admin/leads",
    icon: Settings,
    adminOnly: true,
  },
  {
    label: "Audit Logs",
    path: "/admin/audit-logs",
    icon: ClipboardList,
    adminOnly: true,
  },
  {
    label: "Lead Requests",
    path: "/admin/lead-requests",
    icon: FileText,
    adminOnly: true,
  },
];

export default function Sidebar({ onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { isAdmin, user, signOut } = useAuth();

  const navItems = adminNavItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.adminHidden && isAdmin) return false;
    return true;
  });

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 280 }}
      className="h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col border-r border-white/10 relative overflow-hidden w-72 lg:w-auto"
    >
      {/* Mobile Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 lg:hidden z-50"
        >
          <X size={20} />
        </button>
      )}

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Logo */}
      <div className="h-20 flex items-center justify-between px-4 relative z-10">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                CA Nexus
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-white/10 transition-all hover:scale-110 hidden lg:block"
        >
          <ChevronLeft
            className={`w-5 h-5 transition-transform duration-300 ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-2 relative z-10">
        {navItems.map((item, index) => (
          <NavLink key={item.path} to={item.path} onClick={onClose}>
            {({ isActive }) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : ""}`} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-white/10 relative z-10">
        {user && (
          <div className={`flex items-center gap-3 p-3 rounded-xl bg-white/5 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-white truncate">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user.email}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
