// ============================================================
// Premium 3D hero — a glowing tensile test specimen (dog-bone shape:
// wide cylindrical grip sections top and bottom, connected by a
// narrower, roughly constant-width gauge section in the middle via a
// smooth shoulder transition — NOT a continuous taper to a point like
// an hourglass) rendered as a dense field of glowing "grain" particles
// (dust-like, not clean geometric spheres), continuously rotating.
//
// Geometry: particles are volumetrically scattered against this
// dog-bone silhouette — denser near the surface, thinning toward the
// core, and packed dense enough (with a slightly larger point size)
// that the shape reads as solid/filled rather than a sparse cloud.
//
// Color: particles in the gauge section (the middle, where stress
// concentrates and necking/fracture happens in a real tensile test)
// read hot white-gold, cooling toward amber/bronze out at the grips —
// a nod to stress/heat concentrating in the gauge, without literally
// depicting flowing liquid (this is a solid metal specimen, not a
// vessel).
//
// No wireframe rim — the particle density alone should read the
// shape clearly enough; a wireframe felt like clutter for this
// aesthetic once the specimen shape itself was correct.
//
// Interaction, perf tuning, and rendering setup (mouse-swirl shader,
// mobile particle/DPR/bloom scaling, OrbitControls-skip-on-touch,
// prefers-reduced-motion) are carried over unchanged from the
// earlier hero versions — all already tuned and tested.
// ============================================================
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// Perf/UX guard: phones and tablets get fewer particles, a lower device-pixel-
// ratio cap, and no OrbitControls (which otherwise captures one-finger touch-
// drag and hijacks page scrolling instead of letting the page scroll normally).
// prefers-reduced-motion also disables continuous rotation for anyone who has
// that accessibility setting on. Computed once at module load — this is a
// hero background, not something that needs to react to live resizing.
const IS_COARSE_POINTER = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const PREFERS_REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// Denser than the earlier version, and a larger point size below, so the
// specimen reads as filled rather than showing gaps of empty background.
const GRAIN_COUNT = IS_COARSE_POINTER ? 18000 : 38000;
const MAX_DPR = IS_COARSE_POINTER ? 1 : 2;

// Tensile specimen (dog-bone) silhouette shape.
const HALF_HEIGHT = 3.4;
const GRIP_RADIUS = 1.15; // wide grip sections, top and bottom
const GAUGE_RADIUS = 0.5; // narrower gauge section, middle — constant width, not a point
const GRIP_START = 0.55; // |yNorm| beyond this is pure grip (constant GRIP_RADIUS)
const GAUGE_END = 0.28; // |yNorm| within this is pure gauge (constant GAUGE_RADIUS)
// Between GAUGE_END and GRIP_START: a smooth shoulder/fillet transition,
// the same rounded step you'd see on a real ASTM/ISO tensile specimen.

function radiusAt(yNorm: number): number {
    const t = Math.abs(yNorm);
    if (t >= GRIP_START) return GRIP_RADIUS;
    if (t <= GAUGE_END) return GAUGE_RADIUS;
    // Smooth (cosine-eased) interpolation through the shoulder fillet.
    const local = (t - GAUGE_END) / (GRIP_START - GAUGE_END);
    const eased = 0.5 - 0.5 * Math.cos(local * Math.PI);
    return GAUGE_RADIUS + (GRIP_RADIUS - GAUGE_RADIUS) * eased;
}

// Stress/heat-concentration gradient: hot white-gold in the gauge section
// (where a real specimen necks and eventually fractures under load),
// cooling through amber to a darker bronze out toward the grips.
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
            // Bias sampling toward the gauge section (pow < 1 pulls values
            // toward 0) so the middle reads denser/brighter — matching
            // where a real specimen's stress concentration would be.
            const sign = Math.random() < 0.5 ? -1 : 1;
            const yNorm = sign * Math.pow(Math.random(), 1.4);
            const y = yNorm * HALF_HEIGHT;
            const surfaceR = radiusAt(yNorm);
            // Denser near the surface, thinning toward the core — gives a
            // solid-but-grainy volumetric fill rather than a hollow shell.
            const r = surfaceR * (0.55 + 0.45 * Math.cbrt(Math.random()));
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

    gl_PointSize = uPixelRatio * (20.0 / -mvPosition.z);
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
    float alpha = smoothstep(0.5, 0.22, d) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
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

function TensileSpecimen({ hoveringRef }: { hoveringRef: React.MutableRefObject<boolean> }) {
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
            <GrainBody mouseWorldRef={mouseWorldRef} mouseActiveRef={mouseActiveRef} />
            {/* Warm point light in the gauge section reinforces the
                "stress/heat concentration" glow with real lighting, on
                top of bloom. */}
            <pointLight position={[0, 0, 0]} color="#ffb703" intensity={2.9} distance={3} decay={2} />
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
                <TensileSpecimen hoveringRef={hoveringRef} />
                {/* Skipped entirely on touch devices — OrbitControls captures
                    one-finger drag for rotate, which otherwise hijacks the
                    page's normal scroll gesture the moment a finger lands on
                    the hero canvas. Desktop mouse-drag interaction is unaffected. */}
                {!IS_COARSE_POINTER && (
                    <OrbitControls
                        enablePan={false}
                        enableZoom={false}
                        enableDamping
                        dampingFactor={0.08}
                        rotateSpeed={0.5}
                    />
                )}
                <EffectComposer>
                    <Bloom
                        intensity={IS_COARSE_POINTER ? 0.38 : 0.6}
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