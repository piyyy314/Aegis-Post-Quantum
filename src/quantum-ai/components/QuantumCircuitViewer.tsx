/**
 * Interactive SVG Quantum Circuit Diagram Viewer
 * Renders qubit wires, quantum logic gates, entangling CNOT bridges,
 * parameter tooltips, and circuit complexity statistics.
 */

import React, { useState } from "react";
import { QuantumCircuit, CircuitInstruction } from "../core/QuantumCircuit";
import { Cpu, Layers, Maximize2, Zap } from "lucide-react";

interface QuantumCircuitViewerProps {
  circuit: QuantumCircuit;
  title?: string;
  highlightGateId?: string;
}

export const QuantumCircuitViewer: React.FC<QuantumCircuitViewerProps> = ({
  circuit,
  title = "Variational Quantum Circuit Architecture",
  highlightGateId,
}) => {
  const [selectedInstruction, setSelectedInstruction] = useState<CircuitInstruction | null>(null);

  const metrics = circuit.getMetrics();
  const numQubits = circuit.numQubits;
  const wireHeight = 44;
  const colWidth = 56;
  const leftPadding = 64;
  const rightPadding = 48;
  const topPadding = 30;

  // Lay out instructions on a time-step grid
  const qubitNextSlot = new Array(numQubits).fill(0);
  const layoutGates: {
    inst: CircuitInstruction;
    slot: number;
    colX: number;
    targetsY: number[];
    controlsY?: number[];
  }[] = [];

  for (const inst of circuit.instructions) {
    let slot = 0;
    const affectedQubits = [...inst.targets, ...(inst.controls || [])];
    for (const q of affectedQubits) {
      slot = Math.max(slot, qubitNextSlot[q]);
    }

    const colX = leftPadding + slot * colWidth;
    const targetsY = inst.targets.map(t => topPadding + t * wireHeight);
    const controlsY = inst.controls?.map(c => topPadding + c * wireHeight);

    layoutGates.push({
      inst,
      slot,
      colX,
      targetsY,
      controlsY,
    });

    for (const q of affectedQubits) {
      qubitNextSlot[q] = slot + 1;
    }
  }

  const maxSlots = Math.max(4, ...qubitNextSlot);
  const totalSvgWidth = leftPadding + maxSlots * colWidth + rightPadding;
  const totalSvgHeight = topPadding + numQubits * wireHeight + 10;

  const getGateColor = (type: string) => {
    switch (type) {
      case "H":
        return { fill: "rgba(59, 130, 246, 0.2)", stroke: "#3b82f6", text: "#93c5fd" };
      case "X":
      case "Y":
      case "Z":
        return { fill: "rgba(239, 68, 68, 0.2)", stroke: "#ef4444", text: "#fca5a5" };
      case "Rx":
      case "Ry":
      case "Rz":
      case "Phase":
        return { fill: "rgba(20, 247, 255, 0.15)", stroke: "#14f7ff", text: "#e0f2fe" };
      case "CNOT":
      case "CZ":
      case "CRy":
        return { fill: "rgba(168, 85, 247, 0.2)", stroke: "#a855f7", text: "#e9d5ff" };
      default:
        return { fill: "rgba(100, 116, 139, 0.2)", stroke: "#64748b", text: "#cbd5e1" };
    }
  };

  return (
    <div className="bg-[#060a13] border border-blue-500/20 rounded-xl p-4 flex flex-col justify-between select-none">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-2 mb-3 gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#14f7ff]" />
          <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
        </div>

        {/* Circuit Stats Pills */}
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="bg-blue-950/60 border border-blue-800/40 text-blue-300 px-2 py-0.5 rounded">
            Depth: <b>{metrics.circuitDepth}</b>
          </span>
          <span className="bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 px-2 py-0.5 rounded">
            Gates: <b>{metrics.totalGates}</b>
          </span>
          <span className="bg-purple-950/60 border border-purple-800/40 text-purple-300 px-2 py-0.5 rounded">
            CNOT Entanglers: <b>{metrics.cnotCount}</b>
          </span>
          <span className="bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 px-2 py-0.5 rounded">
            Wires: <b>{metrics.numQubits}</b>
          </span>
        </div>
      </div>

      {/* SVG Canvas Container with Horizontal Scroll */}
      <div className="w-full overflow-x-auto custom-scrollbar bg-[#020617]/90 rounded-lg border border-white/5 p-2">
        <svg
          width={Math.max(680, totalSvgWidth)}
          height={totalSvgHeight}
          className="min-w-full font-mono text-[11px]"
        >
          {/* Wire Lines and Qubit Labels */}
          {Array.from({ length: numQubits }, (_, q) => {
            const wireY = topPadding + q * wireHeight;
            return (
              <g key={`wire_${q}`}>
                {/* Qubit Initial State label |q_i⟩ */}
                <text
                  x={12}
                  y={wireY + 4}
                  fill="#94a3b8"
                  fontWeight="bold"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  |q{q}⟩
                </text>

                {/* Horizontal wire track */}
                <line
                  x1={leftPadding - 16}
                  y1={wireY}
                  x2={totalSvgWidth - 16}
                  y2={wireY}
                  stroke="rgba(59, 130, 246, 0.25)"
                  strokeWidth="1.5"
                />

                {/* Measurement Gauge Icon at wire terminus */}
                <g transform={`translate(${totalSvgWidth - 32}, ${wireY - 8})`}>
                  <rect
                    width="18"
                    height="16"
                    rx="3"
                    fill="rgba(15, 23, 42, 0.8)"
                    stroke="rgba(20, 247, 255, 0.4)"
                    strokeWidth="1"
                  />
                  <path
                    d="M 3 12 A 6 6 0 0 1 15 12 M 9 12 L 13 6"
                    stroke="#14f7ff"
                    strokeWidth="1.2"
                    fill="none"
                  />
                </g>
              </g>
            );
          })}

          {/* Render Gate Operations */}
          {layoutGates.map(({ inst, colX, targetsY, controlsY }) => {
            const colors = getGateColor(inst.type);
            const isHighlighted = highlightGateId === inst.id || selectedInstruction?.id === inst.id;
            const targetY = targetsY[0];

            // 1. Two-Qubit Entangling Gates (CNOT, CZ, CRy)
            if (inst.controls && inst.controls.length > 0) {
              const controlY = controlsY![0];

              return (
                <g
                  key={inst.id}
                  className="cursor-pointer group"
                  onClick={() => setSelectedInstruction(inst)}
                >
                  {/* Vertical Connection Wire */}
                  <line
                    x1={colX}
                    y1={Math.min(controlY, targetY)}
                    x2={colX}
                    y2={Math.max(controlY, targetY)}
                    stroke={isHighlighted ? "#14f7ff" : colors.stroke}
                    strokeWidth={isHighlighted ? 2.5 : 1.8}
                  />

                  {/* Control Node (Black dot with cyan pulse) */}
                  <circle
                    cx={colX}
                    cy={controlY}
                    r={5}
                    fill={isHighlighted ? "#14f7ff" : "#a855f7"}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />

                  {/* Target Node: Crosshairs circle for CNOT */}
                  {inst.type === "CNOT" ? (
                    <g>
                      <circle
                        cx={colX}
                        cy={targetY}
                        r={11}
                        fill="#030712"
                        stroke={isHighlighted ? "#14f7ff" : "#a855f7"}
                        strokeWidth={2}
                      />
                      {/* Plus symbol inside target */}
                      <line
                        x1={colX - 8}
                        y1={targetY}
                        x2={colX + 8}
                        y2={targetY}
                        stroke={isHighlighted ? "#14f7ff" : "#a855f7"}
                        strokeWidth={1.8}
                      />
                      <line
                        x1={colX}
                        y1={targetY - 8}
                        x2={colX}
                        y2={targetY + 8}
                        stroke={isHighlighted ? "#14f7ff" : "#a855f7"}
                        strokeWidth={1.8}
                      />
                    </g>
                  ) : (
                    // Regular Controlled Box for CZ or CRy
                    <g>
                      <rect
                        x={colX - 16}
                        y={targetY - 14}
                        width={32}
                        height={28}
                        rx={5}
                        fill={isHighlighted ? "rgba(20, 247, 255, 0.3)" : colors.fill}
                        stroke={isHighlighted ? "#14f7ff" : colors.stroke}
                        strokeWidth={1.8}
                      />
                      <text
                        x={colX}
                        y={targetY + 4}
                        fill={colors.text}
                        fontWeight="bold"
                        fontSize="10"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {inst.type}
                      </text>
                    </g>
                  )}
                </g>
              );
            }

            // 2. Single Qubit Gate Box
            let labelText = inst.type;
            let subText = "";
            const paramVal = inst.paramValue ?? (inst.paramName ? circuit.parameters.get(inst.paramName) : undefined);
            if (paramVal !== undefined) {
              subText = `(${(paramVal / Math.PI).toFixed(2)}π)`;
            }

            return (
              <g
                key={inst.id}
                className="cursor-pointer group"
                onClick={() => setSelectedInstruction(inst)}
              >
                <rect
                  x={colX - 17}
                  y={targetY - 15}
                  width={34}
                  height={30}
                  rx={5}
                  fill={isHighlighted ? "rgba(20, 247, 255, 0.35)" : colors.fill}
                  stroke={isHighlighted ? "#14f7ff" : colors.stroke}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  className="transition-all"
                />
                <text
                  x={colX}
                  y={subText ? targetY - 1 : targetY + 4}
                  fill={colors.text}
                  fontWeight="bold"
                  fontSize="11"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {labelText}
                </text>
                {subText && (
                  <text
                    x={colX}
                    y={targetY + 10}
                    fill="#14f7ff"
                    fontSize="7.5"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {subText}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Gate Inspection HUD */}
      {selectedInstruction && (
        <div className="mt-2.5 bg-[#0b1222] border border-blue-500/25 p-2 rounded-lg flex items-center justify-between text-[10px] font-mono text-slate-300 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-[#14f7ff] font-bold">Selected Gate: {selectedInstruction.type}</span>
            <span>Target: [q{selectedInstruction.targets.join(", q")}]</span>
            {selectedInstruction.controls && (
              <span>Control: [q{selectedInstruction.controls.join(", q")}]</span>
            )}
            {selectedInstruction.paramValue !== undefined && (
              <span className="text-amber-400">
                Angle: {selectedInstruction.paramValue.toFixed(4)} rad (
                {((selectedInstruction.paramValue * 180) / Math.PI).toFixed(1)}°)
              </span>
            )}
          </div>
          <button
            onClick={() => setSelectedInstruction(null)}
            className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕ Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
