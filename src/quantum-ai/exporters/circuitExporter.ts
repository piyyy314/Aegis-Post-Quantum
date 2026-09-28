/**
 * Quantum Circuit & AI Model Exporter
 * Generates valid Python (Qiskit & PennyLane) code and raw JSON payloads
 * to enable external execution on physical quantum hardware (IBM Quantum, Rigetti, IonQ).
 */

import { QuantumCircuit, CircuitInstruction } from "../core/QuantumCircuit";

export class CircuitExporter {
  /**
   * Export circuit to IBM Qiskit (Python)
   */
  static toQiskit(circuit: QuantumCircuit, circuitName: string = "aegis_quantum_circuit"): string {
    const lines: string[] = [
      `# ==============================================================================`,
      `# Aegis Quantum Defense Suite - Autonomous Quantum AI Model Exporter`,
      `# Generated for IBM Qiskit runtime execution on physical QPUs`,
      `# ==============================================================================`,
      `from qiskit import QuantumCircuit, transpile`,
      `from qiskit_aer import AerSimulator`,
      `import numpy as np`,
      ``,
      `# Initialize ${circuit.numQubits}-Qubit Quantum Register`,
      `qc = QuantumCircuit(${circuit.numQubits}, ${circuit.numQubits}, name="${circuitName}")`,
      ``,
    ];

    for (const inst of circuit.instructions) {
      const val = inst.paramValue ?? (inst.paramName ? circuit.parameters.get(inst.paramName) ?? 0 : 0);
      const valStr = val.toFixed(4);

      switch (inst.type) {
        case "H":
          lines.push(`qc.h(${inst.targets[0]})`);
          break;
        case "X":
          lines.push(`qc.x(${inst.targets[0]})`);
          break;
        case "Y":
          lines.push(`qc.y(${inst.targets[0]})`);
          break;
        case "Z":
          lines.push(`qc.z(${inst.targets[0]})`);
          break;
        case "S":
          lines.push(`qc.s(${inst.targets[0]})`);
          break;
        case "T":
          lines.push(`qc.t(${inst.targets[0]})`);
          break;
        case "Rx":
          lines.push(`qc.rx(${valStr}, ${inst.targets[0]})`);
          break;
        case "Ry":
          lines.push(`qc.ry(${valStr}, ${inst.targets[0]})`);
          break;
        case "Rz":
          lines.push(`qc.rz(${valStr}, ${inst.targets[0]})`);
          break;
        case "CNOT":
          lines.push(`qc.cx(${inst.controls![0]}, ${inst.targets[0]})`);
          break;
        case "CZ":
          lines.push(`qc.cz(${inst.controls![0]}, ${inst.targets[0]})`);
          break;
        case "CRy":
          lines.push(`qc.cry(${valStr}, ${inst.controls![0]}, ${inst.targets[0]})`);
          break;
      }
    }

    lines.push(
      ``,
      `# Measure all qubits into classical registers`,
      `qc.measure(range(${circuit.numQubits}), range(${circuit.numQubits}))`,
      ``,
      `# Transpile & Execute on Aer Quantum Simulator`,
      `simulator = AerSimulator()`,
      `compiled_circuit = transpile(qc, simulator)`,
      `job = simulator.run(compiled_circuit, shots=1024)`,
      `result = job.result()`,
      `counts = result.get_counts(qc)`,
      `print("[+] Aegis Quantum QPU Measurement Histogram:", counts)`
    );

    return lines.join("\n");
  }

  /**
   * Export circuit to Xanadu PennyLane (Python)
   */
  static toPennyLane(circuit: QuantumCircuit, modelName: string = "Aegis_QNN"): string {
    const lines: string[] = [
      `# ==============================================================================`,
      `# Aegis Quantum Defense Suite - PennyLane QML Model Script`,
      `# ==============================================================================`,
      `import pennylane as qml`,
      `from pennylane import numpy as np`,
      ``,
      `dev = qml.device("default.qubit", wires=${circuit.numQubits})`,
      ``,
      `@qml.qnode(dev)`,
      `def ${modelName.toLowerCase()}_circuit(params, features):`,
    ];

    lines.push(`    # Quantum Circuit Execution Flow`);
    for (const inst of circuit.instructions) {
      const val = inst.paramValue ?? (inst.paramName ? circuit.parameters.get(inst.paramName) ?? 0 : 0);
      const valStr = val.toFixed(4);

      switch (inst.type) {
        case "H":
          lines.push(`    qml.Hadamard(wires=${inst.targets[0]})`);
          break;
        case "X":
          lines.push(`    qml.PauliX(wires=${inst.targets[0]})`);
          break;
        case "Y":
          lines.push(`    qml.PauliY(wires=${inst.targets[0]})`);
          break;
        case "Z":
          lines.push(`    qml.PauliZ(wires=${inst.targets[0]})`);
          break;
        case "Rx":
          lines.push(`    qml.RX(${valStr}, wires=${inst.targets[0]})`);
          break;
        case "Ry":
          lines.push(`    qml.RY(${valStr}, wires=${inst.targets[0]})`);
          break;
        case "Rz":
          lines.push(`    qml.RZ(${valStr}, wires=${inst.targets[0]})`);
          break;
        case "CNOT":
          lines.push(`    qml.CNOT(wires=[${inst.controls![0]}, ${inst.targets[0]}])`);
          break;
        case "CZ":
          lines.push(`    qml.CZ(wires=[${inst.controls![0]}, ${inst.targets[0]}])`);
          break;
      }
    }

    lines.push(
      `    # Readout Expectation Values of Pauli-Z across all qubits`,
      `    return [qml.expval(qml.PauliZ(i)) for i in range(${circuit.numQubits})]`,
      ``,
      `if __name__ == "__main__":`,
      `    print("[+] Aegis PennyLane QNode initialized with ${circuit.numQubits} wires.")`
    );

    return lines.join("\n");
  }

  /**
   * Export circuit to Raw JSON schema
   */
  static toJson(circuit: QuantumCircuit): string {
    const payload = {
      generator: "Aegis Quantum Defense Suite v4.0.2",
      formatVersion: "1.0",
      numQubits: circuit.numQubits,
      metrics: circuit.getMetrics(),
      parameters: Object.fromEntries(circuit.parameters.entries()),
      instructions: circuit.instructions,
    };
    return JSON.stringify(payload, null, 2);
  }
}
