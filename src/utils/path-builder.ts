import type { CanvasKit, Path } from 'canvaskit-wasm';

export class PathBuilderUtil {
  static build(shape: any, type: number, ck: CanvasKit): Path | null {
    if (!shape) return null;
    const builder = new ck.PathBuilder();
    const t = type ?? shape.type;

    try {
      if (t === 0) { // POLYGON
        const pts = shape.points;
        if (pts && pts.length >= 2) {
          builder.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) builder.lineTo(pts[i], pts[i + 1]);
          if (shape.closed || shape.close) builder.close();
        }
      } else if (t === 1) { // RECT
        builder.addRect(ck.XYWHRect(shape.x, shape.y, shape.width, shape.height));
      } else if (t === 2) { // CIRCLE
        builder.addCircle(shape.x, shape.y, shape.radius);
      } else if (t === 3) { // ELLIPSE
        builder.addOval(ck.XYWHRect(shape.x - shape.width, shape.y - shape.height, shape.width * 2, shape.height * 2));
      } else if (t === 4) { // ROUNDED RECT
        builder.addRRect(ck.RRectXY(ck.XYWHRect(shape.x, shape.y, shape.width, shape.height), shape.radius, shape.radius));
      } else {
        return null;
      }
      return builder.detach();
    } finally {
      builder.delete();
    }
  }
}