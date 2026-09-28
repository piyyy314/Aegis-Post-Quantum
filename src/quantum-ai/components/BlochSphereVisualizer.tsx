/**
 * Interactive 3D Canvas Bloch Sphere Visualizer
 * Renders the full single-qubit quantum state vector on the Bloch sphere
 * with orbit controls, spherical coordinates, phase color, and purity indicator.
 */

import React, { useRef, useEffect, useState } from "react";
import { BlochCoordinates } from "../core/QuantumState";
import { RotateCw, Compass, Eye, ShieldCheck, Zap } from "lucide-react";

interface BlochSphereProps {
  coordinates: BlochCoordinates;
  qubitIndex: number;
  totalQubits: number;
  onSelectQubit?: (q: number) => void;
  entropy?: number;
}

export const BlochSphereVisualizer: React.FC<BlochSphereProps> = ({
  coordinates,
  qubitIndex,
  totalQubits,
  onSelectQubit,
  entropy = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport rotation angles (Euler yaw and pitch)
  const [rotX, setRotX] = useState<number>(0.35); // Pitch
  const [rotY, setRotY] = useState<number>(-0.65); // Yaw
  const isDragging = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse drag handler for 3D rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    setRotY(prev => prev + dx * 0.015);
    setRotX(prev => Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, prev + dy * 0.015)));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Render Bloch Sphere on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.36;

    ctx.clearRect(0, 0, width, height);

    // 3D Rotation helper
    const project = (x3: number, y3: number, z3: number): { x2: number; y2: number; zDepth: number } => {
      // 1. Rotate around Y axis (rotY)
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = x3 * cosY + z3 * sinY;
      const y1 = y3;
      const z1 = -x3 * sinY + z3 * cosY;

      // 2. Rotate around X axis (rotX)
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      // Perspective projection
      const cameraDistance = 3.5;
      const factor = radius / (cameraDistance - z2 / radius);

      return {
        x2: centerX + x2 * factor,
        y2: centerY - y2 * factor, // Canvas Y is inverted
        zDepth: z2,
      };
    };

    // Draw ambient background glow
    const radialGlow = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius * 1.3);
    radialGlow.addColorStop(0, "rgba(20, 247, 255, 0.08)");
    radialGlow.addColorStop(0.7, "rgba(59, 130, 246, 0.04)");
    radialGlow.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = radialGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // 1. Draw Equator (XY plane, z=0)
    ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const p = project(x, y, 0);
      if (i === 0) ctx.moveTo(p.x2, p.y2);
      else ctx.lineTo(p.x2, p.y2);
    }
    ctx.stroke();

    // 2. Draw Prime Meridian (XZ plane, y=0)
    ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      const p = project(x, 0, z);
      if (i === 0) ctx.moveTo(p.x2, p.y2);
      else ctx.lineTo(p.x2, p.y2);
    }
    ctx.stroke();

    // 3. Draw Outer Wireframe Silhouette
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(30, 58, 138, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * (radius / (3.5 * radius)), 0, Math.PI * 2);
    ctx.stroke();

    // 4. Draw Cartesian Axes: X, Y, Z
    const axisLen = radius * 1.35;
    const origin = project(0, 0, 0);

    const drawAxis = (x: number, y: number, z: number, color: string, label: string) => {
      const tip = project(x, y, z);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(origin.x2, origin.y2);
      ctx.lineTo(tip.x2, tip.y2);
      ctx.stroke();

      // Axis label
      ctx.fillStyle = color;
      ctx.font = "bold 10px monospace";
      ctx.fillText(label, tip.x2 + 4, tip.y2 + 4);
    };

    drawAxis(axisLen, 0, 0, "rgba(239, 68, 68, 0.7)", "+X |+⟩");
    drawAxis(0, axisLen, 0, "rgba(16, 185, 129, 0.7)", "+Y |+i⟩");
    drawAxis(0, 0, axisLen, "rgba(20, 247, 255, 0.9)", "|0⟩ (+Z)");
    drawAxis(0, 0, -axisLen, "rgba(147, 51, 234, 0.8)", "|1⟩ (-Z)");

    // 5. Draw Quantum State Vector |psi>
    const svX = coordinates.x * radius;
    const svY = coordinates.y * radius;
    const svZ = coordinates.z * radius;
    const stateTip = project(svX, svY, svZ);

    // Glow on state vector
    ctx.strokeStyle = "#14f7ff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#14f7ff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(origin.x2, origin.y2);
    ctx.lineTo(stateTip.x2, stateTip.y2);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // State Tip Qubit Sphere
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(stateTip.x2, stateTip.y2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#14f7ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(stateTip.x2, stateTip.y2, 7, 0, Math.PI * 2);
    ctx.stroke();

    // Projected Shadow onto XY plane
    const shadowTip = project(svX, svY, 0);
    ctx.strokeStyle = "rgba(20, 247, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(stateTip.x2, stateTip.y2);
    ctx.lineTo(shadowTip.x2, shadowTip.y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(origin.x2, origin.y2);
    ctx.lineTo(shadowTip.x2, shadowTip.y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [coordinates, rotX, rotY]);

  // Derived quantum state probabilities
  const prob0 = Math.max(0, Math.min(1, (1 + coordinates.z) / 2));
  const prob1 = 1 - prob0;

  return (
    <div className="bg-[#060a13] border border-blue-500/20 rounded-xl p-4 flex flex-col justify-between select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#14f7ff] animate-spin-slow" />
          <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            Qubit {qubitIndex} Bloch Sphere
          </h4>
        </div>

        {/* Qubit Selector */}
        {totalQubits > 1 && onSelectQubit && (
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <span className="text-slate-400">Select:</span>
            {Array.from({ length: totalQubits }, (_, i) => (
              <button
                key={i}
                onClick={() => onSelectQubit(i)}
                className={`w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer font-bold ${
                  qubitIndex === i
                    ? "bg-[#14f7ff] text-black shadow-[0_0_8px_rgba(20,247,255,0.5)]"
                    : "bg-[#0b1222] text-slate-400 hover:text-white border border-white/5"
                }`}
              >
                q{i}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3D Canvas Area */}
      <div
        className="relative w-full aspect-square max-h-[260px] flex items-center justify-center cursor-grab active:cursor-grabbing bg-[#030712] rounded-lg border border-white/5 overflow-hidden group"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Floating Hint */}
        <div className="absolute bottom-2 left-2 pointer-events-none text-[8.5px] font-mono text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <Eye className="w-3 h-3" /> Drag to rotate 3D view
        </div>

        {/* Reset Camera Button */}
        <button
          onClick={() => {
            setRotX(0.35);
            setRotY(-0.65);
          }}
          className="absolute top-2 right-2 p-1.5 rounded bg-black/50 hover:bg-black/80 text-slate-400 hover:text-[#14f7ff] border border-white/10 transition-colors text-[9px] font-mono flex items-center gap-1 cursor-pointer"
          title="Reset View"
        >
          <RotateCw className="w-3 h-3" />
        </button>
      </div>

      {/* Telemetry Metrics & Quantum Basis Probabilities */}
      <div className="mt-3 space-y-2 font-mono text-[10px]">
        {/* Coordinates row */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-[#0b1222] p-1.5 rounded border border-white/5">
            <span className="text-red-400 block text-[9px]">X: Re(ρ₀₁)</span>
            <span className="text-white font-bold">{coordinates.x.toFixed(3)}</span>
          </div>
          <div className="bg-[#0b1222] p-1.5 rounded border border-white/5">
            <span className="text-emerald-400 block text-[9px]">Y: Im(ρ₁₀)</span>
            <span className="text-white font-bold">{coordinates.y.toFixed(3)}</span>
          </div>
          <div className="bg-[#0b1222] p-1.5 rounded border border-white/5">
            <span className="text-[#14f7ff] block text-[9px]">Z: ρ₀₀ - ρ₁₁</span>
            <span className="text-white font-bold">{coordinates.z.toFixed(3)}</span>
          </div>
        </div>

        {/* Superposition Probability Bar */}
        <div className="bg-[#0b1222] p-2 rounded border border-white/5 space-y-1">
          <div className="flex justify-between text-[9px]">
            <span className="text-[#14f7ff] font-bold">|0⟩ Basis: {(prob0 * 100).toFixed(1)}%</span>
            <span className="text-purple-400 font-bold">|1⟩ Basis: {(prob1 * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full h-1.5 bg-purple-950/60 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#14f7ff] transition-all duration-300"
              style={{ width: `${prob0 * 100}%` }}
            />
          </div>
        </div>

        {/* Purity & Entanglement Entropy */}
        <div className="flex justify-between items-center px-1 text-[9px] text-slate-400 pt-1">
          <span>
            Purity Tr(ρ²): <b className="text-emerald-400 font-bold">{coordinates.purity.toFixed(3)}</b>
          </span>
          <span>
            Von Neumann S: <b className="text-amber-400 font-bold">{entropy.toFixed(3)} bits</b>
          </span>
        </div>
      </div>
    </div>
  );
};
