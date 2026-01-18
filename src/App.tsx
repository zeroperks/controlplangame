import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, KeyboardControlsEntry } from "@react-three/drei";
import { OfficeScene } from "./Scene";
import { CharacterControl } from "./Player";
import { ComponentPanel } from "./ui/ComponentPanel";
import { Controls } from "./ui/Controls";
import { Dashboard } from "./ui/Dashboard";
import { InfraScene } from "./components/InfraScene";
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
const COMPONENT_KEYS: ComponentKey[] = ["lb", "app", "db", "cache", "queue"];

const KEYBOARD_MAP: KeyboardControlsEntry<CharacterControl>[] = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "backward", keys: ["KeyS", "ArrowDown"] },
  { name: "left", keys: ["KeyA", "ArrowLeft"] },
  { name: "right", keys: ["KeyD", "ArrowRight"] }
];

const applyCost = (state: SimState, cost: number) => ({
  ...state,
  cash: state.cash - cost
});

export default function App() {
  const [state, setState] = useState<SimState>(() => createInitialState());
  const [selected, setSelected] = useState<ComponentKey | null>("lb");
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

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

  const handleOpenTerminal = () => setIsTerminalOpen(true);
  const handleCloseTerminal = () => setIsTerminalOpen(false);

  const officeView = (
    <div className="app-shell">
      <Canvas
        shadows
        camera={{ position: [-6, 6, 8], fov: 45, near: 0.1, far: 80 }}
        dpr={[1, 1.75]}
      >
        <Suspense fallback={null}>
          <OfficeScene isTerminalOpen={isTerminalOpen} onComputerInteract={handleOpenTerminal} />
        </Suspense>
      </Canvas>

      <div className="ui-overlay">
        <div className="scene-hint panel">
          <h3>Distributed Systems Tycoon</h3>
          <div className="small">
            Walk with WASD, drift toward the glowing workstation, then click the monitor to enter
            the terminal.
          </div>
        </div>
      </div>
    </div>
  );

  const terminalView = (
    <div className="app-shell terminal-mode">
      <InfraScene
        metrics={metrics}
        selected={selected}
        onSelect={(key) => setSelected(key)}
        cacheEnabled={state.cacheEnabled}
        queueEnabled={state.queueEnabled}
        appInstances={state.appInstances}
      />
      <div className="ui-overlay">
        <div className="top-center">
          <button onClick={handleCloseTerminal}>Leave Terminal</button>
        </div>
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
          <div className="panel component-tabs">
            <div className="stat-label small">Focus component</div>
            <div className="tab-row">
              {COMPONENT_KEYS.map((key) => (
                <button
                  key={key}
                  className={key === selected ? "tab active" : "tab"}
                  onClick={() => setSelected(key)}
                >
                  {key.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
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
            Tick every 1s | Timeout {state.timeoutMs} ms | Revenue per request ${state.revenuePerReq}
          </div>
          <div style={{ marginTop: 8 }} className="small">
            Tip: click buildings to see stats and scale. Unlock cache to offload DB, queue to smooth
            spikes.
          </div>
        </div>
      </div>
    </div>
  );

  return <KeyboardControls map={KEYBOARD_MAP}>{isTerminalOpen ? terminalView : officeView}</KeyboardControls>;
}
