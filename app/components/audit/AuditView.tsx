import { dateTime } from "../../lib/domain/format";
import type { AppState } from "../../lib/domain/types";
import { Card } from "../ui/Card";

type AuditViewProps = {
  state: AppState;
};

export function AuditView({ state }: AuditViewProps) {
  return (
    <section className="panel">
      <h2>Audit Log</h2>
      <div className="audit-list">
        {state.auditLogs.map((log) => (
          <Card className="audit-entry" key={log.id}>
            <strong>{log.action}</strong>
            <span>{log.entityType} - {dateTime(log.createdAt)}</span>
            <p>{log.reason}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
