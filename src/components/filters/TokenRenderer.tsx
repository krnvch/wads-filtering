"use client";

import type { Token, TokenFilterOperator } from "@/types/tokens";
import { FilterChip } from "./FilterChip";
import { ConnectorChip } from "./ConnectorChip";
import { ParenChip } from "./ParenChip";
import { TokenErrorIndicator } from "./TokenErrorIndicator";
import { getFieldByKey } from "@/lib/filter-schema";
import type { FilterOperator } from "@/types/filters";

interface TokenRendererProps {
  token: Token;
  onRemoveToken: (id: string) => void;
  onUpdateValues: (id: string, values: string[]) => void;
  onUpdateOperator: (id: string, operator: TokenFilterOperator) => void;
  onToggleConnector: (id: string) => void;
  textSuggestions?: Record<string, string[]>;
}

export function TokenRenderer({
  token,
  onRemoveToken,
  onUpdateValues,
  onUpdateOperator,
  onToggleConnector,
  textSuggestions,
}: TokenRendererProps) {
  switch (token.type) {
    case "filter_chip": {
      const fieldDef = getFieldByKey(token.field);
      if (!fieldDef) return null;

      const chipContent = (
        <FilterChip
          condition={{
            id: token.id,
            field: token.field,
            fieldLabel: token.fieldLabel,
            operator: token.operator as FilterOperator,
            values: token.values,
          }}
          fieldDef={fieldDef}
          onRemove={onRemoveToken}
          onUpdateValues={onUpdateValues}
          onUpdateOperator={(id, op) =>
            onUpdateOperator(id, op as TokenFilterOperator)
          }
          suggestions={textSuggestions?.[token.field]}
          error={token.error}
        />
      );

      if (token.error) {
        return (
          <TokenErrorIndicator error={token.error}>
            {chipContent}
          </TokenErrorIndicator>
        );
      }

      return chipContent;
    }

    case "and":
    case "or":
      return (
        <ConnectorChip
          token={token}
          onRemove={onRemoveToken}
          onToggle={onToggleConnector}
        />
      );

    case "open_paren":
    case "close_paren":
      return <ParenChip token={token} onRemove={onRemoveToken} />;

    default:
      return null;
  }
}
