import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

type Props = { mode: number; paused: boolean };

// Seeded sampling keeps the sculpture stable across reloads and mode changes.
function generateShapes(count: number) {
  let seed = 2048;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const shapes = [new Float32Array(count * 3), new Float32Array(count * 3), new Float32Array(count * 3)];
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = random() * Math.PI * 2;
    const v = random() * Math.PI * 2;
    const depth = 0.93 + random() * 0.14;
    // Language: a continuously twisted, densely sampled toroidal surface.
    const radius = 1.45 + 0.48 * Math.cos(v + 3 * u);
    shapes[0].set([radius * Math.cos(u) * depth, radius * Math.sin(u) * depth, 0.66 * Math.sin(v + 3 * u)], i * 3);
    // Memory: a layered sphere with open latitude bands.
    const latitude = Math.acos(2 * random() - 1);
    const r = 1.63 + 0.13 * Math.sin(latitude * 18);
    shapes[1].set([r * Math.sin(latitude) * Math.cos(u), r * Math.cos(latitude), r * Math.sin(latitude) * Math.sin(u)], i * 3);
    // Voice: a spatial waveform, sampled in concentric cross-sections.
    const x = (random() - 0.5) * 4.1;
    const envelope = 0.15 + 0.95 * Math.pow(Math.cos(x * 0.64), 2) * (0.45 + 0.55 * Math.pow(Math.sin(x * 6), 2));
    shapes[2].set([x, Math.cos(v) * envelope, Math.sin(v) * envelope], i * 3);
    const color = new THREE.Color(u > 4.6 && u < 5.0 ? '#e6ae78' : '#b8edcb');
    color.multiplyScalar(0.5 + random() * 0.5);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  return { shapes, colors };
}

function Sculpture({ mode, paused }: Props) {
  const group = useRef<THREE.Group>(null);
  const points = useRef<THREE.Points>(null);
  const invalidate = useThree(s => s.invalidate);
  const count = window.matchMedia('(max-width: 600px)').matches ? 6500 : 12500;
  const { shapes, colors } = useMemo(() => generateShapes(count), [count]);
  const positions = useMemo(() => shapes[0].slice(), [shapes]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vColor;
      void main() { vColor = color; vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp(10.0 / -mv.z, 1.0, 3.5); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vColor;
      void main() { float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard;
      float a = smoothstep(0.5, 0.08, d); gl_FragColor = vec4(vColor, a * 0.82); }`,
  }), []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    if (paused && points.current) {
      positions.set(shapes[mode]);
      points.current.geometry.attributes.position.needsUpdate = true;
    }
    invalidate();
  }, [mode, paused, positions, shapes, invalidate]);
  useFrame((state, delta) => {
    if (!points.current || !group.current || paused) return;
    const blend = 1 - Math.exp(-Math.min(delta, 0.05) * 3.2);
    const target = shapes[mode];
    for (let i = 0; i < positions.length; i++) positions[i] += (target[i] - positions[i]) * blend;
    points.current.geometry.attributes.position.needsUpdate = true;
    group.current.rotation.y += Math.min(delta, 0.05) * 0.075;
    group.current.rotation.x = -0.43 + Math.sin(state.clock.elapsedTime * 0.18) * 0.08;
  });
  return <group ref={group} rotation={[-0.43, 0.25, -0.4]}>
    <points ref={points} material={material}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/><bufferAttribute attach="attributes-color" args={[colors, 3]}/></bufferGeometry>
    </points>
  </group>;
}

export default function ParticleScene(props: Props) {
  return <Canvas camera={{ position: [0, 0, 5.8], fov: 43 }} dpr={[1, 1.6]} frameloop={props.paused ? 'demand' : 'always'} gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }} onCreated={({ gl }) => { gl.setClearColor('#101311', 0); gl.domElement.setAttribute('aria-hidden', 'true'); }}>
    <Sculpture {...props}/>
    <OrbitControls enableZoom={false} enablePan={false} enableDamping={!props.paused} rotateSpeed={0.45}/>
  </Canvas>;
}
