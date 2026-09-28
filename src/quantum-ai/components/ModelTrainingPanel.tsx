/**
 * Live Interactive Quantum AI Model Training & Parameter Optimization Panel
 * Features real-time epoch stepping, Quantum Adam parameter shift updates,
 * hyperparameter controls, and Recharts metric convergence curves.
 */

import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Cpu,
  TrendingDown,
  Activity,
  Layers,
  Sparkles,
  Sliders,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrainingEpochMetric, QuantumModelId } from "../models/types";
import { EntanglementTopology } from "../models/AegisVQC";

interface ModelTrainingPanelProps {
  modelId: QuantumModelId;
  isTraining: boolean;
  onToggleTraining: () => void;
  onStepEpoch: () => void;
  onResetTraining: () => void;
  epochHistory: TrainingEpochMetric[];
  currentEpoch: number;
  maxEpochs: number;
  numQubits: number;
  onChangeQubits: (n: number) => void;
  layers: number;
  onChangeLayers: (l: number) => void;
  topology: EntanglementTopology;
  onChangeTopology: (t: EntanglementTopology) => void;
  learningRate: number;
  onChangeLearningRate: (lr: number) => void;
  noiseRate: number;
  onChangeNoiseRate: (nr: number) => void;
}

export const ModelTrainingPanel: React.FC<ModelTrainingPanelProps> = ({
  modelId,
  isTraining,
  onToggleTraining,
  onStepEpoch,
  onResetTraining,
  epochHistory,
  currentEpoch,
  maxEpochs,
  numQubits,
  onChangeQubits,
  layers,
  onChangeLayers,
  topology,
  onChangeTopology,
  learningRate,
  onChangeLearningRate,
  noiseRate,
  onChangeNoiseRate,
}) => {
  const latestMetric = epochHistory[epochHistory.length - 1] || {
    epoch: 0,
    loss: 1.0,
    accuracy: 50.0,
    entanglementEntropy: 0.0,
    gradientNorm: 0.0,
  };

  return (
    <div className="bg-[#060a13] border border-blue-500/20 rounded-xl p-5 flex flex-col justify-between gap-5 select-none shadow-2xl">
      {/* Header and Control Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#14f7ff] animate-pulse" />
            <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
              Quantum Training & Parameter Convergence
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Optimizing variational ansatz via exact Parameter-Shift Rule gradients & Quantum Adam optimizer.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={onToggleTraining}
            className={`py-1.5 px-3.5 rounded-lg border flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
              isTraining
                ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            }`}
          >
            {isTraining ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Start Training
              </>
            )}
          </button>

          <button
            onClick={onStepEpoch}
            disabled={isTraining || currentEpoch >= maxEpochs}
            className="py-1.5 px-2.5 rounded-lg border border-white/10 bg-[#0b1222] text-slate-300 hover:text-white hover:border-[#14f7ff]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
            title="Step 1 Epoch"
          >
            <FastForward className="w-3.5 h-3.5" /> Step
          </button>

          <button
            onClick={onResetTraining}
            disabled={isTraining}
            className="py-1.5 px-2.5 rounded-lg border border-white/10 bg-[#0b1222] text-slate-300 hover:text-red-400 hover:border-red-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
            title="Reset Parameters"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>

          <div className="bg-[#0b1222] border border-white/5 py-1 px-2.5 rounded text-[10px] text-slate-300">
            Epoch: <b className="text-[#14f7ff]">{currentEpoch}</b> / {maxEpochs}
          </div>
        </div>
      </div>

      {/* Live KPIs row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-[#030712] p-2.5 rounded-lg border border-white/5 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-[#14f7ff]" /> Quantum Loss (MSE)
          </span>
          <span className="text-base font-bold text-white mt-1">
            {latestMetric.loss.toFixed(4)}
          </span>
        </div>

        <div className="bg-[#030712] p-2.5 rounded-lg border border-white/5 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" /> Accuracy Rate
          </span>
          <span className="text-base font-bold text-emerald-400 mt-1">
            {latestMetric.accuracy.toFixed(1)}%
          </span>
        </div>

        <div className="bg-[#030712] p-2.5 rounded-lg border border-white/5 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" /> Entanglement Entropy
          </span>
          <span className="text-base font-bold text-purple-300 mt-1">
            {latestMetric.entanglementEntropy.toFixed(3)} bits
          </span>
        </div>

        <div className="bg-[#030712] p-2.5 rounded-lg border border-white/5 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-amber-400" /> Gradient Norm ||∇θ||
          </span>
          <span className="text-base font-bold text-amber-300 mt-1">
            {latestMetric.gradientNorm.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Recharts Convergence Curves */}
      <div className="bg-[#020617] border border-white/5 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2 px-1 font-mono text-[10px]">
          <span className="text-slate-400 uppercase tracking-wider">
            Optimization Dynamics (Loss & Accuracy over Epochs)
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#14f7ff]">
              <span className="w-2 h-2 rounded-full bg-[#14f7ff]"></span> Loss (MSE)
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Accuracy (%)
            </span>
          </div>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={epochHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
              <XAxis dataKey="epoch" stroke="#64748b" tick={{ fontSize: 9, fill: "#64748b" }} />
              <YAxis
                yAxisId="loss"
                domain={[0, "auto"]}
                stroke="#14f7ff"
                tick={{ fontSize: 9, fill: "#14f7ff" }}
              />
              <YAxis
                yAxisId="acc"
                orientation="right"
                domain={[0, 100]}
                stroke="#10b981"
                tick={{ fontSize: 9, fill: "#10b981" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#060a13",
                  borderColor: "rgba(59, 130, 246, 0.4)",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                }}
              />
              <Line
                yAxisId="loss"
                type="monotone"
                dataKey="loss"
                name="Loss"
                stroke="#14f7ff"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="acc"
                type="monotone"
                dataKey="accuracy"
                name="Accuracy (%)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hyperparameter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 font-mono text-[10px] bg-[#030712] p-3 rounded-lg border border-white/5">
        {/* Qubits */}
        <div>
          <label className="block text-slate-400 mb-1">
            Qubits: <b className="text-white">{numQubits} Wires</b> (Dim: 2^{numQubits} = {1 << numQubits})
          </label>
          <input
            type="range"
            min={2}
            max={8}
            step={1}
            value={numQubits}
            disabled={isTraining}
            onChange={e => onChangeQubits(Number(e.target.value))}
            className="w-full accent-[#14f7ff] cursor-pointer"
          />
        </div>

        {/* Ansatz Layers */}
        <div>
          <label className="block text-slate-400 mb-1">
            Ansatz Layers: <b className="text-white">{layers} Layers</b>
          </label>
          <input
            type="range"
            min={1}
            max={4}
            step={1}
            value={layers}
            disabled={isTraining}
            onChange={e => onChangeLayers(Number(e.target.value))}
            className="w-full accent-[#14f7ff] cursor-pointer"
          />
        </div>

        {/* Entanglement Topology */}
        <div>
          <label className="block text-slate-400 mb-1">Entanglement Topology:</label>
          <select
            value={topology}
            disabled={isTraining}
            onChange={e => onChangeTopology(e.target.value as EntanglementTopology)}
            className="w-full bg-[#0b1222] border border-white/10 rounded py-1 px-1.5 text-white text-[10px] cursor-pointer"
          >
            <option value="ring">Circular Ring (Periodic)</option>
            <option value="linear">Linear Nearest-Neighbor</option>
            <option value="all-to-all">All-to-All Entanglement</option>
          </select>
        </div>

        {/* Learning Rate */}
        <div>
          <label className="block text-slate-400 mb-1">
            Learning Rate (η): <b className="text-white">{learningRate.toFixed(3)}</b>
          </label>
          <input
            type="range"
            min={0.01}
            max={0.2}
            step={0.01}
            value={learningRate}
            disabled={isTraining}
            onChange={e => onChangeLearningRate(Number(e.target.value))}
            className="w-full accent-[#14f7ff] cursor-pointer"
          />
        </div>

        {/* Noise injection */}
        <div>
          <label className="block text-slate-400 mb-1">
            Depolarizing Noise: <b className="text-white">{(noiseRate * 100).toFixed(1)}%</b>
          </label>
          <input
            type="range"
            min={0}
            max={0.15}
            step={0.01}
            value={noiseRate}
            disabled={isTraining}
            onChange={e => onChangeNoiseRate(Number(e.target.value))}
            className="w-full accent-[#14f7ff] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
