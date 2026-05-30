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
    ctx.canvas?.save();
    ctx.canvas?.concat(TransformManager.pixiToSkiaMatrix(container.transform));
    
    const world = TransformManager.multiply(parentMatrix, TransformManager.pixiToSkiaMatrix(container.transform));
    for (const child of container.children) {
      if (child.visible && child.alpha > 0) this.renderer?.drawObject(ctx, child, world);
    }
    ctx.canvas?.restore();
  }

  hitTest(ctx: RenderContext, container: PIXI.Container, worldMatrix: Float32Array, x: number, y: number): boolean {
    // A container itself is only clickable if it has an explicit hitArea.
    // Its children are handled by the recursive tree walk in InteractionManager.
    if (container.hitArea) {
      const local = TransformManager.inverseTransformPoint(worldMatrix, x, y);
      return container.hitArea.contains(local.x, local.y);
    }
    return false;
  }
}