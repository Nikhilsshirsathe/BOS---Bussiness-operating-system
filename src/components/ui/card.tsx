import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Card ──────────────────────────────────────────────────────── */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "glass" | "flat" | "elevated";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: [
      "bg-card text-card-foreground border border-border",
      "shadow-[0_2px_16px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]",
      "dark:shadow-[0_2px_16px_rgba(0,0,0,0.35),0_1px_4px_rgba(0,0,0,0.2)]",
    ].join(" "),
    glass: [
      "glass-card text-card-foreground",
    ].join(" "),
    flat: "bg-muted/60 text-card-foreground border border-transparent",
    elevated: [
      "bg-card text-card-foreground border border-border",
      "shadow-[0_8px_32px_rgba(0,0,0,0.10),0_2px_8px_rgba(0,0,0,0.06)]",
      "dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.3)]",
    ].join(" "),
  };

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-[24px] overflow-hidden transition-all duration-300",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
Card.displayName = "Card";

/* ── CardHeader ─────────────────────────────────────────────────── */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

/* ── CardTitle ───────────────────────────────────────────────────── */
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-tight tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

/* ── CardDescription ─────────────────────────────────────────────── */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/* ── CardContent ─────────────────────────────────────────────────── */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

/* ── CardFooter ──────────────────────────────────────────────────── */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
