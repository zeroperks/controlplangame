import { formatMoney, formatNumber, formatPercent, SimMetrics } from "../sim";

interface DashboardProps {
  metrics: SimMetrics;
  tickMs: number;
  onTickMsChange: (value: number) => void;
  costOverride: number | null;
  onCostOverrideChange: (value: number | null) => void;
  onSetCostOverrideZero: () => void;
}

export const Dashboard = ({
  metrics,
  tickMs,
  onTickMsChange,
  costOverride,
  onCostOverrideChange,
  onSetCostOverrideZero
}: DashboardProps) => {
  return (
    <div className="panel">
      <h3>Infra Snapshot · Tick {metrics.tick}</h3>
      <div style={{ marginBottom: 12, display: "grid", gap: 8 }}>
        <label className="small" style={{ display: "grid", gap: 4 }}>
          Tick ms
          <input
            type="number"
            min={50}
            step={50}
            value={tickMs}
            onChange={(event) => onTickMsChange(Number(event.target.value))}
          />
        </label>
        <label className="small" style={{ display: "grid", gap: 4 }}>
          Cost / tick override
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="number"
              step={1}
              value={costOverride ?? ""}
              onChange={(event) =>
                onCostOverrideChange(event.target.value === "" ? null : Number(event.target.value))
              }
            />
            <button type="button" onClick={onSetCostOverrideZero}>
              Set to 0
            </button>
          </div>
        </label>
      </div>
      <div className="stat-grid">
        <div>
          <div className="stat-label">Incoming RPS</div>
          <div>{formatNumber(metrics.incomingRps)}</div>
        </div>
        <div>
          <div className="stat-label">Served RPS</div>
          <div>{formatNumber(metrics.servedRps)}</div>
        </div>
        <div>
          <div className="stat-label">Error Rate</div>
          <div>{formatPercent(metrics.errorRate)}</div>
        </div>
        <div>
          <div className="stat-label">p95 Latency</div>
          <div>{metrics.p95Latency.toFixed(0)} ms</div>
        </div>
        <div>
          <div className="stat-label">Cost / tick</div>
          <div>{formatMoney(metrics.costPerTick)}</div>
        </div>
        <div>
          <div className="stat-label">Revenue / tick</div>
          <div>{formatMoney(metrics.revenuePerTick)}</div>
        </div>
        <div>
          <div className="stat-label">Cash</div>
          <div>{formatMoney(metrics.cash)}</div>
        </div>
        <div>
          <div className="stat-label">Queue Backlog</div>
          <div>{formatNumber(metrics.backlog)}</div>
        </div>
      </div>
      {metrics.warning && (
        <div style={{ marginTop: 10 }} className="warning">
          {metrics.warning}
        </div>
      )}
    </div>
  );
};
