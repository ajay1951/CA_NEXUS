import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  Users,
  Briefcase,
  IndianRupee,
  Activity,
  Shield,
  TrendingUp,
  Clock,
  DollarSign,
  Target,
  Zap
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { fadeUp, stagger } from "../lib/motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

interface Stats {
  totalUsers: number;
  activeClients: number;
  totalLeads: number;
  totalPurchases: number;
  totalRevenue: number;
  monthlyRevenue: number;
  recentPurchases: any[];
}

const statConfig = [
  {
    label: "Total Users",
    icon: Users,
    color: "blue",
    change: "Live",
    positive: true,
  },
  {
    label: "Total Leads",
    icon: Briefcase,
    color: "purple",
    change: "Live",
    positive: true,
  },
  {
    label: "Total Purchases",
    icon: Activity,
    color: "emerald",
    change: "Live",
    positive: true,
  },
  {
    label: "Total Revenue",
    icon: DollarSign,
    color: "indigo",
    change: "Live",
    positive: true,
  },
];

const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", iconBg: "bg-purple-500" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-500" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", iconBg: "bg-indigo-500" },
};

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeClients: 0,
    totalLeads: 0,
    totalPurchases: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    recentPurchases: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      const { count: userCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      const { count: leadCount } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true });

      const { data: completedPurchases } = await supabase
        .from("purchased_leads")
        .select("amount, user_id, paid_at")
        .eq("payment_status", "completed");

      const { data: purchases } = await supabase
        .from("purchased_leads")
        .select(`
          id,
          amount,
          paid_at,
          leads (
            title,
            company_name
          )
        `)
        .eq("payment_status", "completed")
        .order("paid_at", { ascending: false })
        .limit(10);

      const totalRevenue = (completedPurchases || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalPurchases = (completedPurchases || []).length;
      const activeClients = new Set((completedPurchases || []).map((p) => p.user_id)).size;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthlyRevenue = (completedPurchases || [])
        .filter((p) => p.paid_at && p.paid_at >= startOfMonth)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      setStats({
        totalUsers: userCount || 0,
        activeClients,
        totalLeads: leadCount || 0,
        totalPurchases,
        totalRevenue,
        monthlyRevenue,
        recentPurchases: purchases || [],
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="text-center py-12 max-w-md">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Access Denied</h3>
          <p className="text-slate-500">You don't have permission to access this page.</p>
        </Card>
      </div>
    );
  }

  const getValue = (index: number) => {
    const values = [stats.totalUsers, stats.totalLeads, stats.totalPurchases, stats.totalRevenue];
    return values[index];
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="space-y-8"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Shield className="w-6 h-6" />
            </div>
            Admin Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Manage your platform and track live performance metrics</p>
        </div>

        <div className="hidden md:flex gap-3">
          <Button variant="secondary" className="gap-2">
            <Activity className="w-4 h-4" />
            View Reports
          </Button>
          <Button className="gap-2">
            <Zap className="w-4 h-4" />
            Quick Actions
          </Button>
        </div>
      </motion.div>

      <motion.div
        variants={stagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statConfig.map((stat, index) => {
          const colors = colorMap[stat.color];
          return (
            <motion.div key={stat.label} variants={fadeUp} className="stats-card group">
              <div className="flex items-start justify-between mb-4">
                <span className="text-sm font-medium text-slate-500">{stat.label}</span>
                <div className={`p-2.5 rounded-xl ${colors.iconBg} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-slate-800 flex items-center gap-1">
                  {stat.label === "Total Revenue" && <IndianRupee className="w-6 h-6" />}
                  {loading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <CountUp end={getValue(index)} duration={1.2} />
                  )}
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Recent Purchases</h3>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View All</button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : stats.recentPurchases.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No purchases yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Target className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">{purchase.leads?.title || "Lead"}</p>
                        <p className="text-sm text-slate-400">{purchase.leads?.company_name || "Company"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 flex items-center gap-1 justify-end">
                        <IndianRupee className="w-4 h-4" />
                        {purchase.amount?.toLocaleString("en-IN") || 0}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {purchase.paid_at ? new Date(purchase.paid_at).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="h-full">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Platform Health</h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Active Clients</p>
                    <p className="text-xl font-bold text-slate-800">{stats.activeClients}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Available Leads</p>
                    <p className="text-xl font-bold text-slate-800">{stats.totalLeads}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Conversion Rate</p>
                    <p className="text-xl font-bold text-slate-800">
                      {stats.totalUsers > 0 ? ((stats.totalPurchases / stats.totalUsers) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-3">
                  <p className="text-sm text-emerald-600 mb-1">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-emerald-700 flex items-center gap-1">
                    <IndianRupee className="w-5 h-5" />
                    {stats.monthlyRevenue.toFixed(0)}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                  <p className="text-sm text-indigo-600 mb-1">Average Revenue per Client</p>
                  <p className="text-2xl font-bold text-indigo-700 flex items-center gap-1">
                    <IndianRupee className="w-5 h-5" />
                    {stats.activeClients > 0 ? (stats.totalRevenue / stats.activeClients).toFixed(0) : 0}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
