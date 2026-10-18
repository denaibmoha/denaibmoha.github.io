import { useMemo, useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { EmbeddingResult } from './types';

type Props = { embedding?: EmbeddingResult; selected: number; onSelect: (index: number) => void; paused: boolean; waveform?: Float32Array; generation?: { tokens: number } };
const palette = ['#b8edcb', '#b8edcb', '#e6ae78', '#e6ae78', '#b7c6ef', '#b7c6ef', '#ded9a4', '#ded9a4'];

function NodeLabel({ index, selected, onSelect }: { index: number; selected: boolean; onSelect: () => void }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = selected ? '#d6efc8' : '#172b1c'; ctx.fillRect(0, 0, 96, 64);
    ctx.strokeStyle = '#739460'; ctx.lineWidth = 3; ctx.strokeRect(1, 1, 94, 62);
    ctx.fillStyle = selected ? '#13271a' : '#c4ddbb'; ctx.font = '32px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(index + 1).padStart(2, '0'), 48, 34);
    return new THREE.CanvasTexture(canvas);
  }, [index, selected]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={[0, .27, 0]} scale={[.28, .19, 1]} onClick={event => { event.stopPropagation(); onSelect(); }}><spriteMaterial map={texture} depthTest={false}/></sprite>;
}

function Field({ embedding, selected, onSelect, paused, waveform, generation }: Props) {
  const dust = useRef<THREE.Points>(null);
  const halo = useRef<THREE.Points>(null);
  const constellation = useMemo(() => {
    if (!embedding) return null;
    const positions: number[] = [], colors: number[] = [];
    let seed = 811;
    const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    embedding.points.forEach((point, node) => {
      const color = new THREE.Color(palette[node % palette.length]);
      for (let i = 0; i < 320; i++) {
        const u = random() * Math.PI * 2, v = random() * Math.PI * 2, radius = .1 + random() * .19;
        positions.push(point[0] + Math.cos(u) * radius, point[1] + Math.sin(u) * radius, point[2] + Math.sin(v) * radius * .6);
        colors.push(color.r, color.g, color.b);
      }
    });
    return { positions: new Float32Array(positions), colors: new Float32Array(colors) };
  }, [embedding]);
  const positions = useMemo(() => {
    const points = new Float32Array(2400 * 3);
    let seed = 420;
    const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 2400; i++) {
      const u = random() * Math.PI * 2, v = random() * Math.PI * 2;
      const x = (i / 2400 - .5) * 5;
      const amp = waveform ? Math.abs(waveform[Math.floor(i / 2400 * waveform.length)]) * 3 + .08 : .45 + .35 * Math.sin(u * 3);
      if (generation) { const theta = i / 2400 * Math.PI * 10; const radius = .65 + random() * .42; const phase = Math.min(generation.tokens, 64) * .04; points.set([Math.cos(theta + phase) * radius, (i / 2400 - .5) * 3.7, Math.sin(theta + phase) * radius], i * 3); continue; }
      points.set(waveform ? [x, Math.cos(v) * amp, Math.sin(v) * amp] : [(1.5 + .42 * Math.cos(v)) * Math.cos(u), (1.5 + .42 * Math.cos(v)) * Math.sin(u), .5 * Math.sin(v)], i * 3);
    }
    return points;
  }, [waveform, generation?.tokens]);
  useFrame((state, delta) => {
    if (paused) return;
    if (dust.current && !embedding) dust.current.rotation.z += Math.min(delta, .05) * .06;
    if (halo.current) (halo.current.material as THREE.PointsMaterial).opacity = .45 + Math.sin(state.clock.elapsedTime * 1.4) * .15;
  });
  const neighbors = embedding ? embedding.similarities[selected].map((score, i) => ({ score, i })).filter(x => x.i !== selected).sort((a, b) => b.score - a.score).slice(0, 3) : [];
  return <>
    <points ref={dust} rotation={embedding ? [0, 0, 0] : [-.3, .2, -.3]}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/></bufferGeometry>
      <pointsMaterial color={generation ? "#e6ae78" : "#b8edcb"} size={embedding ? .008 : .015} transparent opacity={embedding ? .08 : .65} depthWrite={false} blending={THREE.AdditiveBlending}/>
    </points>
    {embedding && <>
      {constellation && <points ref={halo}><bufferGeometry><bufferAttribute attach="attributes-position" args={[constellation.positions, 3]}/><bufferAttribute attach="attributes-color" args={[constellation.colors, 3]}/></bufferGeometry><pointsMaterial vertexColors size={.012} transparent opacity={.5} depthWrite={false} blending={THREE.AdditiveBlending}/></points>}
      <gridHelper args={[6, 12, '#314735', '#1d2c21']} position={[0, -2.3, 0]}/>
      {neighbors.map(({ i }, j) => <Line key={i} points={[embedding.points[selected] as [number, number, number], embedding.points[i] as [number, number, number]]} color={j === 0 ? '#b8edcb' : '#657862'} lineWidth={j === 0 ? 1.4 : .7} transparent opacity={.7}/>) }
      {embedding.points.map((point, i) => <group key={i} position={point as [number, number, number]}>
        <mesh onClick={event => { event.stopPropagation(); onSelect(i); }}><sphereGeometry args={[i === selected ? .105 : .065, 20, 16]}/><meshBasicMaterial color={i === selected ? '#fff5de' : palette[i % palette.length]}/></mesh>
        <mesh scale={2}><sphereGeometry args={[i === selected ? .105 : .065, 16, 12]}/><meshBasicMaterial color={palette[i % palette.length]} transparent opacity={.1} depthWrite={false}/></mesh>
        <NodeLabel index={i} selected={selected === i} onSelect={() => onSelect(i)}/>
      </group>)}
    </>}
  </>;
}

export default function VectorScene(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true), [active, setActive] = useState(!document.hidden);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (ref.current) observer.observe(ref.current);
    const update = () => setActive(!document.hidden); document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);
  const paused = props.paused || !visible || !active;
  return <div className="vector-canvas" ref={ref} role="img" aria-label={props.embedding ? 'Three-dimensional PCA projection of your sentence embeddings. Sentence controls and full-dimensional similarities are listed below.' : props.generation ? 'Illustrative token-flow sculpture. Its phase follows the generated token count; it does not show model internals.' : props.waveform ? 'Particle visualization sampled from generated speech audio.' : 'Decorative particle preview. Run an experiment to visualize model output.'}>
    <Canvas camera={{ position: [0, 1, 6.7], fov: 48 }} dpr={[1, 1.5]} frameloop={paused ? 'demand' : 'always'} gl={{ alpha: true, antialias: false }}>
      <Field {...props} paused={paused}/><OrbitControls enablePan={false} enableZoom minDistance={3} maxDistance={11} enableDamping={!paused}/>
    </Canvas>
  </div>;
}
