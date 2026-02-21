"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FilterFieldType, FilterOperator } from "@/types/filters";
import { OPERATORS_BY_FIELD_TYPE, OPERATOR_LABELS } from "@/types/tokens";
import type { TokenFilterFieldType, TokenFilterOperator } from "@/types/tokens";

interface OperatorSelectorProps {
  currentOperator: FilterOperator;
  fieldType: FilterFieldType;
  onSelect: (operator: FilterOperator) => void;
  children: React.ReactNode;
}

export function OperatorSelector({
  currentOperator,
  fieldType,
  onSelect,
  children,
}: OperatorSelectorProps) {
  const config = OPERATORS_BY_FIELD_TYPE[fieldType as TokenFilterFieldType];

  if (!config) {
    // Fallback for unknown field types
    return <>{children}</>;
  }

  const { primary, advanced } = config;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {primary.map((op) => (
          <DropdownMenuCheckboxItem
            key={op}
            checked={currentOperator === op}
            onCheckedChange={() => onSelect(op as FilterOperator)}
          >
            {getOperatorLabel(op)}
          </DropdownMenuCheckboxItem>
        ))}
        {advanced.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {advanced.map((op) => (
              <DropdownMenuCheckboxItem
                key={op}
                checked={currentOperator === op}
                onCheckedChange={() => onSelect(op as FilterOperator)}
              >
                {getOperatorLabel(op)}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getOperatorLabel(op: TokenFilterOperator): string {
  return OPERATOR_LABELS[op] ?? op.replace(/_/g, " ");
}
