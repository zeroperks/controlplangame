import {
  AccumulativeShadows,
  Environment,
  Float,
  Html,
  OrbitControls,
  RandomizedLight,
  RoundedBox,
  useCursor
} from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { MutableRefObject, useCallback, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";
import { PlayerController, RectCollider } from "./Player";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export interface OfficeSceneProps {
  isTerminalOpen: boolean;
  onComputerInteract: () => void;
}

const workstationWorldPosition = new Vector3(2.5, 0, -3);

const benchDefinitions = [
  { position: [-4, 0.4, -1.5] as [number, number, number], size: [3, 0.8, 0.8] as [number, number, number] },
  { position: [-6, 0.4, 1.8] as [number, number, number], size: [3, 0.8, 0.8] as [number, number, number] },
  { position: [4, 0.4, 1.5] as [number, number, number], size: [3, 0.8, 0.8] as [number, number, number] }
];

const planterDefinitions = [
  { position: [-2, 0.6, -4.5] as [number, number, number], size: [1.2, 1.2, 1.2] as [number, number, number] },
  { position: [3, 0.6, 3.5] as [number, number, number], size: [1.2, 1.2, 1.2] as [number, number, number] }
];

export function OfficeScene({ isTerminalOpen, onComputerInteract }: OfficeSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const playerPosition = useRef(new Vector3());

  const handlePlayerMove = useCallback((position: Vector3) => {
    playerPosition.current.copy(position);
  }, []);

  const colliders = useMemo<RectCollider[]>(
    () => [
      ...benchDefinitions.map(({ position, size }) => ({
        center: [position[0], position[2]] as [number, number],
        halfSize: [size[0] / 2 + 0.2, size[2] / 2 + 0.2] as [number, number]
      })),
      ...planterDefinitions.map(({ position, size }) => ({
        center: [position[0], position[2]] as [number, number],
        halfSize: [size[0] / 2 + 0.15, size[2] / 2 + 0.15] as [number, number]
      })),
      { center: [workstationWorldPosition.x, workstationWorldPosition.z + 0.3], halfSize: [2, 1.2] },
      { center: [workstationWorldPosition.x - 0.3, workstationWorldPosition.z - 0.3], halfSize: [1.2, 1] }
    ],
    []
  );

  useFrame(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.lerp(playerPosition.current, 0.1);
    controlsRef.current.update();
  });

  return (
    <>
      <color attach="background" args={["#f1f5fb"]} />
      <fog attach="fog" args={["#f1f5fb", 25, 45]} />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={0.35}
        maxDistance={24}
        minDistance={6}
      />

      <Environment preset="apartment" blur={0.85} />

      <ambientLight intensity={1.1} />
      <directionalLight
        castShadow
        intensity={1.3}
        position={[10, 12, 6]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-near={4}
        shadow-bias={-0.0005}
      />

      <LobbyGeometry />
      <SoftShadowCatcher />
      <DecorPieces />

      <Workstation
        playerPositionRef={playerPosition}
        isTerminalOpen={isTerminalOpen}
        onComputerInteract={onComputerInteract}
      />

      <PlayerController onMove={handlePlayerMove} isTerminalOpen={isTerminalOpen} colliders={colliders} />
    </>
  );
}

function LobbyGeometry() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#ffffff" roughness={0.18} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[24, 24, 24, 24]} />
        <meshStandardMaterial color="#eff2f9" wireframe />
      </mesh>
      <mesh position={[0, 2.5, -10]} receiveShadow castShadow>
        <boxGeometry args={[24, 5, 0.4]} />
        <meshStandardMaterial color="#f6f0ea" roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.5, 10]} receiveShadow castShadow>
        <boxGeometry args={[24, 5, 0.4]} />
        <meshStandardMaterial color="#eef2ff" roughness={0.4} />
      </mesh>
      <mesh position={[-12, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[24, 5, 0.4]} />
        <meshStandardMaterial color="#edf4fb" roughness={0.4} />
      </mesh>
    </group>
  );
}

function SoftShadowCatcher() {
  return (
    <AccumulativeShadows
      frames={90}
      temporal
      color="#b1bccc"
      colorBlend={0.5}
      alphaTest={0.85}
      scale={20}
      position={[0, -0.05, 0]}
    >
      <RandomizedLight
        amount={5}
        radius={12}
        intensity={0.5}
        ambient={0.7}
        position={[6, 6, 4]}
        bias={0.002}
      />
    </AccumulativeShadows>
  );
}

function DecorPieces() {
  return (
    <group>
      {benchDefinitions.map(({ position, size }, index) => (
        <RoundedBox
          key={`bench-${index}`}
          args={size}
          radius={0.2}
          smoothness={6}
          position={position}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#f5d1b1" roughness={0.35} metalness={0.1} />
        </RoundedBox>
      ))}
      {planterDefinitions.map(({ position, size }, index) => (
        <RoundedBox
          key={`planter-${index}`}
          args={size}
          radius={0.15}
          smoothness={4}
          position={position}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#fcefdc" roughness={0.3} />
        </RoundedBox>
      ))}
      {planterDefinitions.map(({ position }, index) => (
        <Float key={`leaf-${index}`} speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
          <mesh position={[position[0], position[1] + 1.2, position[2]]} castShadow>
            <coneGeometry args={[0.4, 1.4, 6]} />
            <meshStandardMaterial color="#91c9c6" roughness={0.2} />
          </mesh>
        </Float>
      ))}
      <Float speed={0.8} floatIntensity={0.1} rotationIntensity={0.15}>
        <RoundedBox
          args={[4, 0.2, 1]}
          radius={0.1}
          smoothness={3}
          position={[0, 3.5, 0]}
          receiveShadow
          castShadow
        >
          <meshStandardMaterial color="#e7effc" roughness={0.2} metalness={0.05} />
        </RoundedBox>
      </Float>
    </group>
  );
}

interface WorkstationProps {
  playerPositionRef: MutableRefObject<Vector3>;
  isTerminalOpen: boolean;
  onComputerInteract: () => void;
}

function Workstation({ playerPositionRef, isTerminalOpen, onComputerInteract }: WorkstationProps) {
  const [playerClose, setPlayerClose] = useState(false);
  const closeRef = useRef(false);

  useCursor(playerClose && !isTerminalOpen);

  useFrame(() => {
    const distance = playerPositionRef.current.distanceTo(workstationWorldPosition);
    const close = distance < 2.2;
    if (close !== closeRef.current) {
      closeRef.current = close;
      setPlayerClose(close);
    }
  });

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (!playerClose || isTerminalOpen) return;
      onComputerInteract();
    },
    [playerClose, isTerminalOpen, onComputerInteract]
  );

  const emissiveIntensity = playerClose && !isTerminalOpen ? 1.5 : 0.3;

  return (
    <group position={[workstationWorldPosition.x, 0, workstationWorldPosition.z]}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.1, 1.6]} />
        <meshStandardMaterial color="#fef0df" roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[3, 0.3, 1.6]} />
        <meshStandardMaterial color="#f6dac0" roughness={0.45} />
      </mesh>
      <RoundedBox
        args={[0.4, 1, 0.5]}
        radius={0.1}
        smoothness={4}
        position={[-0.8, 0.9, -0.3]}
        castShadow
      >
        <meshStandardMaterial color="#d5e5f0" roughness={0.3} metalness={0.1} />
      </RoundedBox>
      <mesh position={[0, 1.2, -0.25]} onClick={handleClick} castShadow>
        <boxGeometry args={[0.05, 1, 1.4]} />
        <meshStandardMaterial
          color="#6bb5ff"
          emissive="#9ad6ff"
          emissiveIntensity={emissiveIntensity}
          roughness={0.1}
          metalness={0.4}
        />
      </mesh>
      <RoundedBox args={[0.2, 0.2, 0.2]} radius={0.05} smoothness={3} position={[0, 0.65, -0.25]}>
        <meshStandardMaterial color="#9ecfff" roughness={0.2} />
      </RoundedBox>
      <RoundedBox
        args={[0.8, 0.05, 0.4]}
        radius={0.05}
        smoothness={3}
        position={[0, 0.5, 0.4]}
        castShadow
      >
        <meshStandardMaterial color="#ffffff" roughness={0.25} metalness={0.2} />
      </RoundedBox>
      {playerClose && !isTerminalOpen && (
        <Html position={[0, 1.9, -0.2]} center distanceFactor={6}>
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.9)",
              color: "#1d2a3c",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.3
            }}
          >
            Click computer to open terminal
          </div>
        </Html>
      )}
    </group>
  );
}
