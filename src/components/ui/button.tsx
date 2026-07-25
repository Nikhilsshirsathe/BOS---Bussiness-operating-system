import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  /* base */
  [
    "inline-flex items-center justify-center whitespace-nowrap font-medium",
    "transition-all duration-300 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "select-none cursor-pointer",
  ].join(" "),
  {
    variants: {
      variant: {
        /* ── Primary: BOS gradient ── */
        default: [
          "bg-gradient-to-r from-[#0057FF] via-[#5B5FFF] to-[#6D28FF]",
          "text-white shadow-md shadow-blue-500/25",
          "hover:shadow-lg hover:shadow-blue-500/35 hover:scale-[1.02] hover:brightness-110",
          "active:scale-[0.98]",
        ].join(" "),

        /* ── Destructive ── */
        destructive: [
          "bg-red-500 text-white shadow-sm shadow-red-500/20",
          "hover:bg-red-600 hover:scale-[1.02]",
          "active:scale-[0.98]",
        ].join(" "),

        /* ── Outline ── */
        outline: [
          "border border-border bg-transparent text-foreground",
          "hover:bg-accent hover:text-accent-foreground hover:scale-[1.01]",
          "active:scale-[0.99]",
        ].join(" "),

        /* ── Glass (secondary) ── */
        secondary: [
          "glass text-foreground",
          "hover:brightness-105 hover:scale-[1.01]",
          "active:scale-[0.99]",
        ].join(" "),

        /* ── Ghost ── */
        ghost: [
          "bg-transparent text-muted-foreground",
          "hover:bg-accent hover:text-foreground",
          "active:scale-[0.98]",
        ].join(" "),

        /* ── Link ── */
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",

        /* ── Glow (special CTA) ── */
        glow: [
          "bg-gradient-to-r from-[#0057FF] to-[#6D28FF]",
          "text-white",
          "shadow-[0_0_20px_rgba(0,87,255,0.4),0_4px_16px_rgba(0,87,255,0.25)]",
          "hover:shadow-[0_0_30px_rgba(91,95,255,0.5),0_4px_24px_rgba(91,95,255,0.35)]",
          "hover:scale-[1.03]",
          "active:scale-[0.98]",
        ].join(" "),
      },

      size: {
        default: "h-11 px-5 py-2.5 text-sm rounded-[18px]",
        sm:      "h-9  px-4 py-2   text-xs rounded-[14px]",
        lg:      "h-13 px-7 py-3   text-base rounded-[20px]",
        xl:      "h-14 px-8 py-3.5 text-base rounded-[22px]",
        icon:    "h-10 w-10 rounded-[14px]",
        "icon-sm":"h-8 w-8 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
