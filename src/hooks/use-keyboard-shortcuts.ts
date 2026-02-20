"use client";

import { useEffect } from "react";

export interface KeyboardShortcut {
  key: string;
  modifiers?: { shift?: boolean; meta?: boolean; ctrl?: boolean };
  handler: () => void;
  enabled?: boolean;
}

const INPUT_ELEMENTS = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
]);

const INPUT_ROLES = new Set([
  "textbox",
  "combobox",
]);

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;

  if (INPUT_ELEMENTS.has(el.tagName)) return true;
  if (
    (el as HTMLElement).isContentEditable ||
    (el as HTMLElement).contentEditable === "true"
  ) return true;

  const role = el.getAttribute("role");
  if (role && INPUT_ROLES.has(role)) return true;

  return false;
}

function matchesModifiers(
  e: KeyboardEvent,
  modifiers?: KeyboardShortcut["modifiers"],
): boolean {
  const shift = modifiers?.shift ?? false;
  const meta = modifiers?.meta ?? false;
  const ctrl = modifiers?.ctrl ?? false;

  if (e.shiftKey !== shift) return false;
  if (e.metaKey !== meta) return false;
  if (e.ctrlKey !== ctrl) return false;

  return true;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) return;

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          matchesModifiers(e, shortcut.modifiers)
        ) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
