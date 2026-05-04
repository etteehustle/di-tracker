import { Activity, BarChart3 } from "lucide-react";
import { environment } from "../../environment";

type RoadmapProps = {
  onReset: () => void;
};

export function Roadmap({ onReset }: RoadmapProps) {
  return (
    <section className="panel roadmap">
      <h2>Phase Memory</h2>
      <div className="phase-list">
        <article>
          <Activity />
          <strong>Phase 1 in this build</strong>
          <p>
            Domain model, mock persistence, dashboard, active/history orders, create order, settle order, ledger entries,
            cost basis lots, pockets, deposits, merge flow, portfolio overview, audit log, forecast settled/blended,
            order evaluation, responsive shell.
          </p>
        </article>
        <article>
          <BarChart3 />
          <strong>Phase 2 backlog</strong>
          <p>
            Supabase/Postgres repository, auth optional, advanced analytics charts, CSV export, richer filters/sorts,
            edit settled order modal, manual portfolio adjustment form, forecast detail page, PWA and deploy hardening.
          </p>
        </article>
      </div>
      <button className="danger" onClick={onReset}>
        Reset local {environment.mock.enabled ? "mock data" : "data"}
      </button>
    </section>
  );
}
