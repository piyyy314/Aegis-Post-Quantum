/**
 * Quantum AI Models Comparative Benchmark Matrix
 * Compares all 5 custom quantum architectures side-by-side across
 * accuracy, circuit depth, quantum kernel rank, and cryptanalysis defense effectiveness.
 */

import React from "react";
import { Award, CheckCircle2, Cpu, Zap, Activity, ShieldAlert, Layers } from "lucide-react";
import { QuantumBenchmarkRow, QuantumModelId } from "../models/types";

interface QuantumBenchmarkMatrixProps {
  benchmarks: QuantumBenchmarkRow[];
  onSelectModel: (id: QuantumModelId) => void;
  activeModelId: QuantumModelId;
  onRunBenchmarkSweep: () => void;
  isBenchmarking: boolean;
}

export const QuantumBenchmarkMatrix: React.FC<QuantumBenchmarkMatrixProps> = ({
  benchmarks,
  onSelectModel,
  activeModelId,
  onRunBenchmarkSweep,
  isBenchmarking,
}) => {
  return (
    <div className="bg-[#060a13] border border-blue-500/20 rounded-xl p-5 flex flex-col justify-between gap-5 select-none shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#14f7ff]" />
            <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
              Autonomous Quantum AI Model Benchmark Suite
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Empirical evaluation of our 5 proprietary quantum architectures against zero-day cryptographic threats.
          </p>
        </div>

        <button
          onClick={onRunBenchmarkSweep}
          disabled={isBenchmarking}
          className="bg-[#14f7ff]/15 hover:bg-[#14f7ff]/25 border border-[#14f7ff]/50 text-[#14f7ff] font-mono text-xs py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 font-bold"
        >
          {isBenchmarking ? (
            <>
              <Activity className="w-3.5 h-3.5 animate-spin" /> Benchmarking 5 Models...
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" /> Run Automated Benchmark Sweep
            </>
          )}
        </button>
      </div>

      {/* Comparative Table */}
      <div className="overflow-x-auto custom-scrollbar border border-white/5 rounded-lg bg-[#020617]/90 font-mono text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-[#070b1a] text-slate-400 text-[10px] uppercase">
              <th className="p-3">Model Architecture</th>
              <th className="p-3">Classification Accuracy</th>
              <th className="p-3">Circuit Depth</th>
              <th className="p-3">Parameters</th>
              <th className="p-3">Mean Entropy</th>
              <th className="p-3">Advantage Ratio</th>
              <th className="p-3">PQC Target</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[11px]">
            {benchmarks.map(row => {
              const isActive = activeModelId === row.modelId;
              return (
                <tr
                  key={row.modelId}
                  className={`transition-colors ${
                    isActive ? "bg-blue-500/10" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#14f7ff]" />
                      <span className="font-bold text-white">{row.modelName}</span>
                      {isActive && (
                        <span className="text-[9px] bg-[#14f7ff]/20 text-[#14f7ff] px-1.5 py-0.2 rounded font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-emerald-400">{row.accuracy.toFixed(1)}%</span>
                      <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400"
                          style={{ width: `${row.accuracy}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="p-3 text-slate-300">{row.circuitDepth} layers</td>
                  <td className="p-3 text-slate-300">{row.parameterCount} θ params</td>
                  <td className="p-3 text-purple-300">{row.meanEntanglementEntropy.toFixed(3)} bits</td>
                  <td className="p-3">
                    <span className="bg-[#14f7ff]/10 text-[#14f7ff] border border-[#14f7ff]/20 px-2 py-0.5 rounded text-[10px] font-bold">
                      {row.classicalFlopsEquivalent}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 text-[10px]">{row.cryptanalysisResistance}</td>

                  <td className="p-3 text-right">
                    <button
                      onClick={() => onSelectModel(row.modelId)}
                      className={`text-[10px] px-2.5 py-1 rounded border transition-all cursor-pointer font-bold ${
                        isActive
                          ? "bg-[#14f7ff] text-black border-[#14f7ff]"
                          : "bg-transparent text-slate-300 border-white/10 hover:border-[#14f7ff]/50 hover:text-white"
                      }`}
                    >
                      {isActive ? "Selected" : "Switch Model"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Model Architecture Explanations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[10.5px]">
        <div className="bg-[#030712] p-3 rounded-lg border border-white/5 space-y-1">
          <span className="text-[#14f7ff] font-bold block uppercase text-[10px]">
            Hilbert Space Expansion
          </span>
          <p className="text-slate-400 leading-relaxed font-sans text-xs">
            N qubits span a 2^N dimensional complex Hilbert vector space. Classical networks scale quadratically O(D^2), whereas quantum kernels operate directly in exponentially large feature spaces.
          </p>
        </div>

        <div className="bg-[#030712] p-3 rounded-lg border border-white/5 space-y-1">
          <span className="text-emerald-400 font-bold block uppercase text-[10px]">
            Parameter-Shift Gradients
          </span>
          <p className="text-slate-400 leading-relaxed font-sans text-xs">
            Unlike numerical finite differences which accumulate discretization errors, the Parameter-Shift Rule derives exact analytical gradients via quantum expectation shifts without approximation.
          </p>
        </div>

        <div className="bg-[#030712] p-3 rounded-lg border border-white/5 space-y-1">
          <span className="text-purple-400 font-bold block uppercase text-[10px]">
            Quantum Entanglement Security
          </span>
          <p className="text-slate-400 leading-relaxed font-sans text-xs">
            Non-local multi-qubit correlations (measured via Von Neumann entropy) create non-classical decision boundaries capable of detecting sophisticated side-channel and lattice tampering attacks.
          </p>
        </div>
      </div>
    </div>
  );
};
