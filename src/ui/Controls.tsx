import { formatMoney } from "../sim";

interface ControlsProps {
  incomingRps: number;
  cash: number;
  onIncomingChange: (value: number) => void;
  onScaleApp: () => void;
  onUpgradeLb: () => void;
  onUpgradeDb: () => void;
  onToggleCache: () => void;
  onToggleQueue: () => void;
  cacheEnabled: boolean;
  queueEnabled: boolean;
  scaleCost: number;
  lbUpgradeCost: number;
  dbUpgradeCost: number;
}

export const Controls = ({
  incomingRps,
  cash,
  onIncomingChange,
  onScaleApp,
  onUpgradeLb,
  onUpgradeDb,
  onToggleCache,
  onToggleQueue,
  cacheEnabled,
  queueEnabled,
  scaleCost,
  lbUpgradeCost,
  dbUpgradeCost
}: ControlsProps) => {
  return (
    <div className="panel">
      <h3>Operations Console</h3>
      <div className="small">Demand Generator</div>
      <input
        className="slider"
        type="range"
        min={200}
        max={4000}
        step={100}
        value={incomingRps}
        onChange={(event) => onIncomingChange(Number(event.target.value))}
      />
      <div className="small">{incomingRps} RPS</div>

      <div className="button-row">
        <button onClick={onScaleApp} disabled={cash < scaleCost}>
          Scale App (+1) · {formatMoney(scaleCost)}
        </button>
        <button onClick={onUpgradeLb} disabled={cash < lbUpgradeCost}>
          Upgrade LB · {formatMoney(lbUpgradeCost)}
        </button>
        <button onClick={onUpgradeDb} disabled={cash < dbUpgradeCost}>
          Upgrade DB · {formatMoney(dbUpgradeCost)}
        </button>
      </div>

      <div className="button-row">
        <button onClick={onToggleCache}>{cacheEnabled ? "Disable" : "Unlock"} Cache</button>
        <button onClick={onToggleQueue}>{queueEnabled ? "Disable" : "Unlock"} Queue</button>
      </div>
    </div>
  );
};
