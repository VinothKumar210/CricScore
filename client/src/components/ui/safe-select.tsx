import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

interface SafeSelectProps {
  value?: string | undefined;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  [key: string]: any;
}

export const SafeSelect: React.FC<SafeSelectProps> = ({ 
  value, 
  onValueChange, 
  children, 
  ...props 
}) => {
  // Only pass value prop if it's not null/undefined, otherwise let Select use its internal state
  const selectProps = value != null ? { value } : {};
  
  return (
    <Select 
      onValueChange={onValueChange}
      {...selectProps}
      {...props}
    >
      {children}
    </Select>
  );
};

SafeSelect.displayName = "SafeSelect";

export { SelectContent, SelectItem, SelectTrigger, SelectValue };