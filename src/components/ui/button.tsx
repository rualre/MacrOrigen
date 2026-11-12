import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md",
      secondary: "bg-teal-50 text-teal-800 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-200 dark:hover:bg-teal-900",
      outline: "border border-border bg-background hover:bg-muted",
      ghost: "hover:bg-muted text-muted-foreground hover:text-foreground",
      destructive: "bg-red-600 text-white hover:bg-red-700",
    },
    size: { default: "h-10 px-4 py-2", sm: "h-8 rounded-lg px-3 text-xs", lg: "h-12 px-6", icon: "h-10 w-10" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
export { buttonVariants };
