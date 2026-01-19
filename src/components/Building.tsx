import { Html, Text } from "@react-three/drei";
import { useMemo, useState } from "react";
import { Color } from "three";
import { ComponentKey, ComponentStatus } from "../sim";
import { PortRef, PortType } from "../types/connections";

interface BuildingProps {
  componentKey: ComponentKey;
  status: ComponentStatus;
  label: string;
  position: [number, number, number];
  active?: boolean;
  selected?: boolean;
  errorPulse?: boolean;
  onSelect?: () => void;
  onPortClick?: (key: ComponentKey, port: PortType) => void;
  pendingPort?: PortRef | null;
}

const hotColor = new Color("#ff6b6b");
const baseColor = new Color("#4dd1ff");
const idleColor = new Color("#2d6cdf");

export const Building = ({
  componentKey,
  status,
  label,
  position,
  active,
  selected,
  errorPulse,
  onSelect,
  onPortClick,
  pendingPort
}: BuildingProps) => {
  const color = useMemo(() => {
    const t = Math.min(1, status.utilization / 1.1);
    return idleColor.clone().lerp(baseColor, 0.4).lerp(hotColor, t);
  }, [status.utilization]);
  const [hoveredPort, setHoveredPort] = useState<PortType | null>(null);

  const isPortActive = (port: PortType) =>
    pendingPort?.key === componentKey && pendingPort.port === port;

  const handlePortClick = (port: PortType) => (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onPortClick?.(componentKey, port);
  };

  return (
    <group position={position}>
      <mesh onClick={onSelect}>
        <boxGeometry args={[1.6, 1.2, 1.6]} />
        <meshStandardMaterial
          color={color}
          emissive={errorPulse ? "#ff3b3b" : color}
          emissiveIntensity={errorPulse ? 0.7 : 0.35}
          transparent
          opacity={active ? 1 : 0.5}
        />
      </mesh>
      <mesh
        position={[0, -0.2, 0.95]}
        onClick={handlePortClick("in")}
        onPointerOver={() => setHoveredPort("in")}
        onPointerOut={() => setHoveredPort(null)}
        scale={isPortActive("in") ? 1.3 : hoveredPort === "in" ? 1.15 : 1}
      >
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#4effc6"
          emissive={isPortActive("in") ? "#d6fff2" : "#1ec995"}
          emissiveIntensity={isPortActive("in") ? 1 : 0.6}
        />
      </mesh>
      <mesh
        position={[0, -0.2, -0.95]}
        onClick={handlePortClick("out")}
        onPointerOver={() => setHoveredPort("out")}
        onPointerOut={() => setHoveredPort(null)}
        scale={isPortActive("out") ? 1.3 : hoveredPort === "out" ? 1.15 : 1}
      >
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#ffd166"
          emissive={isPortActive("out") ? "#fff3d6" : "#c99a1e"}
          emissiveIntensity={isPortActive("out") ? 1 : 0.6}
        />
      </mesh>
      <Text fontSize={0.28} position={[0, 1, 0]} color="#dff2ff">
        {label}
      </Text>
      {selected && (
        <Html position={[0, -1.1, 0]} center>
          <div style={{ fontSize: "11px", color: "#e4f6ff" }}>
            {Math.round(status.utilization * 100)}% util
          </div>
        </Html>
      )}
    </group>
  );
};
