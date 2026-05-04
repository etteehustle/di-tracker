import { Activity, BarChart3 } from "lucide-react";
import { environment } from "../../environment";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

type RoadmapProps = {
  onReset: () => void;
};

export function Roadmap({ onReset }: RoadmapProps) {
  return (
    <section className="panel roadmap">
      <h2>Phase Memory</h2>
      <div className="phase-list">
        <Card className="roadmap-item">
          <Activity />
          <strong>Phase 1 in this build</strong>
          <p>
            Domain model, mock persistence, dashboard, active/history orders, create order, settle order, ledger entries,
            cost basis lots, pockets, deposits, merge flow, portfolio overview, audit log, forecast settled/blended,
            order evaluation, responsive shell.
          </p>
        </Card>
        <Card className="roadmap-item">
          <BarChart3 />
          <strong>Phase 2 backlog</strong>
          <p>
            Supabase/Postgres repository, auth optional, advanced analytics charts, CSV export, richer filters/sorts,
            edit settled order modal, manual portfolio adjustment form, forecast detail page, PWA and deploy hardening.
          </p>
        </Card>
      </div>
      <Button variant="destructive" onClick={onReset}>
        Reset local {environment.mock.enabled ? "mock data" : "data"}
      </Button>
    </section>
  );
}
