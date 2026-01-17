import { formatMoney, formatNumber, formatPercent, SimMetrics } from "../sim";

interface DashboardProps {
  metrics: SimMetrics;
}

export const Dashboard = ({ metrics }: DashboardProps) => {
  return (
    <div className="panel">
      <h3>Infra Snapshot · Tick {metrics.tick}</h3>
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
