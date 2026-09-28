/**
 * Complex Number Library for Quantum Statevector Simulation
 * Implements fundamental operations required for unitary quantum mechanics
 */

export class Complex {
  readonly r: number; // Real component
  readonly i: number; // Imaginary component

  constructor(real: number, imag: number = 0) {
    this.r = real;
    this.i = imag;
  }

  static zero(): Complex {
    return new Complex(0, 0);
  }

  static one(): Complex {
    return new Complex(1, 0);
  }

  static i(): Complex {
    return new Complex(0, 1);
  }

  /**
   * Euler's formula: e^(i * theta) = cos(theta) + i * sin(theta)
   */
  static fromPolar(r: number, theta: number): Complex {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }

  add(other: Complex | number): Complex {
    if (typeof other === "number") {
      return new Complex(this.r + other, this.i);
    }
    return new Complex(this.r + other.r, this.i + other.i);
  }

  sub(other: Complex | number): Complex {
    if (typeof other === "number") {
      return new Complex(this.r - other, this.i);
    }
    return new Complex(this.r - other.r, this.i - other.i);
  }

  mul(other: Complex | number): Complex {
    if (typeof other === "number") {
      return new Complex(this.r * other, this.i * other);
    }
    return new Complex(
      this.r * other.r - this.i * other.i,
      this.r * other.i + this.i * other.r
    );
  }

  div(other: Complex | number): Complex {
    if (typeof other === "number") {
      return new Complex(this.r / other, this.i / other);
    }
    const denom = other.r * other.r + other.i * other.i;
    if (denom === 0) {
      throw new Error("Complex division by zero");
    }
    return new Complex(
      (this.r * other.r + this.i * other.i) / denom,
      (this.i * other.r - this.r * other.i) / denom
    );
  }

  conjugate(): Complex {
    return new Complex(this.r, -this.i);
  }

  magnitude(): number {
    return Math.sqrt(this.r * this.r + this.i * this.i);
  }

  magnitudeSquared(): number {
    return this.r * this.r + this.i * this.i;
  }

  phase(): number {
    return Math.atan2(this.i, this.r);
  }

  toString(precision: number = 3): string {
    const rStr = this.r.toFixed(precision);
    const sign = this.i >= 0 ? "+" : "-";
    const iStr = Math.abs(this.i).toFixed(precision);
    return `${rStr} ${sign} ${iStr}i`;
  }
}
