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
  
  // Wrap onValueChange to handle potential errors
  const handleValueChange = React.useCallback((newValue: string) => {
    try {
      if (onValueChange && newValue != null) {
        onValueChange(newValue);
      }
    } catch (error) {
      console.warn('Error in SafeSelect onValueChange:', error);
    }
  }, [onValueChange]);
  
  return (
    <Select 
      onValueChange={handleValueChange}
      {...selectProps}
      {...props}
    >
      {children}
    </Select>
  );
};

SafeSelect.displayName = "SafeSelect";

export { SelectContent, SelectItem, SelectTrigger, SelectValue };