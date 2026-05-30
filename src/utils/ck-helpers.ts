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
    // Handle Pixi number format: 0xRRGGBB
    if (typeof color === 'number') {
      const r = ((color >> 16) & 0xff) / 255;
      const g = ((color >> 8) & 0xff) / 255;
      const b = (color & 0xff) / 255;
      return ck.Color4f(r, g, b, alpha);
    }
    
    // Handle CSS string format: '#RRGGBB' or 'rgb(...)'
    if (typeof color === 'string') {
      try {
        const temp = new PIXI.Color(color);
        const [r, g, b] = temp.toArray();
        return ck.Color4f(r, g, b, alpha);
      } catch {
        return ck.Color4f(0, 0, 0, alpha);
      }
    }
    
    // Fallback
    return ck.Color4f(0, 0, 0, alpha);
  }
}