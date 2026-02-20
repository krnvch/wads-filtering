"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FILTER_FIELDS } from "@/lib/filter-schema";
import type { FilterFieldDef } from "@/types/filters";

interface FilterPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectField: (field: FilterFieldDef) => void;
  children: React.ReactNode;
}

const attackFields = FILTER_FIELDS.filter(
  (f) => f.category === "Attack characteristics",
);
const targetFields = FILTER_FIELDS.filter(
  (f) => f.category === "Target & Context",
);

export function FilterPalette({
  open,
  onOpenChange,
  onSelectField,
  children,
}: FilterPaletteProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align="start"
      >
        <Command>
          <CommandList>
            <CommandGroup heading="Attack characteristics">
              {attackFields.map((field) => (
                <CommandItem
                  key={field.key}
                  value={field.key}
                  onSelect={() => {
                    onSelectField(field);
                  }}
                >
                  {field.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Target & Context">
              {targetFields.map((field) => (
                <CommandItem
                  key={field.key}
                  value={field.key}
                  onSelect={() => {
                    onSelectField(field);
                  }}
                >
                  {field.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
