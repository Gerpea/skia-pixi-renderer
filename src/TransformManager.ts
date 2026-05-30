import * as PIXI from 'pixi.js-legacy';

export class TransformManager {
  private static readonly IDENTITY = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  static pixiToSkiaMatrix(pixiTransform: PIXI.Transform): Float32Array {
    const { a, b, c, d, tx, ty } = pixiTransform.localTransform || pixiTransform;
    return new Float32Array([a, c, tx, b, d, ty, 0, 0, 1]);
  }

  static multiply(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(9);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
      }
    }
    return out;
  }

  // ✅ NEW: Matrix Inversion for relative coordinate mapping
  static invert(m: Float32Array): Float32Array | null {
    const a = m[0],
      c = m[1],
      tx = m[2];
    const b = m[3],
      d = m[4],
      ty = m[5];
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-6) return null;
    const invDet = 1 / det;
    return new Float32Array([
      d * invDet,
      -c * invDet,
      (c * ty - d * tx) * invDet,
      -b * invDet,
      a * invDet,
      (b * tx - a * ty) * invDet,
      0,
      0,
      1,
    ]);
  }

  static inverseTransformPoint(m: Float32Array, x: number, y: number): { x: number; y: number } {
    const [a, c, tx, b, d, ty] = m;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-6) return { x, y };
    const inv = 1 / det;
    // Correct inverse transformation: translate first, then apply inverse rotation/scale
    return {
      x: d * (x - tx) * inv + c * (y - ty) * inv,
      y: -b * (x - tx) * inv + a * (y - ty) * inv,
    };
  }

  static identity(): Float32Array {
    return this.IDENTITY.slice();
  }
}
