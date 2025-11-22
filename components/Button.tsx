// components/Button.tsx
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none";

  const variants = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
    secondary:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50",
    danger:
      "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed",
    ghost:
      "bg-transparent text-gray-700 hover:bg-gray-100 disabled:opacity-50",
  };

  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}