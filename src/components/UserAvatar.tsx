import React from "react";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  isSquare?: boolean;
}

export default function UserAvatar({
  name,
  avatarUrl,
  className = "",
  isSquare = false,
}: UserAvatarProps) {
  const baseClasses = `shrink-0 bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center font-extrabold text-white shadow-sm overflow-hidden ${
    isSquare ? "rounded-2xl" : "rounded-full"
  } ${className}`;

  if (avatarUrl) {
    return (
      <div className={baseClasses}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  
  return (
    <div className={baseClasses}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}