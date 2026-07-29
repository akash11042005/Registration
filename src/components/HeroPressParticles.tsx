// ============================================================
// 3D particle-cloud hero illustration — a polycrystalline grain
// structure (the metallurgical kind: many crystal grains packed
// together, each its own orientation/color, separated by grain
// boundaries) rendered as one dense, glowing particle mass in a
// starfield, with bloom post-processing for real glow polish.
// Three.js / React Three Fiber / postprocessing.
// ============================================================
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// A curated palette echoing real EBSD/grain-orientation maps — each
// grain gets one of these, so adjacent grains contrast clearly.
const GRAIN_COLORS = [
    '#facc15', // gold
    '#d4a017', // amber
    '#fff6d6', // warm white
    '#9db8ff', // ice blue
    '#5b6fd6', // navy-light
    '#ffe08a', // pale gold
    '#7d8fe8', // periwinkle
].map((c) => new THREE.Color(c));

interface GrainDef {
    center: THREE.Vector3;
    radius: number;
    color: THREE.Color;
}

// Places grain centers on a jittered spherical (golden-angle) lattice
// so the whole cluster reads as ONE rounded mass — closer grains
// overlap slightly, which is what makes boundaries visible at all.
function useGrainDefs(grainCount: number) {
    return useMemo<GrainDef[]>(() => {
        const grains: GrainDef[] = [];
        const golden = Math.PI * (3 - Math.sqrt(5));

        for (let i = 0; i < grainCount; i++) {
            const t = i / Math.max(1, grainCount - 1);
            const y = 1 - t * 2;
            const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
            const theta = golden * i;

            const jitter = 0.22;
            const cx = (Math.cos(theta) * radiusAtY + (Math.random() - 0.5) * jitter) * 1.7;
            const cy = (y + (Math.random() - 0.5) * jitter) * 1.7;
            const cz = (Math.sin(theta) * radiusAtY + (Math.random() - 0.5) * jitter) * 1.7;

            grains.push({
                center: new THREE.Vector3(cx, cy, cz),
                radius: 0.85 + Math.random() * 0.55,
                color: GRAIN_COLORS[i % GRAIN_COLORS.length],
            });
        }
        return grains;
    }, [grainCount]);
}

// Denser toward each grain's core, softer toward its edge — what makes
// it read as a solid glowing crystal rather than a haze.
function sampleInGrain(center: THREE.Vector3, radius: number): THREE.Vector3 {
    const u = Math.random();
    const r = radius * Math.cbrt(u) * (0.55 + 0.45 * Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return new THREE.Vector3(
        center.x + r * Math.sin(phi) * Math.cos(theta),
        center.y + r * Math.sin(phi) * Math.sin(theta),
        center.z + r * Math.cos(phi)
    );
}

function useCrystalGeometry(totalCount: number, grainCount: number) {
    const grains = useGrainDefs(grainCount);

    return useMemo(() => {
        const positions = new Float32Array(totalCount * 3);
        const colors = new Float32Array(totalCount * 3);
        const sizes = new Float32Array(totalCount);
        const perGrain = Math.floor(totalCount / grains.length);

        let i = 0;
        for (const grain of grains) {
            for (let s = 0; s < perGrain && i < totalCount; s++, i++) {
                const p = sampleInGrain(grain.center, grain.radius);
                positions[i * 3] = p.x;
                positions[i * 3 + 1] = p.y;
                positions[i * 3 + 2] = p.z;

                const shade = grain.color.clone().lerp(new THREE.Color('#ffffff'), Math.random() * 0.2);
                colors[i * 3] = shade.r;
                colors[i * 3 + 1] = shade.g;
                colors[i * 3 + 2] = shade.b;

                // Occasional brighter "sparkle" particles for texture.
                sizes[i] = Math.random() > 0.96 ? 1.8 : 1.0;
            }
        }
        const last = grains[grains.length - 1];
        for (; i < totalCount; i++) {
            const p = sampleInGrain(last.center, last.radius);
            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = p.z;
            colors[i * 3] = last.color.r;
            colors[i * 3 + 1] = last.color.g;
            colors[i * 3 + 2] = last.color.b;
            sizes[i] = 1.0;
        }

        return { positions, colors, sizes, grains };
    }, [totalCount, grains]);
}

function CrystalCluster() {
    const { positions, colors, grains } = useCrystalGeometry(22000, 9);
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.14;
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.09;
            groupRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.09) * 0.05;
        }
    });

    const boundaryLines = useMemo(() => {
        const lines: [THREE.Vector3, THREE.Vector3][] = [];
        for (let a = 0; a < grains.length; a++) {
            for (let b = a + 1; b < grains.length; b++) {
                const d = grains[a].center.distanceTo(grains[b].center);
                if (d < 1.9) lines.push([grains[a].center, grains[b].center]);
            }
        }
        return lines;
    }, [grains]);

    return (
        <group ref={groupRef} rotation={[0.2, 0.5, 0.05]}>
            <points>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                    <bufferAttribute attach="attributes-color" args={[colors, 3]} />
                </bufferGeometry>
                <pointsMaterial
                    size={0.03}
                    vertexColors
                    transparent
                    opacity={0.95}
                    sizeAttenuation
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            {boundaryLines.map(([a, b], idx) => (
                <line key={idx}>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            args={[new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z]), 3]}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial color="#facc15" transparent opacity={0.1} />
                </line>
            ))}
        </group>
    );
}

export default function HeroPressParticles() {
    return (
        <div className="relative w-full max-w-lg mx-auto aspect-square">
            <Canvas
                camera={{ position: [0, 0, 8.5], fov: 40 }}
                dpr={[1, 2]}
                gl={{ antialias: true, alpha: true }}
            >
                <Stars radius={30} depth={20} count={1600} factor={1.5} saturation={0} fade speed={0.35} />
                <ambientLight intensity={0.5} />
                <pointLight position={[4, 3, 5]} intensity={0.6} color="#facc15" />
                <CrystalCluster />
                <EffectComposer>
                    <Bloom intensity={0.9} luminanceThreshold={0.15} luminanceSmoothing={0.4} mipmapBlur radius={0.6} />
                    <Vignette darkness={0.55} offset={0.25} />
                </EffectComposer>
            </Canvas>

            <div className="pointer-events-none absolute inset-x-0 top-4 text-center">
                <span className="text-[9px] font-medium tracking-[0.2em] text-gold-400/70 uppercase">
                </span>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center">
                <span className="text-[11px] font-semibold tracking-[0.3em] text-gold-400/70 uppercase">
                </span>
            </div>
        </div>
    );
}