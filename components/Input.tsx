// components/Input.tsx
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({
  label,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <input
        {...props}
        className={`
          w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
          bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${className}
        `}
      />
    </div>
  );
}