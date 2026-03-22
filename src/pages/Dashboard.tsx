import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Clock,
  CheckCircle
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { fadeUp, stagger } from "../lib/motion";

const stats = [
  {
    label: "Total Leads",
    value: 128,
    change: "+12%",
    positive: true,
    icon: Target,
    color: "indigo",
  },
  {
    label: "AI Credits",
    value: 320,
    change: "+25",
    positive: true,
    icon: Sparkles,
    color: "purple",
  },
];

const activities = [
  { id: 1, text: "New GST Audit lead added", time: "2 min ago", type: "lead" },
  { id: 2, text: "Tax Planning lead purchased", time: "15 min ago", type: "purchase" },
  { id: 3, text: "AI content generated", time: "1 hour ago", type: "ai" },
  { id: 4, text: "Client profile updated", time: "2 hours ago", type: "update" },
];

const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", iconBg: "bg-indigo-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", iconBg: "bg-purple-500" },
};

export default function Dashboard() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="space-y-8"
    >
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">Your account overview and recent activity</p>
      </motion.div>

      <motion.div
        variants={stagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6"
      >
        {stats.map((stat) => {
          const colors = colorMap[stat.color] || colorMap.indigo;
          return (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="stats-card group"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-sm font-medium text-slate-500">{stat.label}</span>
                <div className={`p-2.5 rounded-xl ${colors.iconBg} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-slate-800">
                  <CountUp end={stat.value} duration={1.2} />
                </div>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold ${
                    stat.positive ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {stat.positive ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {stat.change}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        variants={stagger}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View All</button>
            </div>

            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{activity.text}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="h-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-0">
            <div className="h-full flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Boost your growth</h3>
                <p className="text-indigo-100 text-sm">
                  Unlock AI tools and premium leads to scale faster.
                </p>
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-300" />
                  <span>Unlimited lead access</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-300" />
                  <span>Advanced AI features</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-300" />
                  <span>Priority support</span>
                </div>
              </div>

              <Button className="w-full mt-6 bg-white text-indigo-600 hover:bg-indigo-50">
                Upgrade Plan
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <p className="text-3xl font-bold text-indigo-600">12</p>
              <p className="text-sm text-slate-500 mt-1">New Leads</p>
            </div>
            <div className="p-4 border-l border-slate-100">
              <p className="text-3xl font-bold text-purple-600">8</p>
              <p className="text-sm text-slate-500 mt-1">Conversions</p>
            </div>
            <div className="p-4 border-l border-slate-100">
              <p className="text-3xl font-bold text-amber-600">94%</p>
              <p className="text-sm text-slate-500 mt-1">Satisfaction</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
