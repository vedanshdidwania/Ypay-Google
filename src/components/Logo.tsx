import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-sm' },
    md: { icon: 'w-8 h-8 sm:w-10 sm:h-10', text: 'text-base sm:text-lg' },
    lg: { icon: 'w-12 h-12', text: 'text-xl' },
    xl: { icon: 'w-16 h-16', text: 'text-3xl' },
  };

  return (
    <div className={cn("flex items-center gap-3 group", className)}>
      <div className={cn(sizes[size].icon, "relative flex items-center justify-center")}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]"
        >
          <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Outer Hexagon / Shield Shape */}
          <path
            d="M50 5L90 25V75L50 95L10 75V25L50 5Z"
            stroke="url(#logo-grad)"
            strokeWidth="2"
            strokeLinejoin="round"
            className="opacity-20"
          />

          {/* Abstract P2P Connection Lines */}
          <circle cx="50" cy="50" r="40" stroke="url(#logo-grad)" strokeWidth="0.5" strokeDasharray="4 4" className="opacity-30 animate-[spin_20s_linear_infinite]" />
          
          {/* Stylized Y / Arrow Shape */}
          <path
            d="M35 30L50 50L65 30M50 50V75"
            stroke="url(#logo-grad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Connection Points */}
          <circle cx="35" cy="30" r="4" fill="#6366F1" />
          <circle cx="65" cy="30" r="4" fill="#6366F1" />
          <circle cx="50" cy="75" r="4" fill="#4F46E5" />

          {/* Pulse Effect */}
          <circle cx="50" cy="50" r="15" fill="#6366F1" className="opacity-10 animate-pulse" />
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className={cn(sizes[size].text, "font-display font-black text-white tracking-tighter leading-none uppercase")}>
              YPAY
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          </div>
          <span className="text-[7px] sm:text-[9px] font-black text-brand uppercase tracking-[0.3em] mt-1 opacity-80">
            P2P PROTOCOL
          </span>
        </div>
      )}
    </div>
  );
}
