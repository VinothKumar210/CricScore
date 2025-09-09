import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform-gpu active:scale-95 touch-feedback-subtle will-change-transform shadow-sm hover:shadow-md",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary to-sky-500 text-white hover:shadow-xl border-0 hover:scale-[1.02] active:scale-95 hover:brightness-110",
        destructive:
          "bg-gradient-to-r from-destructive to-red-600 text-white shadow-lg hover:shadow-xl border-0 hover:brightness-110",
        outline:
          "border-2 bg-transparent hover:bg-primary/10 text-primary shadow-sm hover:shadow-md backdrop-blur-sm",
        secondary:
          "bg-gradient-to-r from-secondary to-muted text-secondary-foreground shadow-sm hover:shadow-md border border-border/50 hover:border-border hover:scale-[1.02] active:scale-95",
        ghost: "hover:bg-gradient-to-r hover:from-accent/50 hover:to-accent/30 hover:backdrop-blur-sm rounded-2xl hover:scale-[1.02] active:scale-95",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
      },
      size: {
        default: "h-11 px-6 py-3 text-sm sm:h-10 sm:px-4 sm:py-2",
        sm: "h-9 px-4 py-2 text-xs sm:h-8 sm:px-3",
        lg: "h-12 px-8 py-4 text-base sm:h-11 sm:px-6",
        icon: "h-11 w-11 sm:h-10 sm:w-10",
        mobile: "h-12 px-8 py-4 text-base font-bold sm:h-11 sm:px-6 sm:text-sm",
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
