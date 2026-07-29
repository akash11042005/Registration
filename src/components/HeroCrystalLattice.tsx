// ============================================================
// Premium 3D hero — a Body-Centered Cubic (BCC) crystal lattice.
//
// Geometry: mathematically correct BCC unit cells tiled 2×2×2 —
// atoms at every cube corner plus one at the center of each cell,
// connected by rods to their true nearest neighbors (corner ↔
// body-center, the real BCC bond).
//
// Rendering: every atom is a cloud of GPU-animated particles (one
// combined Points draw call for the whole lattice, not one object
// per atom) using a custom shader for per-particle drift + sparkle.
// Rods are real lit meshes (InstancedMesh), so they alone carry
// genuine PBR specular highlights — points fundamentally can't be
// "reflective" in the literal sense, so bloom + the lit rods are
// what stand in for that here.
//
// Interaction: continuous slow rotation, mouse-driven tilt with
// damped inertia (eases back to rest when the pointer leaves),
// subtle scroll-linked rotation, and a very slight breathing scale.
// ============================================================
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// Vivid, distinct per-atom colors — same spirit as the grain-boundary
// model, so adjacent atoms read as clearly different, not monochrome.
const PALETTE = [
    '#facc15', // gold
    '#d4a017', // amber
    '#fff6d6', // warm white
    '#60a5fa', // sky blue
    '#7d8fe8', // periwinkle
    '#34d399', // emerald
    '#f472b6', // rose
    '#a78bfa', // violet
    '#ffffff', // white highlight
].map((c) => new THREE.Color(c));

const CELL = 2.2; // BCC unit-cell edge length
const ATOM_RADIUS = 0.34;

// Perf/UX guard: phones and tablets get fewer particles, a lower device-pixel-
// ratio cap, and no OrbitControls (which otherwise captures one-finger touch-
// drag and hijacks page scrolling instead of letting the page scroll normally).
// prefers-reduced-motion also disables the continuous rotation for anyone who
// has that accessibility setting on. Computed once at module load — this is a
// hero background, not something that needs to react to live resizing.
const IS_COARSE_POINTER = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const PREFERS_REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const PARTICLES_PER_ATOM = IS_COARSE_POINTER ? 220 : 480;
const MAX_DPR = IS_COARSE_POINTER ? 1 : 2;

interface Atom {
    position: THREE.Vector3;
    color: THREE.Color;
}

// Builds one 2×2×2 BCC supercell: 27 shared corner atoms (a 3×3×3
// grid of lattice points) + 8 body-center atoms, one per unit cell.
function useBCCLattice() {
    return useMemo(() => {
        const atoms: Atom[] = [];
        const half = CELL;
        const coords = [-half, 0, half];

        // Corner atoms — every lattice point in the 3×3×3 grid.
        for (const x of coords) {
            for (const y of coords) {
                for (const z of coords) {
                    atoms.push({
                        position: new THREE.Vector3(x, y, z),
                        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
                    });
                }
            }
        }

        // Body-center atoms — one per unit cell, at (±half/2, ±half/2, ±half/2).
        const bodyCenters: THREE.Vector3[] = [];
        const half2 = half / 2;
        for (const sx of [-1, 1]) {
            for (const sy of [-1, 1]) {
                for (const sz of [-1, 1]) {
                    const p = new THREE.Vector3(sx * half2, sy * half2, sz * half2);
                    bodyCenters.push(p);
                    atoms.push({ position: p, color: PALETTE[Math.floor(Math.random() * PALETTE.length)] });
                }
            }
        }

        // Bonds — the true BCC nearest-neighbor bond: each body-center atom
        // connects to the 8 corners of its own enclosing unit cell.
        const bonds: [THREE.Vector3, THREE.Vector3][] = [];
        for (const bc of bodyCenters) {
            for (const dx of [-1, 1]) {
                for (const dy of [-1, 1]) {
                    for (const dz of [-1, 1]) {
                        const corner = new THREE.Vector3(
                            bc.x + (dx * half) / 2,
                            bc.y + (dy * half) / 2,
                            bc.z + (dz * half) / 2
                        );
                        bonds.push([bc, corner]);
                    }
                }
            }
        }

        return { atoms, bonds };
    }, []);
}

function sampleInAtom(center: THREE.Vector3, radius: number): THREE.Vector3 {
    const r = radius * Math.cbrt(Math.random()) * (0.5 + 0.5 * Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return new THREE.Vector3(
        center.x + r * Math.sin(phi) * Math.cos(theta),
        center.y + r * Math.sin(phi) * Math.sin(theta),
        center.z + r * Math.cos(phi)
    );
}

const VERTEX_SHADER = /* glsl */ `
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

    // Tiny ambient GPU-driven per-particle drift — always present, independent of the cursor.
    float phase = aSeed * 6.2831853;
    pos.x += sin(uTime * 0.55 + phase) * 0.01;
    pos.y += cos(uTime * 0.47 + phase * 1.3) * 0.01;
    pos.z += sin(uTime * 0.39 + phase * 0.8) * 0.01;

    // Fluid-like swirl following the cursor's projected 3D position — a tangential
    // rotation plus slight outward push, both falling off with distance and scaled
    // by uMouseActive (ramps toward 1 while the pointer is over the canvas, eases
    // back toward 0 when it isn't — this is what makes particles "slowly return").
    vec3 toMouse = pos - uMouse3D;
    float dist = length(toMouse) + 0.0001;
    float influenceRadius = 2.0;
    float falloff = smoothstep(influenceRadius, 0.0, dist) * uMouseActive;
    vec3 radial = toMouse / dist;
    vec3 tangent = normalize(cross(radial, vec3(0.0, 1.0, 0.0)) + vec3(0.0001));
    pos += tangent * falloff * 0.9;
    pos += radial * falloff * 0.3;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // Subtle per-particle sparkle via a slow, phase-shifted brightness pulse.
    vAlpha = 0.78 + 0.22 * sin(uTime * 1.4 + phase * 3.1);

    gl_PointSize = uPixelRatio * (18.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
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

function useParticleGeometry(atoms: Atom[]) {
    return useMemo(() => {
        const total = atoms.length * PARTICLES_PER_ATOM;
        const positions = new Float32Array(total * 3);
        const colors = new Float32Array(total * 3);
        const seeds = new Float32Array(total);

        let i = 0;
        for (const atom of atoms) {
            for (let s = 0; s < PARTICLES_PER_ATOM; s++, i++) {
                const p = sampleInAtom(atom.position, ATOM_RADIUS);
                positions[i * 3] = p.x;
                positions[i * 3 + 1] = p.y;
                positions[i * 3 + 2] = p.z;

                const shade = atom.color.clone().lerp(new THREE.Color('#ffffff'), Math.random() * 0.25);
                colors[i * 3] = shade.r;
                colors[i * 3 + 1] = shade.g;
                colors[i * 3 + 2] = shade.b;

                seeds[i] = Math.random();
            }
        }
        return { positions, colors, seeds };
    }, [atoms]);
}

function LatticeParticles({
    atoms,
    mouseWorldRef,
    mouseActiveRef,
}: {
    atoms: Atom[];
    mouseWorldRef: React.MutableRefObject<THREE.Vector3>;
    mouseActiveRef: React.MutableRefObject<number>;
}) {
    const { positions, colors, seeds } = useParticleGeometry(atoms);
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
                vertexShader={VERTEX_SHADER}
                fragmentShader={FRAGMENT_SHADER}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

// Bonds as real, lit meshes — the one part of the scene where genuine
// specular highlights are physically meaningful.
function LatticeBonds({ bonds }: { bonds: [THREE.Vector3, THREE.Vector3][] }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const radius = 0.02;

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        const dummy = new THREE.Object3D();
        bonds.forEach(([a, b], i) => {
            const mid = a.clone().add(b).multiplyScalar(0.5);
            const dir = b.clone().sub(a);
            const length = dir.length();
            dummy.position.copy(mid);
            dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
            dummy.scale.set(1, length, 1);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [bonds]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, bonds.length]}>
            <cylinderGeometry args={[radius, radius, 1, 8]} />
            <meshStandardMaterial color="#b7bcc4" metalness={0.85} roughness={0.32} />
        </instancedMesh>
    );
}

// Faint outer cube wireframe — anchors the eye so the whole structure
// reads immediately as "a cube," distinct from the internal BCC bonds.
function OuterCubeWireframe() {
    const geometry = useMemo(() => {
        const box = new THREE.BoxGeometry(CELL * 2, CELL * 2, CELL * 2);
        return new THREE.EdgesGeometry(box);
    }, []);

    return (
        <lineSegments geometry={geometry}>
            <lineBasicMaterial color="#c9d3ff" transparent opacity={0.45} />
        </lineSegments>
    );
}

function Lattice({ hoveringRef }: { hoveringRef: React.MutableRefObject<boolean> }) {
    const { atoms, bonds } = useBCCLattice();
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
            spinRef.current.rotation.y += delta * 0.1;
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
            // Ramps up quickly while hovering...
            mouseActiveRef.current += (1 - mouseActiveRef.current) * Math.min(1, delta * 3.5);
        } else {
            // ...and eases back down slowly once the pointer leaves — the
            // "slowly return to original shape" behavior.
            mouseActiveRef.current += (0 - mouseActiveRef.current) * Math.min(1, delta * 1.2);
        }
    });

    return (
        <group ref={spinRef} rotation={[0.3, 0.5, 0]}>
            <OuterCubeWireframe />
            <LatticeBonds bonds={bonds} />
            <LatticeParticles atoms={atoms} mouseWorldRef={mouseWorldRef} mouseActiveRef={mouseActiveRef} />
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
                <ambientLight intensity={0.35} />
                <directionalLight position={[4, 5, 6]} intensity={0.7} color="#eef2ff" />
                <directionalLight position={[-5, -3, -4]} intensity={0.25} color="#aab8d6" />
                <Lattice hoveringRef={hoveringRef} />
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
                        intensity={IS_COARSE_POINTER ? 0.2 : 0.32}
                        luminanceThreshold={0.5}
                        luminanceSmoothing={0.4}
                        mipmapBlur={!IS_COARSE_POINTER}
                        radius={0.4}
                    />
                    <Vignette darkness={0.6} offset={0.3} />
                </EffectComposer>
            </Canvas>
        </div>
    );
}