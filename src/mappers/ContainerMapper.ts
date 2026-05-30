// src/skia-wrapper/mappers/ContainerMapper.ts
import * as PIXI from 'pixi.js-legacy';
import type { SkiaMapper } from './SkiaMapper';
import type { RenderContext } from '../types';
import { TransformManager } from '../TransformManager';
import type { SkiaRenderer } from '../SkiaRenderer';

export class ContainerMapper implements SkiaMapper<PIXI.Container> {
  priority = 10;
  private renderer: SkiaRenderer | null = null;

  setRenderer(r: SkiaRenderer): void { this.renderer = r; }
  canHandle(obj: PIXI.DisplayObject): obj is PIXI.Container { return obj instanceof PIXI.Container; }

  draw(ctx: RenderContext, container: PIXI.Container, parentMatrix: Float32Array): void {
    if (!ctx.canvas) return;
    if ((container as any).sortDirty) container.sortChildren();

    ctx.canvas.save();
    ctx.canvas.concat(TransformManager.pixiToSkiaMatrix(container.transform));
    
    const world = TransformManager.multiply(parentMatrix, TransformManager.pixiToSkiaMatrix(container.transform));
    
    for (const child of container.children) {
      if (!child.visible || child.alpha <= 0) continue;

      // ✅ SKIP VISUAL RENDERING OF ACTIVE MASKS (Matches Pixi WebGL stencil-only behavior)
      if (ctx.activeMasks?.has(child)) continue;

      this.renderer?.drawObject(ctx, child, world);
    }
    ctx.canvas.restore();
  }

  hitTest(ctx: RenderContext, container: PIXI.Container, worldMatrix: Float32Array, x: number, y: number): boolean {
    if ((container as any).sortDirty) container.sortChildren();
    const world = TransformManager.multiply(worldMatrix, TransformManager.pixiToSkiaMatrix(container.transform));
    for (let i = container.children.length - 1; i >= 0; i--) {
      const child = container.children[i];
      if (child.visible && child.alpha > 0 && this.renderer?.hitTestObject(ctx, child, world, x, y)) return true;
    }
    return false;
  }
}