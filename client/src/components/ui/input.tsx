import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-input/20 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0 focus-visible:border-primary/50 focus-visible:bg-background/80 hover:border-input/40 hover:bg-background/60 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// Modern floating label input variant
const FloatingInput = React.forwardRef<HTMLInputElement, 
  React.ComponentProps<"input"> & { label?: string }
>(({ className, type, label, ...props }, ref) => {
  const [focused, setFocused] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(false);

  const handleFocus = () => setFocused(true);
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    setHasValue(!!e.target.value);
    props.onBlur?.(e);
  };

  React.useEffect(() => {
    if (props.value || props.defaultValue) {
      setHasValue(true);
    }
  }, [props.value, props.defaultValue]);

  return (
    <div className="relative">
      <input
        type={type}
        className={cn(
          "peer flex h-14 w-full rounded-2xl border border-input/20 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm px-4 pt-6 pb-2 text-base ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0 focus-visible:border-primary/50 focus-visible:bg-background/80 hover:border-input/40 hover:bg-background/60 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-medium placeholder:text-transparent",
          className
        )}
        ref={ref}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      {label && (
        <label className={cn(
          "absolute left-4 text-muted-foreground transition-all duration-300 pointer-events-none text-sm font-medium",
          focused || hasValue || props.value || props.defaultValue
            ? "top-2 text-xs text-primary"
            : "top-1/2 -translate-y-1/2 text-base"
        )}>
          {label}
        </label>
      )}
    </div>
  );
});
FloatingInput.displayName = "FloatingInput";

export { Input, FloatingInput }
