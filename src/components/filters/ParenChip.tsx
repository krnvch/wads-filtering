"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { OpenParenToken, CloseParenToken } from "@/types/tokens";
import { cn } from "@/lib/utils";

interface ParenChipProps {
  token: OpenParenToken | CloseParenToken;
  onRemove: (id: string) => void;
  className?: string;
}

export function ParenChip({ token, onRemove, className }: ParenChipProps) {
  const char = token.type === "open_paren" ? "(" : ")";
  const hasError = !!token.error;

  const paren = (
    <Badge
      variant="secondary"
      tabIndex={0}
      role="listitem"
      data-token-id={token.id}
      aria-label={`${token.type === "open_paren" ? "Open" : "Close"} parenthesis`}
      className={cn(
        "group cursor-default select-none gap-1 rounded-md px-2 py-1 text-sm font-normal text-muted-foreground",
        hasError && "border-destructive text-destructive",
        className,
      )}
      onKeyDown={(e) => {
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          onRemove(token.id);
        }
      }}
    >
      {char}
      <button
        type="button"
        onClick={() => onRemove(token.id)}
        className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        aria-label={`Remove ${token.type === "open_paren" ? "opening" : "closing"} parenthesis`}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );

  if (hasError) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{paren}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="text-xs text-destructive-foreground"
        >
          {token.error!.message}
        </TooltipContent>
      </Tooltip>
    );
  }

  return paren;
}
