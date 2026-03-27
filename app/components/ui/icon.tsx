"use client"

import * as React from "react"
import * as LucideIcons from "lucide-react"

// Simple string type for icon names (avoids importing all 1400+ lucide icons for performance)
export type IconName = string;


export interface IconProps extends React.ComponentProps<"svg"> {
  name: IconName
  className?: string
}

export function Icon({ name, className, ...props }: IconProps) {
  // Convert kebab-case to PascalCase (e.g., "chevron-right" -> "ChevronRight")
  const pascalName = name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  const LucideIcon = (LucideIcons as any)[pascalName];

  if (!LucideIcon) {
    return null;
  }

  return <LucideIcon className={className} {...props} />
}