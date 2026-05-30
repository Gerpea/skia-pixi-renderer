import type { CanvasKit, Paint } from 'canvaskit-wasm';
import * as PIXI from 'pixi.js-legacy';

export class CK {
  static makePaint(ck: CanvasKit): Paint {
    const paint = new ck.Paint();
    paint.setAntiAlias(true);
    paint.setDither(true);
    return paint;
  }

  static parseColor(ck: CanvasKit, color: unknown, alpha = 1): Float32Array {
    if (typeof color === 'number') {
      return ck.Color4f(
        ((color >> 16) & 0xff) / 255,
        ((color >> 8) & 0xff) / 255,
        (color & 0xff) / 255,
        alpha
      );
    }
    try {
      const [r, g, b] = new PIXI.Color(color).toArray();
      return ck.Color4f(r, g, b, alpha);
    } catch {
      return ck.Color4f(0, 0, 0, alpha);
    }
  }
}