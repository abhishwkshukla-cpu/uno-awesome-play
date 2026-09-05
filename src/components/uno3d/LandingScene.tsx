import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Card3D } from "./Card3D";
import { COLORS, type UnoCard, type CardValue } from "@/lib/uno";

function makeCard(i: number): UnoCard {
  const values: CardValue[] = [
    "1",
    "5",
    "7",
    "skip",
    "reverse",
    "draw2",
    "9",
    "3",
    "wild",
    "wild4",
    "0",
    "8",
  ];
  const value = values[i % values.length]!;
  const isWild = value === "wild" || value === "wild4";
  return {
    id: `landing-${i}`,
    color: isWild ? "wild" : COLORS[i % COLORS.length]!,
    value,
  };
}

function CardRing() {
  const group = useRef<THREE.Group>(null);
  const cards = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return {
          card: makeCard(i),
          angle: a,
          radius: 6.6,
          y: Math.sin(a * 2) * 0.5,
          phase: i * 0.7,
        };
      }),
    [],
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.22;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const c = cards[i]!;
      child.position.y = c.y + Math.sin(t * 0.9 + c.phase) * 0.28;
      child.rotation.z = Math.sin(t * 0.6 + c.phase) * 0.16;
    });
  });

  return (
    <group ref={group} position={[0, -0.4, 0]} rotation={[0.12, 0, 0]}>
      {cards.map((c, i) => (
        <group
          key={c.card.id}
          position={[
            Math.cos(c.angle) * c.radius,
            c.y,
            Math.sin(c.angle) * c.radius,
          ]}
          rotation={[0, -c.angle + Math.PI / 2, 0]}
        >
          <Card3D card={c.card} scale={1.25} rotation={[0, 0, i % 2 ? 0.08 : -0.08]} />
        </group>
      ))}
    </group>
  );
}

function HeroCard() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = Math.sin(t * 0.5) * 0.5;
    ref.current.rotation.x = Math.sin(t * 0.35) * 0.12;
    ref.current.position.y = Math.sin(t * 0.8) * 0.18;
  });
  return (
    <group ref={ref} position={[0, 0.2, -5]}>
      <Card3D card={{ id: "hero", color: "wild", value: "wild" }} scale={1.5} />
    </group>
  );
}

export default function LandingScene() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 2.2, 12], fov: 48 }}>
      <color attach="background" args={["#101426"]} />
      <fog attach="fog" args={["#101426", 10, 26]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[6, 10, 6]}
        intensity={2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-6, 2, -4]} intensity={30} color="#ffcc00" />
      <pointLight position={[6, -2, 4]} intensity={20} color="#0057b8" />
      <Environment>
        <Lightformer intensity={2} position={[0, 5, 2]} scale={[10, 10, 1]} />
        <Lightformer
          intensity={1.2}
          color="#ff6a3d"
          position={[-6, 1, -2]}
          rotation-y={Math.PI / 2}
          scale={[20, 2, 1]}
        />
        <Lightformer
          intensity={1.2}
          color="#4da3ff"
          position={[6, 1, 2]}
          rotation-y={-Math.PI / 2}
          scale={[20, 2, 1]}
        />
      </Environment>
      <HeroCard />
      <CardRing />
      <ContactShadows position={[0, -2.6, 0]} opacity={0.5} scale={16} blur={2.6} far={6} />
    </Canvas>
  );
}
