/**
 * Quantum Circuit Builder and Execution Pipeline
 * Supports parameterized variational circuits, multi-qubit entangling topologies,
 * circuit metrics (depth, gate counts), and diagram rendering layout data.
 */

import { QuantumGates, Matrix2x2 } from "./QuantumGates";
import { QuantumState } from "./QuantumState";

export type GateType = 
  | "H" 
  | "X" 
  | "Y" 
  | "Z" 
  | "S" 
  | "T" 
  | "Rx" 
  | "Ry" 
  | "Rz" 
  | "Phase" 
  | "CNOT" 
  | "CZ" 
  | "SWAP" 
  | "CRy";

export interface CircuitInstruction {
  id: string;
  type: GateType;
  targets: number[];
  controls?: number[];
  paramName?: string;
  paramValue?: number;
  label?: string;
}

export interface CircuitMetrics {
  numQubits: number;
  circuitDepth: number;
  totalGates: number;
  cnotCount: number;
  parameterCount: number;
}

export class QuantumCircuit {
  readonly numQubits: number;
  instructions: CircuitInstruction[] = [];
  parameters: Map<string, number> = new Map();

  constructor(numQubits: number) {
    this.numQubits = numQubits;
  }

  // Gate additions
  h(target: number): this {
    this.instructions.push({
      id: `H_${target}_${this.instructions.length}`,
      type: "H",
      targets: [target],
    });
    return this;
  }

  x(target: number): this {
    this.instructions.push({
      id: `X_${target}_${this.instructions.length}`,
      type: "X",
      targets: [target],
    });
    return this;
  }

  y(target: number): this {
    this.instructions.push({
      id: `Y_${target}_${this.instructions.length}`,
      type: "Y",
      targets: [target],
    });
    return this;
  }

  z(target: number): this {
    this.instructions.push({
      id: `Z_${target}_${this.instructions.length}`,
      type: "Z",
      targets: [target],
    });
    return this;
  }

  s(target: number): this {
    this.instructions.push({
      id: `S_${target}_${this.instructions.length}`,
      type: "S",
      targets: [target],
    });
    return this;
  }

  t(target: number): this {
    this.instructions.push({
      id: `T_${target}_${this.instructions.length}`,
      type: "T",
      targets: [target],
    });
    return this;
  }

  rx(target: number, thetaOrParam: number | string): this {
    const isParam = typeof thetaOrParam === "string";
    this.instructions.push({
      id: `Rx_${target}_${this.instructions.length}`,
      type: "Rx",
      targets: [target],
      paramName: isParam ? thetaOrParam : undefined,
      paramValue: isParam ? undefined : thetaOrParam,
    });
    if (isParam && !this.parameters.has(thetaOrParam)) {
      this.parameters.set(thetaOrParam, 0);
    }
    return this;
  }

  ry(target: number, thetaOrParam: number | string): this {
    const isParam = typeof thetaOrParam === "string";
    this.instructions.push({
      id: `Ry_${target}_${this.instructions.length}`,
      type: "Ry",
      targets: [target],
      paramName: isParam ? thetaOrParam : undefined,
      paramValue: isParam ? undefined : thetaOrParam,
    });
    if (isParam && !this.parameters.has(thetaOrParam)) {
      this.parameters.set(thetaOrParam, 0);
    }
    return this;
  }

  rz(target: number, thetaOrParam: number | string): this {
    const isParam = typeof thetaOrParam === "string";
    this.instructions.push({
      id: `Rz_${target}_${this.instructions.length}`,
      type: "Rz",
      targets: [target],
      paramName: isParam ? thetaOrParam : undefined,
      paramValue: isParam ? undefined : thetaOrParam,
    });
    if (isParam && !this.parameters.has(thetaOrParam)) {
      this.parameters.set(thetaOrParam, 0);
    }
    return this;
  }

  cnot(control: number, target: number): this {
    this.instructions.push({
      id: `CNOT_${control}_${target}_${this.instructions.length}`,
      type: "CNOT",
      controls: [control],
      targets: [target],
    });
    return this;
  }

  cz(control: number, target: number): this {
    this.instructions.push({
      id: `CZ_${control}_${target}_${this.instructions.length}`,
      type: "CZ",
      controls: [control],
      targets: [target],
    });
    return this;
  }

  cry(control: number, target: number, thetaOrParam: number | string): this {
    const isParam = typeof thetaOrParam === "string";
    this.instructions.push({
      id: `CRy_${control}_${target}_${this.instructions.length}`,
      type: "CRy",
      controls: [control],
      targets: [target],
      paramName: isParam ? thetaOrParam : undefined,
      paramValue: isParam ? undefined : thetaOrParam,
    });
    if (isParam && !this.parameters.has(thetaOrParam)) {
      this.parameters.set(thetaOrParam, 0);
    }
    return this;
  }

  setParameter(paramName: string, value: number): this {
    this.parameters.set(paramName, value);
    return this;
  }

  setParameters(params: Record<string, number> | Map<string, number>): this {
    if (params instanceof Map) {
      params.forEach((val, key) => this.parameters.set(key, val));
    } else {
      Object.entries(params).forEach(([key, val]) => this.parameters.set(key, val));
    }
    return this;
  }

  /**
   * Execute circuit on an initial state (defaults to |0...0>)
   */
  execute(
    initialState?: QuantumState,
    noiseModel?: { errorRate: number; type: "depolarizing" | "phase_damping" }
  ): QuantumState {
    const state = initialState ? initialState.clone() : QuantumState.groundState(this.numQubits);

    for (const inst of this.instructions) {
      // Resolve parameter if dynamic
      let val = inst.paramValue ?? 0;
      if (inst.paramName && this.parameters.has(inst.paramName)) {
        val = this.parameters.get(inst.paramName)!;
      }

      switch (inst.type) {
        case "H":
          state.applyGate(QuantumGates.Hadamard(), inst.targets[0]);
          break;
        case "X":
          state.applyGate(QuantumGates.PauliX(), inst.targets[0]);
          break;
        case "Y":
          state.applyGate(QuantumGates.PauliY(), inst.targets[0]);
          break;
        case "Z":
          state.applyGate(QuantumGates.PauliZ(), inst.targets[0]);
          break;
        case "S":
          state.applyGate(QuantumGates.PhaseS(), inst.targets[0]);
          break;
        case "T":
          state.applyGate(QuantumGates.PhaseT(), inst.targets[0]);
          break;
        case "Rx":
          state.applyGate(QuantumGates.Rx(val), inst.targets[0]);
          break;
        case "Ry":
          state.applyGate(QuantumGates.Ry(val), inst.targets[0]);
          break;
        case "Rz":
          state.applyGate(QuantumGates.Rz(val), inst.targets[0]);
          break;
        case "Phase":
          state.applyGate(QuantumGates.Phase(val), inst.targets[0]);
          break;
        case "CNOT":
          state.applyCNOT(inst.controls![0], inst.targets[0]);
          break;
        case "CZ":
          state.applyControlledGate(QuantumGates.PauliZ(), inst.controls![0], inst.targets[0]);
          break;
        case "CRy":
          state.applyControlledGate(QuantumGates.Ry(val), inst.controls![0], inst.targets[0]);
          break;
      }

      if (noiseModel && noiseModel.errorRate > 0) {
        for (const target of inst.targets) {
          state.applyDepolarizingNoise(target, noiseModel.errorRate);
        }
      }
    }

    return state;
  }

  getMetrics(): CircuitMetrics {
    // Calculate circuit depth by tracking time step per qubit
    const qubitTime = new Array(this.numQubits).fill(0);
    let cnotCount = 0;

    for (const inst of this.instructions) {
      if (inst.type === "CNOT" || inst.type === "CZ" || inst.type === "CRy") {
        cnotCount++;
        const c = inst.controls![0];
        const t = inst.targets[0];
        const step = Math.max(qubitTime[c], qubitTime[t]) + 1;
        qubitTime[c] = step;
        qubitTime[t] = step;
      } else {
        const t = inst.targets[0];
        qubitTime[t] = qubitTime[t] + 1;
      }
    }

    const depth = Math.max(...qubitTime, 0);

    return {
      numQubits: this.numQubits,
      circuitDepth: depth,
      totalGates: this.instructions.length,
      cnotCount,
      parameterCount: this.parameters.size,
    };
  }

  clone(): QuantumCircuit {
    const copy = new QuantumCircuit(this.numQubits);
    copy.instructions = this.instructions.map(i => ({ ...i }));
    copy.parameters = new Map(this.parameters);
    return copy;
  }
}
