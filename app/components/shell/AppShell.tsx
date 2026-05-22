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
import { environment } from "../../environment";
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
  syncStatus?: string;
  userEmail?: string;
  onTabChange: (tab: Tab) => void;
  onRefreshPrices: () => void;
  onSignOut?: () => void;
  children: ReactNode;
};

export function AppShell({
  activeTab,
  priceStatus,
  syncStatus,
  userEmail,
  onTabChange,
  onRefreshPrices,
  onSignOut,
  children
}: AppShellProps) {
  const visibleTabs = tabs.filter((item) => item.id !== "plan" || environment.features.roadmap);
  const activeLabel = visibleTabs.find((item) => item.id === activeTab)?.label ?? "Dashboard";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Coins />
          <div>
            <strong>DI Tracker</strong>
            <span>Dual Investment ledger</span>
          </div>
        </div>
        <nav aria-label="Primary navigation">
          {visibleTabs.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="nav-button"
              aria-label={item.label}
              data-active={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </Button>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Base currency USDT · UTC+7 · ledger-backed DI accounting</p>
            <h1>{activeLabel}</h1>
          </div>
          <div className="toolbar">
            <span className="price-status">{priceStatus}</span>
            {syncStatus && <span className="sync-status">{syncStatus}</span>}
            <Button variant="outline" size="icon" title="Refresh prices" onClick={onRefreshPrices}>
              <RefreshCcw size={18} />
            </Button>
            {userEmail && onSignOut && (
              <Button variant="secondary" title={userEmail} onClick={onSignOut}>
                Sign out
              </Button>
            )}
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
