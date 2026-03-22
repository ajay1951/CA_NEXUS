import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Loader2 } from "lucide-react";
import Button from "./ui/Button";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "forgot") {
        const redirectTo = `${window.location.origin}/reset-password`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

        if (resetError) {
          setError(resetError.message);
        } else {
          setInfo("Password reset link sent. Please check your email.");
        }
        return;
      }

      let result;
      if (mode === "login") {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password, name);
      }

      if (result.success) {
        onClose();
        setEmail("");
        setPassword("");
        setName("");
      } else {
        setError(result.message);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-background rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-text-primary">
                {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Forgot Password"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-indigo-700 text-center">
                {mode === "login"
                  ? "Login to access your leads, purchases, and AI tools."
                  : mode === "signup"
                  ? "Create your account to start accessing exclusive CA leads."
                  : "Enter your email and we will send a reset link."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand"
                      required
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}
              {info && <p className="text-emerald-600 text-sm">{info}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Please wait...
                  </>
                ) : mode === "login" ? (
                  "Login"
                ) : mode === "signup" ? (
                  "Create Account"
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-text-muted">or</span>
              </div>
            </div>

            {mode === "login" && (
              <p className="text-xs text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setPassword("");
                    setError("");
                    setInfo("");
                  }}
                  className="text-brand font-medium hover:underline"
                >
                  Forgot password?
                </button>
              </p>
            )}

            <p className="text-center text-sm text-text-muted mt-4">
              {mode === "forgot" ? (
                <>
                  Remembered your password?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                      setInfo("");
                    }}
                    className="text-brand font-medium hover:underline"
                  >
                    Login
                  </button>
                </>
              ) : mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                      setInfo("");
                    }}
                    className="text-brand font-medium hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                      setInfo("");
                    }}
                    className="text-brand font-medium hover:underline"
                  >
                    Login
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
