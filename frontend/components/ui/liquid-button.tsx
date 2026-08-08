"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { LiquidGlass } from "@liquidglass/react";
import { cn } from "@/lib/utils";

interface LiquidButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "destructive";
}

const VARIANT_TEXT_CLASSES: Record<string, string> = {
  primary: "text-foreground font-semibold",
  secondary: "text-muted-foreground font-medium",
  destructive: "text-destructive font-semibold",
};

/**
 * Drop-in replacement for a standard <button>, wrapped in the
 * @liquidglass/react effect. The LiquidGlass component only handles the
 * visual shell — the actual <button> inside still owns onClick, disabled,
 * type, etc., so this composes like any normal button.
 */
export function LiquidButton({
  children,
  variant = "primary",
  className,
  disabled,
  ...buttonProps
}: LiquidButtonProps) {
  return (
    <LiquidGlass
      borderRadius={12}
      blur={0.5}
      contrast={1.15}
      brightness={1.05}
      saturation={1.15}
      className={cn(disabled && "opacity-50 pointer-events-none")}
    >
      <button
        disabled={disabled}
        className={cn(
          "px-4 py-2 transition-opacity hover:opacity-90",
          VARIANT_TEXT_CLASSES[variant],
          className,
        )}
        {...buttonProps}
      >
        {children}
      </button>
    </LiquidGlass>
  );
}
