import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-blue-500 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500",
        secondary:
          "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700",
        outline:
          "border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800",
        ghost: "text-slate-300 hover:bg-slate-800 hover:text-white",
        destructive: "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/20",
        success: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20",
        link: "text-blue-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
