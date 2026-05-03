import { dateTime } from "../../lib/domain/format";
import type { AppState } from "../../lib/domain/types";

type AuditViewProps = {
  state: AppState;
};

export function AuditView({ state }: AuditViewProps) {
  return (
    <section className="panel">
      <h2>Audit Log</h2>
      <div className="audit-list">
        {state.auditLogs.map((log) => (
          <article key={log.id}>
            <strong>{log.action}</strong>
            <span>{log.entityType} - {dateTime(log.createdAt)}</span>
            <p>{log.reason}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
