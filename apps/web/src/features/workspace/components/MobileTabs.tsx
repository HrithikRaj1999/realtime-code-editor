import { Code2, MessageSquare, SquareTerminal } from "lucide-react";
import type { ComponentType } from "react";
import type { MobileTab } from "../types";

interface MobileTabsProps {
  activeTab: MobileTab;
  onChange: (tab: MobileTab) => void;
}

const tabs: Array<{ id: MobileTab; label: string; icon: ComponentType<{ className?: string }> }> =
  [
    { id: "code", label: "code", icon: Code2 },
    { id: "console", label: "console", icon: SquareTerminal },
    { id: "chat", label: "chat", icon: MessageSquare },
  ];

export function MobileTabs({ activeTab, onChange }: MobileTabsProps) {
  return (
    <div className="flex lg:hidden border-b border-[var(--border)] bg-[var(--bg-secondary)] theme-transition">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border-b-2 ${
              active
                ? "text-[var(--accent)] border-[var(--accent)] bg-[var(--bg-badge)]"
                : "text-[var(--text-faint)] border-transparent hover:text-[var(--text-muted)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
