"use client";

import { Tabs } from "radix-ui";
import type { PanelId } from "@/lib/store/editor";
import { useEditorStore } from "@/lib/store/editor";
import { PANELS } from "./panels/registry";

/** The icon rail and the settings panel for the selected tool (desktop layout). */
export function ToolRail() {
  const activePanel = useEditorStore((state) => state.activePanel);
  const setActivePanel = useEditorStore((state) => state.setActivePanel);

  return (
    <Tabs.Root
      value={activePanel}
      onValueChange={(value) => setActivePanel(value as PanelId)}
      orientation="vertical"
      className="flex min-h-0 shrink-0 gap-2"
    >
      <Tabs.List
        aria-label="Tools"
        className="flex w-20 flex-col items-center gap-1 rounded-xl glass py-2"
      >
        {PANELS.map(({ id, label, icon: Icon }) => (
          <Tabs.Trigger
            key={id}
            value={id}
            className="flex w-16 flex-col items-center gap-1 rounded-lg py-2 text-[11px] text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=active]:bg-selected data-[state=active]:font-semibold data-[state=active]:text-selected-foreground data-[state=active]:sheen"
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <div className="w-72 overflow-y-auto rounded-xl glass lg:w-80">
        {PANELS.map(({ id, label, Component }) => (
          <Tabs.Content
            key={id}
            value={id}
            tabIndex={-1}
            className="p-5 outline-none"
          >
            <h2 className="mb-5 text-sm font-semibold">{label}</h2>
            <Component />
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  );
}
