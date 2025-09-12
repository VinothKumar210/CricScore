import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  label?: string;
  children: React.ReactNode;
}

const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, error, label, children, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={props.id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        <select
          className={cn(
            "native-select",
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent transition-colors appearance-none",
            "bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%221.5%22%20stroke%3D%22currentColor%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M8.25%2015L12%2018.75%2015.75%2015m-7.5-6L12%205.25%2015.75%209%22%20/%3E%3C/svg%3E')] bg-[length:1rem] bg-[position:right_0.75rem_center] bg-no-repeat",
            "text-foreground dark:text-foreground",
            error && "border-destructive focus:ring-destructive",
            className
          )}
          ref={ref}
          aria-invalid={error}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };