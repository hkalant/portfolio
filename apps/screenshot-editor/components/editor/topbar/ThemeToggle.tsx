"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/hooks/useTheme";
import {
  nextThemePreference,
  THEME_LABELS,
  type ThemePreference,
} from "@/lib/theme";

const ICONS: Record<ThemePreference, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

/** Cycles the interface theme: System, Light, Dark. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const Icon = ICONS[preference];
  const label = `Theme: ${THEME_LABELS[preference]}`;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setPreference(nextThemePreference(preference))}
      aria-label={label}
      title={label}
    >
      <Icon aria-hidden />
    </Button>
  );
}
