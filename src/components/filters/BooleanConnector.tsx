import { cn } from "@/lib/utils";

interface BooleanConnectorProps {
  type: "AND" | "OR";
  className?: string;
}

export function BooleanConnector({ type, className }: BooleanConnectorProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 text-xs font-medium text-muted-foreground select-none",
        className,
      )}
    >
      {type}
    </span>
  );
}
