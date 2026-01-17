import { useEffect, useMemo, useState } from "react";
import { InfraScene } from "./components/InfraScene";
import { ComponentPanel } from "./ui/ComponentPanel";
import { Controls } from "./ui/Controls";
import { Dashboard } from "./ui/Dashboard";
import {
  ComponentKey,
  SimState,
  createInitialState,
  computeMetrics,
  tickSim
} from "./sim";

const SCALE_COST = 120;
const LB_UPGRADE_COST = 180;
const DB_UPGRADE_COST = 160;
const CACHE_UNLOCK_COST = 140;
const QUEUE_UNLOCK_COST = 140;

const applyCost = (state: SimState, cost: number) => ({
  ...state,
  cash: state.cash - cost
});

export default function App() {
  const [state, setState] = useState<SimState>(() => createInitialState());
  const [selected, setSelected] = useState<ComponentKey | null>("lb");

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => tickSim(prev));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => computeMetrics(state), [state]);

  const handleScaleApp = () => {
    if (state.cash < SCALE_COST) return;
    setState((prev) => ({
      ...applyCost(prev, SCALE_COST),
      appInstances: prev.appInstances + 1
    }));
  };

  const handleUpgradeLb = () => {
    if (state.cash < LB_UPGRADE_COST) return;
    setState((prev) => ({
      ...applyCost(prev, LB_UPGRADE_COST),
      lbUpgrade: prev.lbUpgrade + 1
    }));
  };

  const handleUpgradeDb = () => {
    if (state.cash < DB_UPGRADE_COST) return;
    setState((prev) => ({
      ...applyCost(prev, DB_UPGRADE_COST),
      dbUpgrade: prev.dbUpgrade + 1
    }));
  };

  const handleToggleCache = () => {
    if (!state.cacheEnabled && state.cash < CACHE_UNLOCK_COST) return;
    setState((prev) => ({
      ...prev,
      ...(prev.cacheEnabled ? {} : applyCost(prev, CACHE_UNLOCK_COST)),
      cacheEnabled: !prev.cacheEnabled
    }));
  };

  const handleToggleQueue = () => {
    if (!state.queueEnabled && state.cash < QUEUE_UNLOCK_COST) return;
    setState((prev) => ({
      ...prev,
      ...(prev.queueEnabled ? {} : applyCost(prev, QUEUE_UNLOCK_COST)),
      queueEnabled: !prev.queueEnabled
    }));
  };

  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <InfraScene
        metrics={metrics}
        selected={selected}
        onSelect={setSelected}
        cacheEnabled={state.cacheEnabled}
        queueEnabled={state.queueEnabled}
        appInstances={state.appInstances}
      />

      <div className="ui-overlay">
        <div className="top-left">
          <Dashboard metrics={metrics} />
        </div>
        <div className="top-right">
          <Controls
            incomingRps={state.incomingRps}
            cash={state.cash}
            onIncomingChange={(value) => setState((prev) => ({ ...prev, incomingRps: value }))}
            onScaleApp={handleScaleApp}
            onUpgradeLb={handleUpgradeLb}
            onUpgradeDb={handleUpgradeDb}
            onToggleCache={handleToggleCache}
            onToggleQueue={handleToggleQueue}
            cacheEnabled={state.cacheEnabled}
            queueEnabled={state.queueEnabled}
            scaleCost={SCALE_COST}
            lbUpgradeCost={LB_UPGRADE_COST}
            dbUpgradeCost={DB_UPGRADE_COST}
          />
        </div>
        <div className="bottom-left">
          <ComponentPanel
            selected={selected}
            status={selected ? metrics.components[selected] : undefined}
            onScaleApp={handleScaleApp}
            onUpgradeLb={handleUpgradeLb}
            onUpgradeDb={handleUpgradeDb}
            onToggleCache={handleToggleCache}
            onToggleQueue={handleToggleQueue}
            cacheEnabled={state.cacheEnabled}
            queueEnabled={state.queueEnabled}
          />
        </div>
        <div className="bottom-right panel">
          <h3>Live Status</h3>
          <div className="small">
            Tick every 1s · Timeout {state.timeoutMs} ms · Revenue per request ${
              state.revenuePerReq
            }
          </div>
          <div style={{ marginTop: 8 }} className="small">
            Tip: click buildings to see stats and scale. Unlock cache to offload DB, queue to
            smooth spikes.
          </div>
        </div>
      </div>
    </div>
  );
}
