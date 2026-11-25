"use client";

// The camera rig moves the Three.js camera directly, as React Three Fiber expects.
/* eslint-disable react-hooks/immutability */

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";

import { Button } from "@/components/ui/button";
import {
  Snowman,
  faceToward,
  variants,
  type SnowmanHandle,
  type SnowmanHeldState,
  type SnowmanVariant,
} from "@/features/characters";

const VARIANTS: SnowmanVariant[] = ["bucket", "redhat"];
const SPOTS: Record<SnowmanVariant, [number, number]> = { bucket: [-0.72, 0], redhat: [0.72, 0] };

type View = "default" | "front" | "side" | "back" | "top";
const TARGET = new THREE.Vector3(0, 0.5, 0);
const DISTANCE = 4.6;
const VIEWS: Record<View, [number, number, number]> = {
  default: [0, 0.5 + DISTANCE * Math.sin(0.55), DISTANCE * Math.cos(0.55)],
  front: [0, 0.6, DISTANCE],
  side: [DISTANCE, 0.6, 0],
  back: [0, 0.6, -DISTANCE],
  top: [0, 0.5 + DISTANCE, 0.001],
};

const REFERENCES = [
  { src: "/assets/characters/reference-bucket-four-views.jpg", label: "Bucket: front, side, back, top" },
  { src: "/assets/characters/reference-redhat-four-views.jpg", label: "Red hat: front, side, back, top" },
  { src: "/assets/characters/reference-expressions-sheet.jpg", label: "Faces" },
];

function cssToken(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "white";
}

/** Moves the orbit camera to a preset view when asked. */
function CameraRig({ view, nonce }: { view: View; nonce: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  useEffect(() => {
    camera.position.set(...VIEWS[view]);
    if (controls) {
      controls.target.copy(TARGET);
      controls.update();
    } else {
      camera.lookAt(TARGET);
    }
  }, [view, nonce, camera, controls]);
  return null;
}

/** Writes the frame rate into a span twice a second without re-rendering React. */
function FrameRate({ out }: { out: RefObject<HTMLSpanElement | null> }) {
  const acc = useRef({ frames: 0, time: 0 });
  useFrame((_, delta) => {
    acc.current.frames += 1;
    acc.current.time += delta;
    if (acc.current.time >= 0.5) {
      const rate = Math.round(acc.current.frames / acc.current.time);
      if (out.current) out.current.textContent = `${rate} fps`;
      acc.current = { frames: 0, time: 0 };
    }
  });
  return null;
}

function Floor() {
  const colours = useMemo(() => ({ floor: cssToken("--paper"), shadow: cssToken("--sky-blue") }), []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <circleGeometry args={[4, 64]} />
        <meshBasicMaterial color={colours.floor} toneMapped={false} />
      </mesh>
      <ContactShadows position={[0, 0, 0]} scale={5} resolution={512} blur={2.4} far={1.2} opacity={0.55} color={colours.shadow} />
    </>
  );
}

export function CharacterLab() {
  const refs = useRef<Record<SnowmanVariant, SnowmanHandle | null>>({ bucket: null, redhat: null });
  const fps = useRef<HTMLSpanElement>(null);
  const [target, setTarget] = useState<"both" | SnowmanVariant>("both");
  const [held, setHeld] = useState<Record<SnowmanVariant, SnowmanHeldState>>({ bucket: "idle", redhat: "idle" });
  const [charge, setCharge] = useState(0.6);
  const [strength, setStrength] = useState(0.8);
  const [speed, setSpeed] = useState(1);
  const [faceEachOther, setFaceEachOther] = useState(false);
  const [view, setView] = useState<View>("default");
  const [viewNonce, setViewNonce] = useState(0);

  const chosen = target === "both" ? VARIANTS : [target];
  const setHeldFor = (state: SnowmanHeldState) =>
    setHeld((prev) => ({ ...prev, ...Object.fromEntries(chosen.map((v) => [v, state])) }));
  const act = (fn: (h: SnowmanHandle) => void) => {
    setHeldFor("idle");
    chosen.forEach((v) => {
      const handle = refs.current[v];
      if (handle) fn(handle);
    });
  };
  const goView = (next: View) => {
    setView(next);
    setViewNonce((n) => n + 1);
  };

  return (
    <div className="flex flex-1 flex-col lg:h-dvh lg:flex-none lg:flex-row lg:overflow-hidden">
      <div className="relative h-[70vh] min-w-0 bg-snow-shadow/50 lg:h-auto lg:flex-1">
        {/* preserveDrawingBuffer lets the test page be screenshotted; the real scene does not need it. */}
        <Canvas
          flat
          shadows={false}
          dpr={[1, 2]}
          gl={{ preserveDrawingBuffer: true }}
          camera={{ position: VIEWS.default, fov: 35 }}
        >
          <Suspense fallback={null}>
            {VARIANTS.map((v) => {
              const spot = SPOTS[v];
              const other = SPOTS[v === "bucket" ? "redhat" : "bucket"];
              return (
                <Snowman
                  key={v}
                  ref={(h) => {
                    refs.current[v] = h;
                  }}
                  variant={v}
                  position={[spot[0], 0, spot[1]]}
                  facing={faceEachOther ? faceToward(spot, other) : 0}
                  state={held[v]}
                  charge={charge}
                  timeScale={speed}
                />
              );
            })}
            <Floor />
          </Suspense>
          <OrbitControls makeDefault target={TARGET} minDistance={1.2} maxDistance={8} maxPolarAngle={Math.PI * 0.56} />
          <CameraRig view={view} nonce={viewNonce} />
          <FrameRate out={fps} />
        </Canvas>
        <span
          ref={fps}
          className="pointer-events-none absolute top-3 left-3 rounded-md bg-background/80 px-2 py-0.5 font-mono text-xs"
        />
      </div>

      <aside className="flex w-full flex-col gap-5 p-5 lg:w-96 lg:overflow-y-auto">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold">Snowmen test</h1>
          <p className="text-sm text-muted-foreground">
            Drag to orbit, scroll to zoom. Buttons play each state on the chosen snowman.
          </p>
        </header>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Who</h2>
          <div className="flex flex-wrap gap-2">
            {(["both", ...VARIANTS] as const).map((t) => (
              <Button key={t} variant={target === t ? "default" : "outline"} onClick={() => setTarget(t)}>
                {t === "both" ? "Both" : variants[t].label}
              </Button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Hold a state</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setHeldFor("idle")}>
              Idle
            </Button>
            <Button variant="outline" onClick={() => setHeldFor("pressed")}>
              Pressed
            </Button>
            <Button variant="outline" onClick={() => setHeldFor("charging")}>
              Charging
            </Button>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <span className="w-24">Charge {charge.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={charge}
              onChange={(e) => setCharge(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
          </label>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Play a moment</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => act((h) => h.launch())}>
              Launched
            </Button>
            <Button variant="secondary" onClick={() => act((h) => h.hit(strength))}>
              Hit
            </Button>
            <Button variant="secondary" onClick={() => act((h) => h.dizzy())}>
              Dizzy
            </Button>
            <Button variant="secondary" onClick={() => act((h) => h.laugh())}>
              Laugh
            </Button>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <span className="w-24">Hit {strength.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
          </label>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Speed</h2>
          <label className="flex items-center gap-3 text-sm">
            <span className="w-24">{speed === 1 ? "Normal" : `${speed.toFixed(2)}×`}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
          </label>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Camera</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(VIEWS) as View[]).map((v) => (
              <Button key={v} variant={view === v ? "default" : "outline"} size="sm" onClick={() => goView(v)}>
                {v[0].toUpperCase() + v.slice(1)}
              </Button>
            ))}
            <Button variant={faceEachOther ? "default" : "outline"} size="sm" onClick={() => setFaceEachOther((f) => !f)}>
              Face each other
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg">Reference</h2>
          {REFERENCES.map((r) => (
            <figure key={r.src} className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- small static dev reference */}
              <img src={r.src} alt={r.label} className="w-full rounded-md border border-border bg-background" />
              <figcaption className="text-xs text-muted-foreground">{r.label}</figcaption>
            </figure>
          ))}
        </section>
      </aside>
    </div>
  );
}
