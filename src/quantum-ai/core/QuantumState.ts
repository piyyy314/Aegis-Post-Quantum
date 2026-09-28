/**
 * Quantum Statevector Engine
 * Handles exact statevector evolution, density matrix reductions,
 * Bloch sphere projections, entanglement entropy, and quantum measurements.
 */

import { Complex } from "./Complex";
import { QuantumGates, Matrix2x2 } from "./QuantumGates";

export interface BlochCoordinates {
  x: number;
  y: number;
  z: number;
  theta: number; // Polar angle in [0, pi]
  phi: number;   // Azimuthal angle in [0, 2*pi]
  purity: number;
}

export class QuantumState {
  readonly numQubits: number;
  readonly dim: number;
  amplitudes: Complex[];

  constructor(numQubits: number, amplitudes?: Complex[]) {
    if (numQubits < 1 || numQubits > 14) {
      throw new Error("QuantumState supports 1 to 14 qubits for browser real-time simulation.");
    }
    this.numQubits = numQubits;
    this.dim = 1 << numQubits;

    if (amplitudes) {
      if (amplitudes.length !== this.dim) {
        throw new Error(`Amplitudes array length (${amplitudes.length}) must match 2^${numQubits} = ${this.dim}`);
      }
      this.amplitudes = amplitudes.map(c => new Complex(c.r, c.i));
    } else {
      // Default to ground state |0...0>
      this.amplitudes = Array.from({ length: this.dim }, (_, i) =>
        i === 0 ? Complex.one() : Complex.zero()
      );
    }
  }

  static groundState(numQubits: number): QuantumState {
    return new QuantumState(numQubits);
  }

  static uniformSuperposition(numQubits: number): QuantumState {
    const dim = 1 << numQubits;
    const amp = 1 / Math.sqrt(dim);
    const amps = Array.from({ length: dim }, () => new Complex(amp, 0));
    return new QuantumState(numQubits, amps);
  }

  clone(): QuantumState {
    return new QuantumState(this.numQubits, this.amplitudes);
  }

  normalize(): void {
    let normSq = 0;
    for (let i = 0; i < this.dim; i++) {
      normSq += this.amplitudes[i].magnitudeSquared();
    }
    if (normSq > 0 && Math.abs(normSq - 1.0) > 1e-12) {
      const invNorm = 1 / Math.sqrt(normSq);
      for (let i = 0; i < this.dim; i++) {
        this.amplitudes[i] = this.amplitudes[i].mul(invNorm);
      }
    }
  }

  /**
   * Apply a 2x2 unitary gate to target qubit (0-indexed from least significant bit)
   */
  applyGate(gate: Matrix2x2, targetQubit: number): void {
    if (targetQubit < 0 || targetQubit >= this.numQubits) {
      throw new Error(`Invalid target qubit ${targetQubit}`);
    }

    const bitMask = 1 << targetQubit;
    const u00 = gate[0][0];
    const u01 = gate[0][1];
    const u10 = gate[1][0];
    const u11 = gate[1][1];

    const newAmplitudes = new Array<Complex>(this.dim);

    for (let i = 0; i < this.dim; i++) {
      if ((i & bitMask) === 0) {
        const i0 = i;
        const i1 = i | bitMask;
        const a0 = this.amplitudes[i0];
        const a1 = this.amplitudes[i1];

        // [newA0] = [u00 u01] [a0]
        // [newA1]   [u10 u11] [a1]
        newAmplitudes[i0] = u00.mul(a0).add(u01.mul(a1));
        newAmplitudes[i1] = u10.mul(a0).add(u11.mul(a1));
      }
    }

    this.amplitudes = newAmplitudes;
  }

  /**
   * Apply a controlled 2-qubit gate (e.g., CNOT, CZ, Controlled-Ry)
   */
  applyControlledGate(gate: Matrix2x2, controlQubit: number, targetQubit: number): void {
    if (controlQubit === targetQubit) {
      throw new Error("Control and target qubits must be distinct");
    }

    const ctrlMask = 1 << controlQubit;
    const tgtMask = 1 << targetQubit;
    const u00 = gate[0][0];
    const u01 = gate[0][1];
    const u10 = gate[1][0];
    const u11 = gate[1][1];

    const newAmplitudes = this.amplitudes.slice();

    for (let i = 0; i < this.dim; i++) {
      // Gate only activates if control bit is 1 and target bit is 0
      if ((i & ctrlMask) !== 0 && (i & tgtMask) === 0) {
        const i0 = i;
        const i1 = i | tgtMask;
        const a0 = this.amplitudes[i0];
        const a1 = this.amplitudes[i1];

        newAmplitudes[i0] = u00.mul(a0).add(u01.mul(a1));
        newAmplitudes[i1] = u10.mul(a0).add(u11.mul(a1));
      }
    }

    this.amplitudes = newAmplitudes;
  }

  /**
   * Apply CNOT (shortcut using Pauli-X on target when control is 1)
   */
  applyCNOT(controlQubit: number, targetQubit: number): void {
    this.applyControlledGate(QuantumGates.PauliX(), controlQubit, targetQubit);
  }

  /**
   * Probability distribution for all computational basis states |0...0> to |1...1>
   */
  getProbabilities(): number[] {
    return this.amplitudes.map(a => a.magnitudeSquared());
  }

  /**
   * Sample measurement outcomes (Monte Carlo simulation of physical detector)
   */
  sampleMeasurements(shots: number = 1024): Record<string, number> {
    const probs = this.getProbabilities();
    const counts: Record<string, number> = {};

    // Cumulative distribution
    const cumulative: number[] = new Array(this.dim);
    let sum = 0;
    for (let i = 0; i < this.dim; i++) {
      sum += probs[i];
      cumulative[i] = sum;
    }

    for (let s = 0; s < shots; s++) {
      const r = Math.random();
      // Binary search
      let low = 0;
      let high = this.dim - 1;
      let selected = high;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (cumulative[mid] >= r) {
          selected = mid;
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }

      const bitStr = selected.toString(2).padStart(this.numQubits, "0");
      counts[bitStr] = (counts[bitStr] || 0) + 1;
    }

    return counts;
  }

  /**
   * Expectation value of Pauli Z on qubit k: <psi| Z_k |psi>
   * Returns a value in [-1, 1]
   */
  expectationPauliZ(qubit: number): number {
    const bitMask = 1 << qubit;
    let expVal = 0;
    for (let i = 0; i < this.dim; i++) {
      const prob = this.amplitudes[i].magnitudeSquared();
      // If bit is 0, eigenvalue is +1. If bit is 1, eigenvalue is -1.
      expVal += (i & bitMask) === 0 ? prob : -prob;
    }
    return expVal;
  }

  /**
   * Expectation value of Pauli X on qubit k: <psi| X_k |psi>
   */
  expectationPauliX(qubit: number): number {
    const tempState = this.clone();
    tempState.applyGate(QuantumGates.Hadamard(), qubit);
    return tempState.expectationPauliZ(qubit);
  }

  /**
   * Expectation value of Pauli Y on qubit k: <psi| Y_k |psi>
   */
  expectationPauliY(qubit: number): number {
    const tempState = this.clone();
    // Y = S * X * S^\dagger -> S^\dagger * Z * S
    tempState.applyGate(QuantumGates.Phase(-Math.PI / 2), qubit);
    tempState.applyGate(QuantumGates.Hadamard(), qubit);
    return tempState.expectationPauliZ(qubit);
  }

  /**
   * Expectation value of two-qubit correlation <psi| Z_j Z_k |psi>
   */
  expectationPauliZZ(q1: number, q2: number): number {
    const mask1 = 1 << q1;
    const mask2 = 1 << q2;
    let expVal = 0;
    for (let i = 0; i < this.dim; i++) {
      const prob = this.amplitudes[i].magnitudeSquared();
      const b1 = (i & mask1) !== 0 ? -1 : 1;
      const b2 = (i & mask2) !== 0 ? -1 : 1;
      expVal += prob * b1 * b2;
    }
    return expVal;
  }

  /**
   * Compute single-qubit reduced density matrix rho_k by partial tracing out all other qubits.
   * rho = [ [rho00, rho01], [rho10, rho11] ]
   */
  reducedDensityMatrix(qubit: number): [[Complex, Complex], [Complex, Complex]] {
    const bitMask = 1 << qubit;
    let rho00 = Complex.zero();
    let rho01 = Complex.zero();
    let rho10 = Complex.zero();
    let rho11 = Complex.zero();

    for (let i = 0; i < this.dim; i++) {
      if ((i & bitMask) === 0) {
        const i0 = i;
        const i1 = i | bitMask;
        const a0 = this.amplitudes[i0];
        const a1 = this.amplitudes[i1];

        // rho00 += |a0|^2
        rho00 = rho00.add(a0.magnitudeSquared());
        // rho11 += |a1|^2
        rho11 = rho11.add(a1.magnitudeSquared());
        // rho01 += a0 * conj(a1)
        rho01 = rho01.add(a0.mul(a1.conjugate()));
        // rho10 += a1 * conj(a0)
        rho10 = rho10.add(a1.mul(a0.conjugate()));
      }
    }

    return [
      [rho00, rho01],
      [rho10, rho11],
    ];
  }

  /**
   * Compute Bloch sphere coordinates (x, y, z) for target qubit
   * Using: x = 2 * Re(rho01), y = 2 * Im(rho10), z = rho00 - rho11
   */
  getBlochCoordinates(qubit: number): BlochCoordinates {
    const rho = this.reducedDensityMatrix(qubit);
    const rho00 = rho[0][0].r;
    const rho11 = rho[1][1].r;
    const rho01 = rho[0][1];

    const x = 2 * rho01.r;
    const y = 2 * rho01.i;
    const z = rho00 - rho11;

    // Radius / Purity
    const r = Math.sqrt(x * x + y * y + z * z);
    const purity = rho00 * rho00 + rho11 * rho11 + 2 * (rho01.r * rho01.r + rho01.i * rho01.i);

    // Spherical angles
    const clampedZ = Math.max(-1, Math.min(1, r > 1e-9 ? z / r : 0));
    const theta = Math.acos(clampedZ);
    let phi = Math.atan2(y, x);
    if (phi < 0) phi += 2 * Math.PI;

    return {
      x,
      y,
      z,
      theta,
      phi,
      purity,
    };
  }

  /**
   * Compute Von Neumann Entanglement Entropy of qubit k: S = -Tr(rho * log2(rho))
   * For single qubit, eigenvalues of rho are: lambda_1,2 = (1 +/- sqrt(x^2 + y^2 + z^2)) / 2
   */
  getEntanglementEntropy(qubit: number): number {
    const { x, y, z } = this.getBlochCoordinates(qubit);
    const r = Math.sqrt(x * x + y * y + z * z);

    if (r >= 0.99999) return 0; // Pure state, zero entanglement

    const l1 = (1 + r) / 2;
    const l2 = (1 - r) / 2;

    const term1 = l1 > 1e-12 ? l1 * Math.log2(l1) : 0;
    const term2 = l2 > 1e-12 ? l2 * Math.log2(l2) : 0;

    return Math.max(0, -(term1 + term2));
  }

  /**
   * Quantum State Fidelity: F = |<this | other>|^2
   */
  fidelityWith(other: QuantumState): number {
    if (this.numQubits !== other.numQubits) {
      throw new Error("Cannot calculate fidelity between states of different qubit sizes");
    }
    let innerProd = Complex.zero();
    for (let i = 0; i < this.dim; i++) {
      innerProd = innerProd.add(this.amplitudes[i].conjugate().mul(other.amplitudes[i]));
    }
    return innerProd.magnitudeSquared();
  }

  /**
   * Injects depolarizing noise channel onto qubit k with error rate p
   */
  applyDepolarizingNoise(qubit: number, errorRate: number): void {
    if (errorRate <= 0) return;
    if (Math.random() < errorRate) {
      const pick = Math.random();
      if (pick < 0.333) {
        this.applyGate(QuantumGates.PauliX(), qubit);
      } else if (pick < 0.666) {
        this.applyGate(QuantumGates.PauliY(), qubit);
      } else {
        this.applyGate(QuantumGates.PauliZ(), qubit);
      }
    }
  }
}
