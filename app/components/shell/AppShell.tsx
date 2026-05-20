import {
  Archive,
  BarChart3,
  BookOpen,
  Coins,
  Gauge,
  LayoutDashboard,
  RefreshCcw,
  Split,
  WalletCards
} from "lucide-react";
import type { ReactNode } from "react";
import type { Tab } from "../../lib/view-models";
import { Button } from "@/components/ui/button";

const tabs: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "orders", label: "Orders", icon: <BookOpen size={18} /> },
  { id: "pockets", label: "Pockets", icon: <Split size={18} /> },
  { id: "portfolio", label: "Portfolio", icon: <WalletCards size={18} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
  { id: "audit", label: "Audit", icon: <Archive size={18} /> },
  { id: "plan", label: "Roadmap", icon: <Gauge size={18} /> }
];

type AppShellProps = {
  activeTab: Tab;
  priceStatus: string;
  onTabChange: (tab: Tab) => void;
  onRefreshPrices: () => void;
  children: ReactNode;
};

export function AppShell({ activeTab, priceStatus, onTabChange, onRefreshPrices, children }: AppShellProps) {
  const activeLabel = tabs.find((item) => item.id === activeTab)?.label ?? "Dashboard";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Coins />
          <div>
            <strong>DI Tracker</strong>
            <span>Crypto operating ledger</span>
          </div>
        </div>
        <nav>
          {tabs.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="nav-button"
              data-active={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Base currency: USDT - Timezone UTC+7</p>
            <h1>{activeLabel}</h1>
          </div>
          <div className="toolbar">
            <span className="price-status">{priceStatus}</span>
            <Button variant="outline" size="icon" title="Refresh prices" onClick={onRefreshPrices}>
              <RefreshCcw size={18} />
            </Button>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
