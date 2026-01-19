import { useEffect, useMemo, useRef, useState } from "react";
import { InfraScene } from "./components/InfraScene";
import { ComponentPanel } from "./ui/ComponentPanel";
import { Controls } from "./ui/Controls";
import { Dashboard } from "./ui/Dashboard";
import {
  ComponentKey,
  COMPONENTS,
  SimState,
  createInitialState,
  computeMetrics,
  tickSim
} from "./sim";
import { Connection, PortRef, PortType } from "./types/connections";

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
  const [tickMs, setTickMs] = useState(1000);
  const [isPaused, setIsPaused] = useState(false);
  const [costOverride, setCostOverride] = useState<number | null>(null);
  const [pendingPort, setPendingPort] = useState<PortRef | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const tickMsRef = useRef(tickMs);
  const pausedRef = useRef(isPaused);
  const costOverrideRef = useRef(costOverride);

  useEffect(() => {
    tickMsRef.current = tickMs;
  }, [tickMs]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    costOverrideRef.current = costOverride;
  }, [costOverride]);

  useEffect(() => {
    let frameId = 0;
    let lastTime = performance.now();
    let accumulated = 0;

    const step = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (!pausedRef.current) {
        accumulated += delta;
        const currentTickMs = tickMsRef.current;
        if (currentTickMs > 0) {
          while (accumulated >= currentTickMs) {
            accumulated -= currentTickMs;
            setState((prev) => tickSim(prev, costOverrideRef.current));
          }
        }
      } else {
        accumulated = 0;
      }

      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameId);
  }, []);

  const metrics = useMemo(() => computeMetrics(state, costOverride), [state, costOverride]);

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

  const handleTickMsChange = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    setTickMs(Math.max(1, value));
  };

  const handleCostOverrideChange = (value: number | null) => {
    if (value !== null && !Number.isFinite(value)) return;
    setCostOverride(value);
  };

  const handlePortClick = (key: ComponentKey, port: PortType) => {
    setPendingPort((prevPending) => {
      if (!prevPending) return { key, port };
      if (prevPending.key === key && prevPending.port === port) return null;
      setConnections((prevConnections) => [
        ...prevConnections,
        { from: prevPending, to: { key, port } }
      ]);
      return null;
    });
  };

  const pendingConnectionLabel = pendingPort
    ? `${COMPONENTS[pendingPort.key].name} (${pendingPort.port})`
    : null;

  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <InfraScene
        metrics={metrics}
        selected={selected}
        onSelect={setSelected}
        cacheEnabled={state.cacheEnabled}
        queueEnabled={state.queueEnabled}
        appInstances={state.appInstances}
        connections={connections}
        pendingPort={pendingPort}
        onPortClick={handlePortClick}
      />

      <div className="ui-overlay">
        <div className="top-left">
          <Dashboard
            metrics={metrics}
            tickMs={tickMs}
            onTickMsChange={handleTickMsChange}
            costOverride={costOverride}
            onCostOverrideChange={handleCostOverrideChange}
            onSetCostOverrideZero={() => setCostOverride(0)}
          />
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
            onTogglePause={() => setIsPaused((prev) => !prev)}
            cacheEnabled={state.cacheEnabled}
            queueEnabled={state.queueEnabled}
            isPaused={isPaused}
            scaleCost={SCALE_COST}
            lbUpgradeCost={LB_UPGRADE_COST}
            dbUpgradeCost={DB_UPGRADE_COST}
            pendingConnectionLabel={pendingConnectionLabel}
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
            Tick every {tickMs} ms · Timeout {state.timeoutMs} ms · Revenue per request ${
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
