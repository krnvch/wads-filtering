"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AndToken, OrToken, TokenError } from "@/types/tokens";
import { cn } from "@/lib/utils";

interface ConnectorChipProps {
  token: AndToken | OrToken;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  className?: string;
}

export function ConnectorChip({
  token,
  onRemove,
  onToggle,
  className,
}: ConnectorChipProps) {
  const label = token.type === "and" ? "AND" : "OR";
  const toggleTarget = token.type === "and" ? "OR" : "AND";
  const hasError = !!token.error;

  const chip = (
    <Badge
      variant="outline"
      tabIndex={0}
      role="listitem"
      data-token-id={token.id}
      aria-label={`${label} connector`}
      className={cn(
        "group cursor-pointer select-none gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors hover:bg-muted",
        token.type === "or" && "text-primary font-semibold",
        token.type === "and" && "text-muted-foreground",
        hasError && "border-destructive text-destructive",
        className,
      )}
      onClick={() => onToggle(token.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(token.id);
        }
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          onRemove(token.id);
        }
      }}
    >
      {label}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(token.id);
        }}
        className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        aria-label={`Remove ${label} connector`}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );

  if (hasError) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{chip}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="text-xs text-destructive-foreground"
        >
          {token.error!.message}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Click to change to {toggleTarget}
      </TooltipContent>
    </Tooltip>
  );
}
