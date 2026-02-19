"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FilterFieldType, FilterOperator } from "@/types/filters";

interface OperatorSelectorProps {
  currentOperator: FilterOperator;
  fieldType: FilterFieldType;
  onSelect: (operator: FilterOperator) => void;
  children: React.ReactNode;
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "does_not_contain", label: "does not contain" },
];

export function OperatorSelector({
  currentOperator,
  fieldType,
  onSelect,
  children,
}: OperatorSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {OPERATORS.map((op) => (
          <DropdownMenuCheckboxItem
            key={op.value}
            checked={currentOperator === op.value}
            onCheckedChange={() => onSelect(op.value)}
          >
            {op.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
