import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-slate-800 text-slate-200 border-slate-700",
        success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        danger: "bg-red-500/15 text-red-300 border-red-500/30",
        info: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
