// ============================================================
// Premium 3D hero — a molten-gold hourglass rendered as a dense
// field of glowing "grain" particles (dust-like, not clean geometric
// spheres), with a continuous bright stream of light poured through
// the pinched neck to read as liquid gold flowing through it.
//
// Geometry: particles are volumetrically scattered against a
// parametric hourglass silhouette (radius tapering to a narrow neck
// at the center, flaring back out top and bottom) — denser near the
// surface, thinning toward the core, for a "solid but grainy" look
// rather than a hollow shell or a uniform cloud.
//
// Color: particles near the neck read hot (white/gold), cooling
// toward amber/bronze further from center — like embers cooling as
// they scatter outward, reinforcing "molten gold pouring through."
//
// The pour stream is a second, separate particle system: a thin,
// bright column confined to the central axis, continuously falling
// and looping in the vertex shader, independent of the wider body.
//
// A faint wireframe rim (top ring, neck ring, bottom ring + tapering
// guide lines) anchors the eye so the shape reads immediately as "an
// hourglass," the same role the outer cube wireframe played before.
//
// Interaction, perf tuning, and rendering setup (mouse-swirl shader,
// mobile particle/DPR/bloom scaling, OrbitControls-skip-on-touch,
// prefers-reduced-motion) are carried over unchanged from the
// previous crystal-lattice hero — all already tuned and tested.
// ============================================================
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// Perf/UX guard: phones and tablets get fewer particles, a lower device-pixel-
// ratio cap, and no OrbitControls (which otherwise captures one-finger touch-
// drag and hijacks page scrolling instead of letting the page scroll normally).
// prefers-reduced-motion also disables continuous rotation/flow for anyone who
// has that accessibility setting on. Computed once at module load — this is a
// hero background, not something that needs to react to live resizing.
const IS_COARSE_POINTER = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const PREFERS_REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const GRAIN_COUNT = IS_COARSE_POINTER ? 9000 : 19000;
const STREAM_COUNT = IS_COARSE_POINTER ? 800 : 2000;
const MAX_DPR = IS_COARSE_POINTER ? 1 : 2;

// Hourglass silhouette shape.
const HALF_HEIGHT = 3.4;
const MAX_RADIUS = 1.75;
const NECK_RADIUS = 0.16;
const TAPER_POWER = 1.7; // higher = sharper pinch at the neck

function radiusAt(yNorm: number): number {
    const t = Math.abs(yNorm); // 0 at neck, 1 at top/bottom
    return NECK_RADIUS + (MAX_RADIUS - NECK_RADIUS) * Math.pow(t, TAPER_POWER);
}

// Ember-cooling gradient: hot white-gold right at the neck, cooling
// through amber to a darker bronze further out.
const HOT = new THREE.Color('#fff3c4');
const CORE = new THREE.Color('#ffb703');
const MID = new THREE.Color('#fb8500');
const COOL = new THREE.Color('#7a4a10');

function colorForY(yNorm: number, jitter: number): THREE.Color {
    const t = Math.min(1, Math.abs(yNorm) * 1.35);
    let c: THREE.Color;
    if (t < 0.33) c = HOT.clone().lerp(CORE, t / 0.33);
    else if (t < 0.7) c = CORE.clone().lerp(MID, (t - 0.33) / 0.37);
    else c = MID.clone().lerp(COOL, (t - 0.7) / 0.3);
    return c.lerp(new THREE.Color('#ffffff'), jitter * 0.1);
}

function useGrainGeometry() {
    return useMemo(() => {
        const positions = new Float32Array(GRAIN_COUNT * 3);
        const colors = new Float32Array(GRAIN_COUNT * 3);
        const seeds = new Float32Array(GRAIN_COUNT);

        for (let i = 0; i < GRAIN_COUNT; i++) {
            // Bias sampling toward the neck (pow < 1 pulls values toward 0)
            // so the pinch reads as denser/brighter, matching where the
            // "pour" visually originates.
            const sign = Math.random() < 0.5 ? -1 : 1;
            const yNorm = sign * Math.pow(Math.random(), 1.6);
            const y = yNorm * HALF_HEIGHT;
            const surfaceR = radiusAt(yNorm);
            // Denser near the surface, thinning toward the core — gives a
            // solid-but-grainy volumetric fill rather than a hollow shell.
            const r = surfaceR * (0.5 + 0.5 * Math.cbrt(Math.random()));
            const theta = Math.random() * Math.PI * 2;

            positions[i * 3] = r * Math.cos(theta);
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = r * Math.sin(theta);

            const jitter = Math.random();
            const c = colorForY(yNorm, jitter);
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;

            seeds[i] = Math.random();
        }

        return { positions, colors, seeds };
    }, []);
}

function useStreamGeometry() {
    return useMemo(() => {
        const positions = new Float32Array(STREAM_COUNT * 3);
        const colors = new Float32Array(STREAM_COUNT * 3);
        const seeds = new Float32Array(STREAM_COUNT);
        const streamRadius = NECK_RADIUS * 0.55;

        for (let i = 0; i < STREAM_COUNT; i++) {
            const y = (Math.random() * 2 - 1) * HALF_HEIGHT;
            const r = streamRadius * Math.sqrt(Math.random());
            const theta = Math.random() * Math.PI * 2;

            positions[i * 3] = r * Math.cos(theta);
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = r * Math.sin(theta);

            const c = HOT.clone().lerp(CORE, Math.random() * 0.5);
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;

            seeds[i] = Math.random();
        }

        return { positions, colors, seeds };
    }, []);
}

const GRAIN_VERTEX_SHADER = /* glsl */ `
  attribute vec3 color;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec3 uMouse3D;
  uniform float uMouseActive;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vec3 pos = position;

    // Tiny ambient per-particle drift — always present, independent of the cursor.
    float phase = aSeed * 6.2831853;
    pos.x += sin(uTime * 0.5 + phase) * 0.012;
    pos.y += cos(uTime * 0.43 + phase * 1.3) * 0.012;
    pos.z += sin(uTime * 0.37 + phase * 0.8) * 0.012;

    // Fluid-like swirl following the cursor's projected 3D position.
    vec3 toMouse = pos - uMouse3D;
    float dist = length(toMouse) + 0.0001;
    float influenceRadius = 2.0;
    float falloff = smoothstep(influenceRadius, 0.0, dist) * uMouseActive;
    vec3 radial = toMouse / dist;
    vec3 tangent = normalize(cross(radial, vec3(0.0, 1.0, 0.0)) + vec3(0.0001));
    pos += tangent * falloff * 0.9;
    pos += radial * falloff * 0.3;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // Grain sparkle — slow, phase-shifted brightness pulse per particle.
    vAlpha = 0.75 + 0.25 * sin(uTime * 1.3 + phase * 3.1);

    gl_PointSize = uPixelRatio * (13.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const GRAIN_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

// Stream particles fall continuously through the neck and loop back to
// the top — aSeed offsets each particle's phase so the flow reads as
// continuous, not a single wave of particles moving in lockstep.
const STREAM_VERTEX_SHADER = /* glsl */ `
  attribute vec3 color;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uFlowSpeed;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vec3 pos = position;

    float span = ${(HALF_HEIGHT * 2).toFixed(2)};
    float half = ${HALF_HEIGHT.toFixed(2)};
    float rawY = pos.y - uTime * uFlowSpeed + aSeed * span;
    pos.y = mod(rawY + half, span) - half;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vAlpha = 0.85 + 0.15 * sin(uTime * 2.4 + aSeed * 6.2831853);
    gl_PointSize = uPixelRatio * (9.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

function GrainBody({
    mouseWorldRef,
    mouseActiveRef,
}: {
    mouseWorldRef: React.MutableRefObject<THREE.Vector3>;
    mouseActiveRef: React.MutableRefObject<number>;
}) {
    const { positions, colors, seeds } = useGrainGeometry();
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const pointsRef = useRef<THREE.Points>(null);
    const { gl } = useThree();

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uPixelRatio: { value: gl.getPixelRatio() },
            uMouse3D: { value: new THREE.Vector3(9999, 9999, 9999) },
            uMouseActive: { value: 0 },
        }),
        [gl]
    );

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
            materialRef.current.uniforms.uMouseActive.value = mouseActiveRef.current;
            if (pointsRef.current) {
                const localMouse = pointsRef.current.worldToLocal(mouseWorldRef.current.clone());
                materialRef.current.uniforms.uMouse3D.value.copy(localMouse);
            }
        }
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-color" args={[colors, 3]} />
                <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
            </bufferGeometry>
            <shaderMaterial
                ref={materialRef}
                uniforms={uniforms}
                vertexShader={GRAIN_VERTEX_SHADER}
                fragmentShader={GRAIN_FRAGMENT_SHADER}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

function PourStream() {
    const { positions, colors, seeds } = useStreamGeometry();
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, MAX_DPR) : 1 },
            uFlowSpeed: { value: PREFERS_REDUCED_MOTION ? 0 : 1.6 },
        }),
        []
    );

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-color" args={[colors, 3]} />
                <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
            </bufferGeometry>
            <shaderMaterial
                ref={materialRef}
                uniforms={uniforms}
                vertexShader={STREAM_VERTEX_SHADER}
                fragmentShader={GRAIN_FRAGMENT_SHADER}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

// Faint wireframe rim — top ring, neck ring, bottom ring, plus tapering
// guide lines — so the shape reads immediately as "an hourglass," the
// same anchoring role the outer cube wireframe played in the crystal
// lattice version.
function HourglassRim() {
    const { ringTop, ringNeck, ringBottom, guideLines } = useMemo(() => {
        const ring = (yNorm: number) => {
            const y = yNorm * HALF_HEIGHT;
            const r = radiusAt(yNorm);
            const pts: THREE.Vector3[] = [];
            const segments = 64;
            for (let i = 0; i <= segments; i++) {
                const a = (i / segments) * Math.PI * 2;
                pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
            }
            return new THREE.BufferGeometry().setFromPoints(pts);
        };

        const guideMaterial = new THREE.LineBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.22 });
        const guideLines: THREE.Line[] = [];
        const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        const steps = 40;
        for (const a of angles) {
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i <= steps; i++) {
                const yNorm = -1 + (2 * i) / steps;
                const r = radiusAt(yNorm);
                pts.push(new THREE.Vector3(r * Math.cos(a), yNorm * HALF_HEIGHT, r * Math.sin(a)));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(pts);
            guideLines.push(new THREE.Line(geometry, guideMaterial));
        }

        return { ringTop: ring(1), ringNeck: ring(0.02), ringBottom: ring(-1), guideLines };
    }, []);

    return (
        <>
            <lineLoop geometry={ringTop}>
                <lineBasicMaterial color="#ffd166" transparent opacity={0.35} />
            </lineLoop>
            <lineLoop geometry={ringNeck}>
                <lineBasicMaterial color="#fff3c4" transparent opacity={0.55} />
            </lineLoop>
            <lineLoop geometry={ringBottom}>
                <lineBasicMaterial color="#ffd166" transparent opacity={0.35} />
            </lineLoop>
            {guideLines.map((lineObj, i) => (
                <primitive key={i} object={lineObj} />
            ))}
        </>
    );
}

function Hourglass({ hoveringRef }: { hoveringRef: React.MutableRefObject<boolean> }) {
    const spinRef = useRef<THREE.Group>(null);
    const scrollFactor = useRef(0);
    const mouseWorldRef = useRef(new THREE.Vector3(9999, 9999, 9999));
    const mouseActiveRef = useRef(0);
    const interactionPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);

    React.useEffect(() => {
        const onScroll = () => {
            scrollFactor.current = Math.min(1, window.scrollY / (window.innerHeight || 1));
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useFrame((state, delta) => {
        if (spinRef.current && !PREFERS_REDUCED_MOTION) {
            spinRef.current.rotation.y += delta * 0.09;
            spinRef.current.rotation.y += scrollFactor.current * delta * 0.06;
            const breathe = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.015;
            spinRef.current.scale.setScalar(breathe);
        }

        state.raycaster.setFromCamera(state.pointer, state.camera);
        if (hoveringRef.current) {
            const hit = new THREE.Vector3();
            if (state.raycaster.ray.intersectPlane(interactionPlane, hit)) {
                mouseWorldRef.current.copy(hit);
            }
            mouseActiveRef.current += (1 - mouseActiveRef.current) * Math.min(1, delta * 3.5);
        } else {
            mouseActiveRef.current += (0 - mouseActiveRef.current) * Math.min(1, delta * 1.2);
        }
    });

    return (
        <group ref={spinRef} rotation={[0.15, 0.4, 0]}>
            <HourglassRim />
            <GrainBody mouseWorldRef={mouseWorldRef} mouseActiveRef={mouseActiveRef} />
            <PourStream />
            {/* Warm point light right at the neck reinforces the "molten
                glow at the pinch" with real lighting, on top of bloom. */}
            <pointLight position={[0, 0, 0]} color="#ffb703" intensity={2.2} distance={3} decay={2} />
        </group>
    );
}

export default function HeroCrystalLattice() {
    const hoveringRef = useRef(false);

    return (
        <div
            className="relative w-full h-full cursor-grab active:cursor-grabbing"
            onPointerEnter={() => { hoveringRef.current = true; }}
            onPointerLeave={() => { hoveringRef.current = false; }}
        >
            <Canvas
                camera={{ position: [0, 0, 9], fov: 38 }}
                dpr={[1, MAX_DPR]}
                gl={{ antialias: !IS_COARSE_POINTER, alpha: true, powerPreference: 'high-performance' }}
            >
                <Stars radius={40} depth={25} count={350} factor={1} saturation={0} fade speed={0.2} />
                <ambientLight intensity={0.3} />
                <directionalLight position={[4, 5, 6]} intensity={0.6} color="#eef2ff" />
                <directionalLight position={[-5, -3, -4]} intensity={0.2} color="#aab8d6" />
                <Hourglass hoveringRef={hoveringRef} />
                {/* Skipped entirely on touch devices — OrbitControls captures
                    one-finger drag for rotate, which otherwise hijacks the
                    page's normal scroll gesture the moment a finger lands on
                    the hero canvas. Desktop mouse-drag interaction is unaffected. */}
                {!IS_COARSE_POINTER && (
                    <OrbitControls
                        enablePan={false}
                        enableZoom={true}
                        minDistance={6}
                        maxDistance={13}
                        enableDamping
                        dampingFactor={0.08}
                        rotateSpeed={0.5}
                    />
                )}
                <EffectComposer>
                    <Bloom
                        intensity={IS_COARSE_POINTER ? 0.35 : 0.55}
                        luminanceThreshold={0.35}
                        luminanceSmoothing={0.4}
                        mipmapBlur={!IS_COARSE_POINTER}
                        radius={0.5}
                    />
                    <Vignette darkness={0.6} offset={0.3} />
                </EffectComposer>
            </Canvas>
        </div>
    );
}