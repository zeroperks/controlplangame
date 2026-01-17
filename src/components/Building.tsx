import { Html, Text } from "@react-three/drei";
import { useMemo } from "react";
import { Color } from "three";
import { ComponentStatus } from "../sim";

interface BuildingProps {
  status: ComponentStatus;
  label: string;
  position: [number, number, number];
  active?: boolean;
  selected?: boolean;
  errorPulse?: boolean;
  onSelect?: () => void;
}

const hotColor = new Color("#ff6b6b");
const baseColor = new Color("#4dd1ff");
const idleColor = new Color("#2d6cdf");

export const Building = ({
  status,
  label,
  position,
  active,
  selected,
  errorPulse,
  onSelect
}: BuildingProps) => {
  const color = useMemo(() => {
    const t = Math.min(1, status.utilization / 1.1);
    return idleColor.clone().lerp(baseColor, 0.4).lerp(hotColor, t);
  }, [status.utilization]);

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
