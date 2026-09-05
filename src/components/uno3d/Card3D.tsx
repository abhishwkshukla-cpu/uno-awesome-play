import { useMemo } from "react";
import * as THREE from "three";
import { makeCardTexture } from "@/lib/cardTexture";
import type { UnoCard } from "@/lib/uno";

interface Card3DProps {
  card: UnoCard;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

const CARD_W = 1.1;
const CARD_H = 1.65;
const CARD_D = 0.035;

export function Card3D({
  card,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: Card3DProps) {
  const [front, back] = useMemo(
    () => [makeCardTexture(card), makeCardTexture("back")],
    [card],
  );

  const materials = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({
      color: "#f5f5f5",
      roughness: 0.55,
      metalness: 0.05,
    });
    const faceFront = new THREE.MeshStandardMaterial({
      map: front,
      roughness: 0.42,
      metalness: 0.05,
    });
    const faceBack = new THREE.MeshStandardMaterial({
      map: back,
      roughness: 0.42,
      metalness: 0.05,
    });
    // order: +x, -x, +y, -y, +z (front), -z (back)
    return [edge, edge, edge, edge, faceFront, faceBack];
  }, [front, back]);

  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
      material={materials}
    >
      <boxGeometry args={[CARD_W, CARD_H, CARD_D]} />
    </mesh>
  );
}
