"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TokenError } from "@/types/tokens";
import { cn } from "@/lib/utils";

interface TokenErrorIndicatorProps {
  error?: TokenError;
  children: React.ReactNode;
  className?: string;
}

export function TokenErrorIndicator({
  error,
  children,
  className,
}: TokenErrorIndicatorProps) {
  if (!error) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "rounded-sm ring-1 ring-destructive ring-offset-1 ring-offset-background",
            className,
          )}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="text-xs text-destructive-foreground"
      >
        {error.message}
      </TooltipContent>
    </Tooltip>
  );
}
