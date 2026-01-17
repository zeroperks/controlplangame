import { ComponentKey, ComponentStatus, formatNumber } from "../sim";

interface ComponentPanelProps {
  selected: ComponentKey | null;
  status?: ComponentStatus;
  onScaleApp: () => void;
  onUpgradeLb: () => void;
  onUpgradeDb: () => void;
  onToggleCache: () => void;
  onToggleQueue: () => void;
  cacheEnabled: boolean;
  queueEnabled: boolean;
}

export const ComponentPanel = ({
  selected,
  status,
  onScaleApp,
  onUpgradeLb,
  onUpgradeDb,
  onToggleCache,
  onToggleQueue,
  cacheEnabled,
  queueEnabled
}: ComponentPanelProps) => {
  if (!selected || !status) return null;

  const actions: Record<ComponentKey, JSX.Element | null> = {
    lb: <button onClick={onUpgradeLb}>Upgrade LB Capacity</button>,
    app: <button onClick={onScaleApp}>Scale App +1</button>,
    db: <button onClick={onUpgradeDb}>Upgrade DB Capacity</button>,
    cache: <button onClick={onToggleCache}>{cacheEnabled ? "Disable" : "Enable"} Cache</button>,
    queue: <button onClick={onToggleQueue}>{queueEnabled ? "Disable" : "Enable"} Queue</button>
  };

  return (
    <div className="panel">
      <h3>{selected.toUpperCase()} Node</h3>
      <div className="stat-grid">
        <div>
          <div className="stat-label">Capacity</div>
          <div>{formatNumber(status.capacity)} RPS</div>
        </div>
        <div>
          <div className="stat-label">Load</div>
          <div>{formatNumber(status.load)} RPS</div>
        </div>
        <div>
          <div className="stat-label">Utilization</div>
          <div>{Math.round(status.utilization * 100)}%</div>
        </div>
        <div>
          <div className="stat-label">Base Latency</div>
          <div>{status.latency} ms</div>
        </div>
      </div>
      <div className="button-row">{actions[selected]}</div>
    </div>
  );
};
