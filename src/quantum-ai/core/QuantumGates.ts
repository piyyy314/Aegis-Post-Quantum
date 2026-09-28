/**
 * Quantum Gates Library
 * Provides standard and parameterized unitary quantum logic operators
 */

import { Complex } from "./Complex";

export type Matrix2x2 = [[Complex, Complex], [Complex, Complex]];
export type Matrix4x4 = Complex[][];

const INV_SQRT2 = 1 / Math.SQRT2;

export class QuantumGates {
  // --- Standard 1-Qubit Unitary Operators ---

  static Identity(): Matrix2x2 {
    return [
      [Complex.one(), Complex.zero()],
      [Complex.zero(), Complex.one()],
    ];
  }

  static PauliX(): Matrix2x2 {
    return [
      [Complex.zero(), Complex.one()],
      [Complex.one(), Complex.zero()],
    ];
  }

  static PauliY(): Matrix2x2 {
    return [
      [Complex.zero(), new Complex(0, -1)],
      [new Complex(0, 1), Complex.zero()],
    ];
  }

  static PauliZ(): Matrix2x2 {
    return [
      [Complex.one(), Complex.zero()],
      [Complex.zero(), new Complex(-1, 0)],
    ];
  }

  static Hadamard(): Matrix2x2 {
    return [
      [new Complex(INV_SQRT2, 0), new Complex(INV_SQRT2, 0)],
      [new Complex(INV_SQRT2, 0), new Complex(-INV_SQRT2, 0)],
    ];
  }

  static PhaseS(): Matrix2x2 {
    return [
      [Complex.one(), Complex.zero()],
      [Complex.zero(), new Complex(0, 1)],
    ];
  }

  static PhaseT(): Matrix2x2 {
    const angle = Math.PI / 4;
    return [
      [Complex.one(), Complex.zero()],
      [Complex.zero(), Complex.fromPolar(1, angle)],
    ];
  }

  // --- Parameterized Rotation Gates ---

  /**
   * Rx(theta) = exp(-i * theta / 2 * X) = [ [cos(t/2), -i*sin(t/2)], [-i*sin(t/2), cos(t/2)] ]
   */
  static Rx(theta: number): Matrix2x2 {
    const half = theta / 2;
    const c = Math.cos(half);
    const s = Math.sin(half);
    return [
      [new Complex(c, 0), new Complex(0, -s)],
      [new Complex(0, -s), new Complex(c, 0)],
    ];
  }

  /**
   * Ry(theta) = exp(-i * theta / 2 * Y) = [ [cos(t/2), -sin(t/2)], [sin(t/2), cos(t/2)] ]
   */
  static Ry(theta: number): Matrix2x2 {
    const half = theta / 2;
    const c = Math.cos(half);
    const s = Math.sin(half);
    return [
      [new Complex(c, 0), new Complex(-s, 0)],
      [new Complex(s, 0), new Complex(c, 0)],
    ];
  }

  /**
   * Rz(theta) = exp(-i * theta / 2 * Z) = [ [exp(-i*t/2), 0], [0, exp(i*t/2)] ]
   */
  static Rz(theta: number): Matrix2x2 {
    const half = theta / 2;
    return [
      [Complex.fromPolar(1, -half), Complex.zero()],
      [Complex.zero(), Complex.fromPolar(1, half)],
    ];
  }

  /**
   * PhaseShift(phi) = [ [1, 0], [0, exp(i*phi)] ]
   */
  static Phase(phi: number): Matrix2x2 {
    return [
      [Complex.one(), Complex.zero()],
      [Complex.zero(), Complex.fromPolar(1, phi)],
    ];
  }

  /**
   * Universal Single-Qubit Rotation U3(theta, phi, lambda)
   */
  static U3(theta: number, phi: number, lambda: number): Matrix2x2 {
    const half = theta / 2;
    const c = Math.cos(half);
    const s = Math.sin(half);
    return [
      [new Complex(c, 0), Complex.fromPolar(1, lambda).mul(-s)],
      [Complex.fromPolar(1, phi).mul(s), Complex.fromPolar(1, phi + lambda).mul(c)],
    ];
  }

  // --- Two-Qubit Unitary Operators (4x4) ---

  /**
   * CNOT (Controlled-NOT, target flipped if control == 1)
   */
  static CNOT(): Matrix4x4 {
    const m: Complex[][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => Complex.zero())
    );
    m[0][0] = Complex.one();
    m[1][1] = Complex.one();
    m[2][3] = Complex.one();
    m[3][2] = Complex.one();
    return m;
  }

  /**
   * Controlled-Z (CZ)
   */
  static CZ(): Matrix4x4 {
    const m: Complex[][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => Complex.zero())
    );
    m[0][0] = Complex.one();
    m[1][1] = Complex.one();
    m[2][2] = Complex.one();
    m[3][3] = new Complex(-1, 0);
    return m;
  }

  /**
   * SWAP
   */
  static SWAP(): Matrix4x4 {
    const m: Complex[][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => Complex.zero())
    );
    m[0][0] = Complex.one();
    m[1][2] = Complex.one();
    m[2][1] = Complex.one();
    m[3][3] = Complex.one();
    return m;
  }

  /**
   * Controlled-Ry(theta)
   */
  static CRy(theta: number): Matrix4x4 {
    const ry = QuantumGates.Ry(theta);
    const m: Complex[][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => Complex.zero())
    );
    m[0][0] = Complex.one();
    m[1][1] = Complex.one();
    m[2][2] = ry[0][0];
    m[2][3] = ry[0][1];
    m[3][2] = ry[1][0];
    m[3][3] = ry[1][1];
    return m;
  }

  /**
   * Kronecker (Tensor) Product of two matrices A (n x m) and B (p x q)
   */
  static tensorProduct(A: Complex[][], B: Complex[][]): Complex[][] {
    const n = A.length;
    const m = A[0].length;
    const p = B.length;
    const q = B[0].length;

    const res: Complex[][] = Array.from({ length: n * p }, () =>
      Array.from({ length: m * q }, () => Complex.zero())
    );

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        for (let k = 0; k < p; k++) {
          for (let l = 0; l < q; l++) {
            res[i * p + k][j * q + l] = A[i][j].mul(B[k][l]);
          }
        }
      }
    }

    return res;
  }
}
