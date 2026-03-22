import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "blue" | "purple";
  className?: string;
}

export default function Badge({ 
  children, 
  variant = "default",
  className = "" 
}: BadgeProps) {
  const baseStyles = "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold";
  
  const variantStyles = {
    default: "bg-slate-100 text-slate-700",
    primary: "bg-indigo-100 text-indigo-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
