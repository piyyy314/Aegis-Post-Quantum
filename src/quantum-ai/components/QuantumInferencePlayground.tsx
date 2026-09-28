/**
 * Real-Time Quantum Inference & Threat Classification Playground
 * Allows operators to inject threat vectors, tweak telemetry feature sliders,
 * execute statevector / shot measurements, and inspect classification confidence.
 */

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Sliders,
  Play,
  RotateCw,
  Binary,
  Radio,
  FileSearch,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CYBER_SECURITY_DATASETS, CyberScenarioConfig } from "../datasets/cyberSecurityDatasets";
import { QuantumInferenceResult, QuantumModelId } from "../models/types";

interface QuantumInferencePlaygroundProps {
  modelId: QuantumModelId;
  onRunInference: (features: number[], shots: number) => QuantumInferenceResult;
}

export const QuantumInferencePlayground: React.FC<QuantumInferencePlaygroundProps> = ({
  modelId,
  onRunInference,
}) => {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const activeScenario: CyberScenarioConfig = CYBER_SECURITY_DATASETS[selectedScenarioIndex];

  // Dynamic feature sliders (initialized with 1st sample)
  const [features, setFeatures] = useState<number[]>(
    activeScenario.samples[0].features.slice()
  );
  const [shots, setShots] = useState<number>(0); // 0 = analytical statevector
  const [inferenceResult, setInferenceResult] = useState<QuantumInferenceResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Switch scenario
  const handleSelectScenario = (idx: number) => {
    setSelectedScenarioIndex(idx);
    const scen = CYBER_SECURITY_DATASETS[idx];
    setFeatures(scen.samples[0].features.slice());
    setInferenceResult(null);
  };

  // Preset sample selection
  const handleLoadSample = (sampleIdx: number) => {
    const s = activeScenario.samples[sampleIdx];
    setFeatures(s.features.slice());
  };

  const handleExecute = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = onRunInference(features, shots);
      setInferenceResult(res);
      setIsRunning(false);
    }, 80);
  };

  // Format probabilities for chart
  const probChartData = inferenceResult?.probabilities.map((p, idx) => ({
    state: `|${idx.toString(2).padStart(4, "0")}⟩`,
    probability: Math.round(p * 1000) / 10,
  })) || [];

  return (
    <div className="bg-[#060a13] border border-blue-500/20 rounded-xl p-5 flex flex-col justify-between gap-5 select-none shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#14f7ff]" />
          <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
            Cyber Threat Inference & Classification Playground
          </h3>
        </div>

        {/* Scenario Selector */}
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-slate-400">Threat Vector:</span>
          <select
            value={selectedScenarioIndex}
            onChange={e => handleSelectScenario(Number(e.target.value))}
            className="bg-[#0b1222] border border-white/10 rounded py-1 px-2 text-white text-[10px] cursor-pointer"
          >
            {CYBER_SECURITY_DATASETS.map((scen, idx) => (
              <option key={scen.id} value={idx}>
                {scen.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description & Preloaded Samples Banner */}
      <div className="bg-[#030712] p-3 rounded-lg border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="text-xs text-slate-300">
          <span className="font-mono text-[#14f7ff] font-bold block mb-0.5">
            {activeScenario.threatType}
          </span>
          <p className="text-[11px] text-slate-400 leading-snug">{activeScenario.description}</p>
        </div>

        {/* Preloaded Sample buttons */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] shrink-0">
          <span className="text-slate-400 text-[9px] uppercase">Load Preset:</span>
          {activeScenario.samples.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => handleLoadSample(idx)}
              className={`py-1 px-2 rounded border cursor-pointer font-bold ${
                s.label === 1
                  ? "bg-red-950/30 text-red-400 border-red-800/40 hover:bg-red-900/40"
                  : "bg-emerald-950/30 text-emerald-400 border-emerald-800/40 hover:bg-emerald-900/40"
              }`}
            >
              {s.label === 1 ? "⚠️ Threat" : "🛡️ Benign"} #{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Feature Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-mono text-[11px]">
        {activeScenario.featureLabels.map((label, idx) => (
          <div key={idx} className="bg-[#030712] p-3 rounded-lg border border-white/5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-300 text-[10px] font-semibold">{label}</span>
              <span className="text-[#14f7ff] font-bold">{features[idx]?.toFixed(3)} rad</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.PI}
              step={0.02}
              value={features[idx] || 0}
              onChange={e => {
                const next = [...features];
                next[idx] = Number(e.target.value);
                setFeatures(next);
              }}
              className="w-full accent-[#14f7ff] cursor-pointer"
            />
          </div>
        ))}
      </div>

      {/* Execution Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <label className="text-slate-400 flex items-center gap-1.5">
            <Binary className="w-3.5 h-3.5 text-[#14f7ff]" />
            Measurement Mode:
          </label>
          <select
            value={shots}
            onChange={e => setShots(Number(e.target.value))}
            className="bg-[#0b1222] border border-white/10 rounded py-1 px-2 text-white text-[10px] cursor-pointer"
          >
            <option value={0}>Analytical Statevector (Exact)</option>
            <option value={1024}>1,024 Shots (Monte Carlo Detector)</option>
            <option value={4096}>4,096 Shots (High Precision QPU)</option>
          </select>
        </div>

        <button
          onClick={handleExecute}
          disabled={isRunning}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-extrabold text-xs py-2 px-5 rounded-lg flex items-center gap-2 shadow-[0_0_15px_rgba(20,247,255,0.4)] transition-all cursor-pointer disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin" /> Evolving Qubits...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" /> Execute Quantum Inference
            </>
          )}
        </button>
      </div>

      {/* Inference Results Section */}
      {inferenceResult && (
        <div className="mt-2 bg-[#020617] border border-blue-500/25 rounded-lg p-4 space-y-4 animate-fade-in">
          {/* Top Classification Verdict */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-3">
              {inferenceResult.predictedClass === 1 ? (
                <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                  <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
              )}

              <div>
                <span
                  className={`font-mono text-xs font-extrabold tracking-wider uppercase ${
                    inferenceResult.predictedClass === 1 ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {inferenceResult.predictedClass === 1
                    ? "CRITICAL QUANTUM THREAT DETECTED"
                    : "BENIGN / NOMINAL CRYPTOGRAPHIC STATE"}
                </span>
                <p className="text-[11px] text-slate-400 font-sans">
                  Quantum Model Expectation: <b>{inferenceResult.quantumExpectation}</b> (Confidence:{" "}
                  <b>{(inferenceResult.confidence * 100).toFixed(1)}%</b>)
                </p>
              </div>
            </div>

            {/* Quantum Advantage Badge */}
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="bg-[#14f7ff]/10 border border-[#14f7ff]/30 text-[#14f7ff] px-2.5 py-1 rounded">
                Hilbert Space Scale: <b>{inferenceResult.quantumAdvantageRatio}x</b>
              </span>
              <span className="bg-purple-950/60 border border-purple-800/40 text-purple-300 px-2.5 py-1 rounded">
                QPU Execution: <b>{inferenceResult.inferenceTimeMs} ms</b>
              </span>
            </div>
          </div>

          {/* Basis State Probability Distribution Chart */}
          <div>
            <div className="flex justify-between items-center mb-1.5 font-mono text-[10px] text-slate-400">
              <span>Superposition Basis State Probabilities (|0000⟩ to |1111⟩)</span>
              <span>Von Neumann S: {inferenceResult.entanglementEntropy.toFixed(3)} bits</span>
            </div>

            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={probChartData.slice(0, 16)}>
                  <XAxis dataKey="state" stroke="#64748b" tick={{ fontSize: 8, fill: "#64748b" }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 8, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#060a13",
                      borderColor: "rgba(59, 130, 246, 0.4)",
                      fontSize: "10px",
                      fontFamily: "monospace",
                    }}
                  />
                  <Bar dataKey="probability" name="Probability (%)">
                    {probChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index % 2 === 0 ? "#14f7ff" : "#3b82f6"}
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
