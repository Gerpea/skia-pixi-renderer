// src/skia-wrapper/mappers/GraphicsMapper.ts
import * as PIXI from 'pixi.js-legacy';
import type { CanvasKit, Path, ColorFilter } from 'canvaskit-wasm';
import type { SkiaMapper } from './SkiaMapper';
import type { RenderContext } from '../types';
import { TransformManager } from '../TransformManager';
import { CK } from '../utils/ck-helpers';
import { mapBlendMode } from '../utils/blend-modes';
import { PathBuilderUtil } from '../utils/path-builder';

export class GraphicsMapper implements SkiaMapper<PIXI.Graphics> {
  priority = 20;
  
  canHandle(obj: PIXI.DisplayObject): obj is PIXI.Graphics { 
    return obj instanceof PIXI.Graphics; 
  }

  draw(ctx: RenderContext, graphics: PIXI.Graphics, worldMatrix: Float32Array): void {
    if (!ctx.canvas || !ctx.paint) return;
    
    const data = (graphics as any).geometry?.graphicsData || (graphics as any)._graphicsData || [];
    if (!data.length) return;

    ctx.canvas.save();
    ctx.canvas.concat(TransformManager.pixiToSkiaMatrix(graphics.transform));

    // Isolate paint state to prevent bleeding to other objects
    const gfxPaint = ctx.paint.copy();
    let colorFilter: ColorFilter | null = null;

    try {
      // 1. Apply World Alpha (inherits from parent containers)
      gfxPaint.setAlphaf(graphics.worldAlpha);

      // 2. Apply Tint (if any)
      const tint = (graphics as any).tint ?? 0xFFFFFF;
      if (tint !== 0xFFFFFF) {
        const tintColor = CK.parseColor(ctx.ck, tint, 1);
        colorFilter = ctx.ck.ColorFilter.MakeBlend(tintColor, ctx.ck.BlendMode.Modulate);
        gfxPaint.setColorFilter(colorFilter);
      }

      // 3. Apply Blend Mode
      const blendMode = mapBlendMode(graphics.blendMode, ctx.ck);
      gfxPaint.setBlendMode(blendMode);

      // 4. Draw Shapes
      for (const item of data) {
        const path = PathBuilderUtil.build(item.shape, item.type, ctx.ck);
        if (!path) continue;

        const fs = item.fillStyle;
        const ls = item.lineStyle;

        // Draw Fill
        if (fs && fs.visible && fs.alpha > 0) {
          gfxPaint.setStyle(ctx.ck.PaintStyle.Fill);
          gfxPaint.setColor(CK.parseColor(ctx.ck, fs.color, fs.alpha));
          ctx.canvas.drawPath(path, gfxPaint);
        }

        // Draw Stroke
        if (ls && ls.visible && ls.width > 0 && ls.alpha > 0) {
          gfxPaint.setStyle(ctx.ck.PaintStyle.Stroke);
          gfxPaint.setStrokeWidth(ls.width);
          gfxPaint.setColor(CK.parseColor(ctx.ck, ls.color, ls.alpha));
          
          if (ls.cap) gfxPaint.setStrokeCap(this.mapCap(ls.cap, ctx.ck));
          if (ls.join) gfxPaint.setStrokeJoin(this.mapJoin(ls.join, ctx.ck));
          if (ls.miterLimit !== undefined) gfxPaint.setStrokeMiter(ls.miterLimit);

          ctx.canvas.drawPath(path, gfxPaint);
        }

        path.delete();
      }
    } finally {
      // Strict WASM memory cleanup
      if (colorFilter) colorFilter.delete();
      gfxPaint.delete();
      ctx.canvas.restore();
    }
  }

  hitTest(ctx: RenderContext, graphics: PIXI.Graphics, worldMatrix: Float32Array, x: number, y: number): boolean {
    if (graphics.worldAlpha <= 0) return false;

    const data = (graphics as any).geometry?.graphicsData || (graphics as any)._graphicsData || [];
    if (!data.length) return false;

    const local = TransformManager.inverseTransformPoint(worldMatrix, x, y);

    for (const item of data) {
      const path = PathBuilderUtil.build(item.shape, item.type, ctx.ck);
      if (!path) continue;

      let hit = false;
      const fs = item.fillStyle;
      const ls = item.lineStyle;

      // Check Fill
      if (fs && fs.visible && fs.alpha > 0) {
        hit = path.contains(local.x, local.y);
      }

      // Check Stroke
      if (!hit && ls && ls.visible && ls.width > 0 && ls.alpha > 0) {
        const strokeOpts: any = { width: ls.width };
        if (ls.cap) strokeOpts.cap = this.mapCap(ls.cap, ctx.ck);
        if (ls.join) strokeOpts.join = this.mapJoin(ls.join, ctx.ck);
        if (ls.miterLimit !== undefined) strokeOpts.miter_limit = ls.miterLimit;

        const stroked = path.makeStroked(strokeOpts);
        if (stroked) {
          hit = stroked.contains(local.x, local.y);
          stroked.delete();
        }
      }
      
      path.delete();
      if (hit) return true;
    }
    return false;
  }

  private mapCap(cap: string, ck: CanvasKit): any {
    if (cap === 'round') return ck.StrokeCap.Round;
    if (cap === 'square') return ck.StrokeCap.Square;
    return ck.StrokeCap.Butt;
  }

  private mapJoin(join: string, ck: CanvasKit): any {
    if (join === 'round') return ck.StrokeJoin.Round;
    if (join === 'bevel') return ck.StrokeJoin.Bevel;
    return ck.StrokeJoin.Miter;
  }
}