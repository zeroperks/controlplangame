import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { Color } from "three";
import { COMPONENTS, ComponentKey, SimMetrics } from "../sim";
import { Building } from "./Building";
import { Link } from "./Link";
import { Packets } from "./Packets";

interface InfraSceneProps {
  metrics: SimMetrics;
  selected: ComponentKey | null;
  onSelect: (key: ComponentKey) => void;
  cacheEnabled: boolean;
  queueEnabled: boolean;
  appInstances: number;
  placedComponents: PlacedComponent[];
}

export interface PlacedComponent {
  id: string;
  key: ComponentKey;
  position: [number, number, number];
}

export const InfraScene = ({
  metrics,
  selected,
  onSelect,
  cacheEnabled,
  queueEnabled,
  appInstances,
  placedComponents
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

  const showErrorPulse = metrics.errorRate > 0.2;
  const isActive = (key: ComponentKey) => {
    if (key === "cache") return cacheEnabled;
    if (key === "queue") return queueEnabled;
    return true;
  };
  const labelForKey = (key: ComponentKey) =>
    key === "app" ? `${COMPONENTS.app.name} x${appInstances}` : COMPONENTS[key].name;

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
        status={metrics.components.lb}
        label={COMPONENTS.lb.name}
        position={positions.lb}
        active
        selected={selected === "lb"}
        errorPulse={showErrorPulse}
        onSelect={() => onSelect("lb")}
      />
      <Building
        status={metrics.components.app}
        label={`App Server x${appInstances}`}
        position={positions.app}
        active
        selected={selected === "app"}
        errorPulse={showErrorPulse}
        onSelect={() => onSelect("app")}
      />
      <Building
        status={metrics.components.db}
        label={COMPONENTS.db.name}
        position={positions.db}
        active
        selected={selected === "db"}
        errorPulse={showErrorPulse}
        onSelect={() => onSelect("db")}
      />
      <Building
        status={metrics.components.cache}
        label={COMPONENTS.cache.name}
        position={positions.cache}
        active={cacheEnabled}
        selected={selected === "cache"}
        errorPulse={showErrorPulse && cacheEnabled}
        onSelect={() => onSelect("cache")}
      />
      <Building
        status={metrics.components.queue}
        label={COMPONENTS.queue.name}
        position={positions.queue}
        active={queueEnabled}
        selected={selected === "queue"}
        errorPulse={showErrorPulse && queueEnabled}
        onSelect={() => onSelect("queue")}
      />

      {placedComponents.map((placed) => (
        <Building
          key={placed.id}
          status={metrics.components[placed.key]}
          label={labelForKey(placed.key)}
          position={placed.position}
          active={isActive(placed.key)}
          selected={selected === placed.key}
          errorPulse={showErrorPulse && isActive(placed.key)}
          onSelect={() => onSelect(placed.key)}
        />
      ))}

      <Link points={[positions.lb, positions.app]} flow={metrics.linkFlows.lbToApp} active />
      <Packets start={positions.lb} end={positions.app} flow={metrics.linkFlows.lbToApp} active />

      <Link
        points={[positions.app, positions.db]}
        flow={metrics.linkFlows.appToDb}
        active={!cacheEnabled}
      />
      <Packets
        start={positions.app}
        end={positions.db}
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
      <Packets
        start={positions.app}
        end={positions.cache}
        flow={metrics.linkFlows.appToCache}
        active={cacheEnabled}
      />
      <Packets
        start={positions.cache}
        end={positions.db}
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
      <Packets
        start={positions.app}
        end={positions.queue}
        flow={metrics.linkFlows.appToQueue}
        active={queueEnabled}
        offset={[0, 0.3, 0]}
      />
      <Packets
        start={positions.queue}
        end={positions.db}
        flow={metrics.linkFlows.queueToDb}
        active={queueEnabled}
        offset={[0, 0.3, 0]}
      />
    </Canvas>
  );
};
