import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform-gpu active:scale-95 touch-feedback-subtle will-change-transform",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary to-sky-500 text-white hover:from-primary-hover hover:to-sky-600 shadow-lg hover:shadow-xl border-0",
        destructive:
          "bg-gradient-to-r from-destructive to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl border-0",
        outline:
          "border border-slate-200/30 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm hover:bg-white/20 hover:border-blue-500/50 shadow-sm hover:shadow-md",
        secondary:
          "bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground hover:from-secondary/90 hover:to-secondary/70 shadow-sm hover:shadow-md border border-white/10",
        ghost: "hover:bg-gradient-to-r hover:from-accent/50 hover:to-accent/30 hover:backdrop-blur-sm rounded-2xl",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
      },
      size: {
        default: "h-12 px-6 py-3 sm:h-10 sm:px-4 sm:py-2",
        sm: "h-10 px-4 py-2 text-xs sm:h-8 sm:px-3",
        lg: "h-14 px-8 py-4 text-base sm:h-12 sm:px-6",
        icon: "h-12 w-12 sm:h-10 sm:w-10",
        mobile: "h-14 px-8 py-4 text-lg font-bold sm:h-12 sm:px-6 sm:text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
