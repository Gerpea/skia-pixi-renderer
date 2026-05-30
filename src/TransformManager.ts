import * as PIXI from 'pixi.js-legacy';

export class TransformManager {
  private static readonly IDENTITY = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  /** Pixi {a,b,c,d,tx,ty} → Skia row-major [a, c, tx, b, d, ty, 0, 0, 1] */
  static pixiToSkiaMatrix(t: PIXI.Transform): Float32Array {
    const { a, b, c, d, tx, ty } = t.localTransform;
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

  static inverseTransformPoint(m: Float32Array, x: number, y: number): { x: number; y: number } {
    const [a, c, tx, b, d, ty] = m;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-6) return { x, y };
    const inv = 1 / det;
    return {
      x: (d * (x - tx) - c * (y - ty)) * inv,
      y: (a * (y - ty) - b * (x - tx)) * inv,
    };
  }

  static identity(): Float32Array {
    return this.IDENTITY.slice();
  }
}
