"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BooleanConnectorProps {
  type: "AND" | "OR";
  onClick?: () => void;
  isInvalid?: boolean;
  className?: string;
}

export function BooleanConnector({
  type,
  onClick,
  isInvalid,
  className,
}: BooleanConnectorProps) {
  const baseStyles = cn(
    "inline-flex items-center px-1.5 text-xs font-medium select-none",
    type === "OR" ? "text-primary font-semibold" : "text-muted-foreground",
    isInvalid && "text-destructive",
    className,
  );

  if (onClick) {
    const tooltipText =
      type === "AND" ? "Click to change to OR" : "Click to change to AND";

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(baseStyles, "cursor-pointer rounded hover:bg-muted")}
            onClick={onClick}
            aria-label={tooltipText}
          >
            {type}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <span className={baseStyles}>
      {type}
    </span>
  );
}
