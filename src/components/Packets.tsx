import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CatmullRomCurve3, Vector3, Mesh } from "three";

interface PacketsProps {
  start: [number, number, number];
  end: [number, number, number];
  flow: number;
  active?: boolean;
  offset?: [number, number, number];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const Packets = ({ start, end, flow, active, offset = [0, 0.4, 0] }: PacketsProps) => {
  const meshRef = useRef<Mesh[]>([]);
  const curve = useMemo(() => {
    const startVec = new Vector3(...start);
    const endVec = new Vector3(...end);
    const mid = startVec.clone().lerp(endVec, 0.5).add(new Vector3(0, 0.6, 0));
    return new CatmullRomCurve3([startVec, mid, endVec]);
  }, [start, end]);

  const packetCount = clamp(Math.round(flow / 80), 4, 50);
  const seeds = useMemo(
    () => Array.from({ length: packetCount }, () => Math.random()),
    [packetCount]
  );

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    meshRef.current.forEach((mesh, index) => {
      if (!mesh) return;
      const t = (time * 0.2 + seeds[index]) % 1;
      const point = curve.getPointAt(t);
      mesh.position.set(point.x + offset[0], point.y + offset[1], point.z + offset[2]);
      mesh.visible = Boolean(active);
    });
  });

  return (
    <group>
      {Array.from({ length: packetCount }).map((_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            if (node) meshRef.current[index] = node;
          }}
        >
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial emissive="#7bf5ff" color="#9fe6ff" emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
};
