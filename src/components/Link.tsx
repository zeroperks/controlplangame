import { Line } from "@react-three/drei";
import { useMemo } from "react";

interface LinkProps {
  points: [number, number, number][];
  flow: number;
  active?: boolean;
}

export const Link = ({ points, flow, active }: LinkProps) => {
  const color = useMemo(() => {
    if (!active) return "#1b2e4b";
    if (flow > 1500) return "#ffb347";
    if (flow > 800) return "#6fffb0";
    return "#4ea3ff";
  }, [flow, active]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={active ? Math.min(6, 1 + flow / 600) : 1}
      transparent
      opacity={active ? 0.8 : 0.3}
    />
  );
};
