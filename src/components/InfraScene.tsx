import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { Color } from "three";
import { COMPONENTS, ComponentKey, SimMetrics } from "../sim";
import { Connection, PortRef, PortType } from "../types/connections";
import { Building } from "./Building";
import { Link } from "./Link";

interface InfraSceneProps {
  metrics: SimMetrics;
  selected: ComponentKey | null;
  onSelect: (key: ComponentKey) => void;
  cacheEnabled: boolean;
  queueEnabled: boolean;
  appInstances: number;
  connections: Connection[];
  pendingPort: PortRef | null;
  onPortClick: (key: ComponentKey, port: PortType) => void;
}

export const InfraScene = ({
  metrics,
  selected,
  onSelect,
  cacheEnabled,
  queueEnabled,
  appInstances,
  connections,
  pendingPort,
  onPortClick
}: InfraSceneProps) => {
  const positions = useMemo(
    () => ({
      lb: [-5, 0, 0] as [number, number, number],
      app: [-1, 0, 0] as [number, number, number],
      db: [4, 0, 0] as [number, number, number],
      cache: [1.5, 0, -3] as [number, number, number],
      queue: [1.5, 0, 3] as [number, number, number]
    }),
    []
  );

  const portOffsets: Record<PortType, [number, number, number]> = {
    in: [0, -0.2, 0.95],
    out: [0, -0.2, -0.95]
  };

  const componentActive: Record<ComponentKey, boolean> = {
    lb: true,
    app: true,
    db: true,
    cache: cacheEnabled,
    queue: queueEnabled
  };

  const getPortPosition = (key: ComponentKey, port: PortType) => {
    const [x, y, z] = positions[key];
    const [ox, oy, oz] = portOffsets[port];
    return [x + ox, y + oy, z + oz] as [number, number, number];
  };

  const getFlowForConnection = (from: ComponentKey, to: ComponentKey) => {
    const pair = `${from}-${to}`;
    switch (pair) {
      case "lb-app":
      case "app-lb":
        return metrics.linkFlows.lbToApp;
      case "app-db":
      case "db-app":
        return metrics.linkFlows.appToDb;
      case "app-cache":
      case "cache-app":
        return metrics.linkFlows.appToCache;
      case "cache-db":
      case "db-cache":
        return metrics.linkFlows.cacheToDb;
      case "app-queue":
      case "queue-app":
        return metrics.linkFlows.appToQueue;
      case "queue-db":
      case "db-queue":
        return metrics.linkFlows.queueToDb;
      default:
        return 0;
    }
  };

  const showErrorPulse = metrics.errorRate > 0.2;

  return (
    <Canvas camera={{ position: [10, 9, 10], fov: 45 }}>
      <color attach="background" args={[new Color("#03060f")]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.9} />
      <gridHelper args={[40, 40, "#123", "#0b1c33"]} position={[0, -0.9, 0]} />
      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.3}
        maxDistance={18}
        minDistance={8}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#040912" />
      </mesh>

      <Building
        componentKey="lb"
        status={metrics.components.lb}
        label={COMPONENTS.lb.name}
        position={positions.lb}
        active
        selected={selected === "lb"}
        errorPulse={showErrorPulse}
        onSelect={() => onSelect("lb")}
        onPortClick={onPortClick}
        pendingPort={pendingPort}
      />
      <Building
        componentKey="app"
        status={metrics.components.app}
        label={`App Server x${appInstances}`}
        position={positions.app}
        active
        selected={selected === "app"}
        errorPulse={showErrorPulse}
        onSelect={() => onSelect("app")}
        onPortClick={onPortClick}
        pendingPort={pendingPort}
      />
      <Building
        componentKey="db"
        status={metrics.components.db}
        label={COMPONENTS.db.name}
        position={positions.db}
        active
        selected={selected === "db"}
        errorPulse={showErrorPulse}
        onSelect={() => onSelect("db")}
        onPortClick={onPortClick}
        pendingPort={pendingPort}
      />
      <Building
        componentKey="cache"
        status={metrics.components.cache}
        label={COMPONENTS.cache.name}
        position={positions.cache}
        active={cacheEnabled}
        selected={selected === "cache"}
        errorPulse={showErrorPulse && cacheEnabled}
        onSelect={() => onSelect("cache")}
        onPortClick={onPortClick}
        pendingPort={pendingPort}
      />
      <Building
        componentKey="queue"
        status={metrics.components.queue}
        label={COMPONENTS.queue.name}
        position={positions.queue}
        active={queueEnabled}
        selected={selected === "queue"}
        errorPulse={showErrorPulse && queueEnabled}
        onSelect={() => onSelect("queue")}
        onPortClick={onPortClick}
        pendingPort={pendingPort}
      />

      <Link points={[positions.lb, positions.app]} flow={metrics.linkFlows.lbToApp} active />

      <Link
        points={[positions.app, positions.db]}
        flow={metrics.linkFlows.appToDb}
        active={!cacheEnabled}
      />

      <Link
        points={[positions.app, positions.cache]}
        flow={metrics.linkFlows.appToCache}
        active={cacheEnabled}
      />
      <Link
        points={[positions.cache, positions.db]}
        flow={metrics.linkFlows.cacheToDb}
        active={cacheEnabled}
      />

      <Link
        points={[positions.app, positions.queue]}
        flow={metrics.linkFlows.appToQueue}
        active={queueEnabled}
      />
      <Link
        points={[positions.queue, positions.db]}
        flow={metrics.linkFlows.queueToDb}
        active={queueEnabled}
      />
      {connections.map((connection, index) => {
        const start = getPortPosition(connection.from.key, connection.from.port);
        const end = getPortPosition(connection.to.key, connection.to.port);
        const flow = getFlowForConnection(connection.from.key, connection.to.key);
        const active = componentActive[connection.from.key] && componentActive[connection.to.key];
        return (
          <Link
            key={`${connection.from.key}-${connection.from.port}-${connection.to.key}-${connection.to.port}-${index}`}
            points={[start, end]}
            flow={flow}
            active={active}
          />
        );
      })}
    </Canvas>
  );
};
