"use client";

import { Palette, SlidersHorizontal } from "lucide-react";
import { Tabs } from "radix-ui";
import type { PanelId } from "@/lib/store/editor";
import { useEditorStore } from "@/lib/store/editor";
import { BackgroundPanel } from "./panels/BackgroundPanel";
import { StylePanel } from "./panels/StylePanel";

const TOOLS: readonly { id: PanelId; label: string; icon: typeof Palette }[] = [
  { id: "background", label: "Background", icon: Palette },
  { id: "style", label: "Style", icon: SlidersHorizontal },
];

/** The icon rail and the settings panel for the selected tool. */
export function ToolRail() {
  const activePanel = useEditorStore((state) => state.activePanel);
  const setActivePanel = useEditorStore((state) => state.setActivePanel);

  return (
    <Tabs.Root
      value={activePanel}
      onValueChange={(value) => setActivePanel(value as PanelId)}
      orientation="vertical"
      className="flex min-h-0 shrink-0"
    >
      <Tabs.List
        aria-label="Tools"
        className="flex w-20 flex-col items-center gap-1 border-r bg-background py-3"
      >
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <Tabs.Trigger
            key={id}
            value={id}
            className="flex w-16 flex-col items-center gap-1 rounded-lg py-2 text-[11px] text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=active]:bg-accent data-[state=active]:text-foreground"
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <div className="w-80 overflow-y-auto border-r bg-background">
        {TOOLS.map(({ id, label }) => (
          <Tabs.Content key={id} value={id} className="p-5 outline-none">
            <h2 className="mb-5 text-sm font-semibold">{label}</h2>
            {id === "background" ? <BackgroundPanel /> : <StylePanel />}
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  );
}
