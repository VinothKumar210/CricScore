import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground tracking-wide transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "text-foreground",
        floating: "text-muted-foreground transition-all duration-300",
        required: "after:content-['*'] after:ml-1 after:text-destructive after:font-bold",
        subtle: "text-muted-foreground font-medium",
      },
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    }
  }
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
