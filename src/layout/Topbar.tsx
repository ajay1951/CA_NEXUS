import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, User, LogOut, Loader2, Bell, Search, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "../lib/auth";
import Button from "../components/ui/Button";
import AuthModal from "../components/AuthModal";
import Avatar from "../components/ui/Avatar";
import { AppNotification, getUserNotifications } from "../lib/notifications";
import { useEffect } from "react";

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { user, signOut, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string>(() => localStorage.getItem("last_seen_notifications_at") || "");

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const load = async () => {
      setLoadingNotifications(true);
      try {
        const data = await getUserNotifications(user.id);
        setNotifications(data);
      } finally {
        setLoadingNotifications(false);
      }
    };

    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [user?.id]);

  const markNotificationsRead = () => {
    const now = new Date().toISOString();
    setLastSeenAt(now);
    localStorage.setItem("last_seen_notifications_at", now);
  };

  const unreadCount = notifications.filter((n) => {
    if (!lastSeenAt) return true;
    return new Date(n.createdAt).getTime() > new Date(lastSeenAt).getTime();
  }).length;

  const handleLogout = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  return (
    <>
      <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-slate-100 lg:hidden"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          {/* Search Bar */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm w-48"
            />
          </div>
          
          <span className="text-sm text-slate-500 hidden sm:block">
            Welcome back 👋
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button
            className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
            onClick={() => {
              const next = !showNotifications;
              setShowNotifications(next);
              if (next) markNotificationsRead();
            }}
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            aria-label="Toggle dark mode"
            onClick={() =>
              setTheme(theme === "dark" ? "light" : "dark")
            }
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-slate-600" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>

          {/* User Menu */}
          {loading ? (
            <div className="p-2">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <Avatar name={user.name} email={user.email} size="sm" />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                      <p className="text-sm font-semibold text-slate-800">
                        {user.name || "User"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {user.email}
                      </p>
                      {user.role && (
                        <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                          {user.role}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Button onClick={() => setShowAuthModal(true)} size="sm">
              <User className="w-4 h-4 mr-2" />
              Login
            </Button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-4 lg:right-6 top-16 w-[360px] max-w-[92vw] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {loadingNotifications ? (
                <p className="px-4 py-6 text-sm text-slate-500">Loading...</p>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="px-4 py-3 border-b border-slate-50 last:border-b-0">
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(n.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
}
