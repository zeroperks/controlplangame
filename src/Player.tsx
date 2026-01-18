import { useAnimations, useFBX, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AnimationClip, Bone, Box3, Group, KeyframeTrack, MathUtils, Mesh, Vector3 } from "three";
import { SkeletonUtils } from "three-stdlib";

export type CharacterControl = "forward" | "backward" | "left" | "right";

export interface RectCollider {
  center: [number, number];
  halfSize: [number, number];
}

interface PlayerControllerProps {
  onMove?: (position: Vector3) => void;
  isTerminalOpen: boolean;
  colliders?: RectCollider[];
}

const characterUrl = new URL("./models/Walking.fbx", import.meta.url).href;

function findRootBone(object: Group) {
  let root: Bone | null = null;
  object.traverse((child) => {
    const bone = child as Bone;
    if (!bone.isBone) return;
    const parent = bone.parent as Bone | null;
    if (!parent || !parent.isBone) {
      root = bone;
    }
  });
  return root;
}

function isRootPositionTrack(track: KeyframeTrack, rootNames: Set<string>) {
  const lastDot = track.name.lastIndexOf(".");
  if (lastDot === -1) return false;
  const nodeName = track.name.slice(0, lastDot);
  const property = track.name.slice(lastDot + 1);
  if (property !== "position") return false;
  for (const rootName of rootNames) {
    if (nodeName === rootName || nodeName.endsWith(`|${rootName}`) || nodeName.endsWith(`/${rootName}`)) {
      return true;
    }
  }
  return false;
}

type CharacterRig = {
  root: Group;
  body?: Group | null;
  head?: Group | null;
  hat?: Group | null;
};

export function PlayerController({
  onMove,
  isTerminalOpen,
  colliders = []
}: PlayerControllerProps) {
  const groupRef = useRef<Group>(null);
  const velocity = useRef(new Vector3());
  const desiredVelocity = useRef(new Vector3());
  const inputVector = useRef(new Vector3());
  const headingVector = useRef(new Vector3());
  const blendedRotation = useRef(0);
  const tempPosition = useRef(new Vector3());
  const isWalking = useRef(false);
  const [, getKeys] = useKeyboardControls<CharacterControl>();
  const fbx = useFBX(characterUrl) as Group & { animations: AnimationClip[] };

  const rig = useMemo<CharacterRig>(() => {
    const cloned = SkeletonUtils.clone(fbx) as Group;
    cloned.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        const mesh = obj as Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    cloned.rotation.y = 0;
    cloned.position.set(0, 0, 0);
    cloned.updateMatrixWorld(true);

    const bbox = new Box3().setFromObject(cloned);
    const size = bbox.getSize(new Vector3());
    const targetHeight = 1.5;
    const scaleFactor = size.y > 0 ? targetHeight / size.y : 1;
    cloned.scale.multiplyScalar(scaleFactor);
    cloned.updateMatrixWorld(true);

    bbox.setFromObject(cloned);
    const center = bbox.getCenter(new Vector3());
    cloned.position.set(-center.x, -bbox.min.y, -center.z);

    const rememberTransforms = (node?: Group | null) => {
      if (!node) return;
      node.userData.baseRotation = node.rotation.clone();
      node.userData.basePosition = node.position.clone();
    };

    const body = cloned.getObjectByName("BODY.001") as Group | null;
    const head = cloned.getObjectByName("HEAD.001") as Group | null;
    const hat = cloned.getObjectByName("HAT.001") as Group | null;
    rememberTransforms(body);
    rememberTransforms(head);
    rememberTransforms(hat);

    return { root: cloned, body, head, hat };
  }, [fbx]);

  const strippedClips = useMemo(() => {
    const rootNames = new Set<string>();
    const rootBone = findRootBone(fbx);
    if (rootBone?.name) {
      rootNames.add(rootBone.name);
    }
    if (fbx.name) {
      rootNames.add(fbx.name);
    }
    const clips = fbx.animations ?? [];
    if (!rootNames.size) return clips;
    return clips.map((clip) => {
      const filteredTracks = clip.tracks.filter((track) => !isRootPositionTrack(track, rootNames));
      const stripped = clip.clone();
      stripped.tracks = filteredTracks;
      stripped.resetDuration();
      return stripped;
    });
  }, [fbx]);

  const { actions, names } = useAnimations(strippedClips, rig.root);
  const walkClipName = useMemo(() => {
    if (!names.length) return null;
    const matched = names.find((name) => name.toLowerCase().includes("walk"));
    return matched ?? names[0];
  }, [names]);
  const walkAction = useMemo(() => {
    if (!walkClipName) return null;
    return actions[walkClipName] ?? null;
  }, [actions, walkClipName]);

  useEffect(() => {
    if (!walkAction) return;
    walkAction.reset().play();
    walkAction.paused = true;
    walkAction.time = 0;
    return () => walkAction.stop();
  }, [walkAction]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const { forward, backward, left, right } = getKeys();

    inputVector.current.set(Number(right) - Number(left), 0, Number(backward) - Number(forward));
    const hasInput = inputVector.current.lengthSq() > 0;
    if (hasInput) {
      inputVector.current.normalize();
    }

    const maxSpeed = isTerminalOpen ? 0 : 3.2;
    desiredVelocity.current.copy(inputVector.current).multiplyScalar(maxSpeed);
    const damping = 1 - Math.exp(-12 * delta);
    velocity.current.lerp(desiredVelocity.current, damping);

    tempPosition.current.copy(group.position);
    tempPosition.current.addScaledVector(velocity.current, delta);

    tempPosition.current.x = MathUtils.clamp(tempPosition.current.x, -10.5, 10.5);
    tempPosition.current.z = MathUtils.clamp(tempPosition.current.z, -10.5, 10.5);

    colliders.forEach((collider) => {
      resolveRectCollision(tempPosition.current, collider);
    });

    group.position.x = tempPosition.current.x;
    group.position.z = tempPosition.current.z;

    const speed = velocity.current.length();
    const normalized = Math.min(speed / 3.2, 1);
    group.position.y = 0.55;

    const isMoving = normalized > 0.05;
    if (walkAction) {
      if (isMoving) {
        if (!isWalking.current) {
          walkAction.reset().play();
          isWalking.current = true;
        }
        walkAction.paused = false;
        walkAction.timeScale = 0.8 + normalized * 1.4;
      } else if (isWalking.current) {
        walkAction.paused = true;
        walkAction.time = 0;
        isWalking.current = false;
      }
    }

    headingVector.current.copy(velocity.current);
    headingVector.current.y = 0;
    if (headingVector.current.lengthSq() > 0.001) {
      blendedRotation.current = Math.atan2(headingVector.current.x, headingVector.current.z);
    }
    group.rotation.y = blendedRotation.current;
    group.rotation.x = -Math.min(0.12, headingVector.current.length() * 0.03);
    group.rotation.z = Math.sin(state.clock.elapsedTime * 6) * headingVector.current.length() * 0.02;

    onMove?.(group.position);
  });

  return (
    <group ref={groupRef} castShadow>
      <primitive object={rig.root} />
    </group>
  );
}

function resolveRectCollision(position: Vector3, collider: RectCollider) {
  const dx = position.x - collider.center[0];
  const dz = position.z - collider.center[1];
  const overlapX = collider.halfSize[0] - Math.abs(dx);
  const overlapZ = collider.halfSize[1] - Math.abs(dz);
  if (overlapX > 0 && overlapZ > 0) {
    if (overlapX < overlapZ) {
      position.x = collider.center[0] + Math.sign(dx || 1) * (collider.halfSize[0] + 0.05);
    } else {
      position.z = collider.center[1] + Math.sign(dz || 1) * (collider.halfSize[1] + 0.05);
    }
  }
}

useFBX.preload(characterUrl);
