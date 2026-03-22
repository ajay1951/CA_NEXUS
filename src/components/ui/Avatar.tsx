import { ReactNode } from 'react';

interface AvatarProps {
  src?: string;
  name?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return '?';
}

function getColorFromName(name?: string, email?: string): string {
  const colors = [
    'bg-indigo-500',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-violet-500',
    'bg-cyan-500',
    'bg-orange-500',
  ];
  
  const str = name || email || '';
  const index = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

export default function Avatar({ src, name, email, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(name, email);
  const bgColor = getColorFromName(name, email);

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        rounded-full 
        flex items-center justify-center 
        font-semibold text-white 
        overflow-hidden
        ${className}
      `}
    >
      {src ? (
        <img 
          src={src} 
          alt={name || 'Avatar'} 
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

// Color utility for generating avatar colors
export { getColorFromName };
