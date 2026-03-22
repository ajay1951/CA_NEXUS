import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div 
      className={`bg-surface rounded-2xl shadow-soft border border-border p-6 transition-all duration-300 hover:shadow-hover ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
