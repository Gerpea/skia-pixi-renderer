import * as PIXI from 'pixi.js-legacy';
export type { SkiaMapper } from './SkiaMapper';
export { ContainerMapper } from './ContainerMapper';
export { GraphicsMapper } from './GraphicsMapper';
export { SpriteMapper } from './SpriteMapper';

import type { SkiaMapper } from './SkiaMapper';

export class MapperRegistry {
  private mappers: { instance: SkiaMapper; priority: number }[] = [];

  register(mapper: SkiaMapper): void {
    this.mappers.push({ instance: mapper, priority: mapper.priority });
    this.mappers.sort((a, b) => b.priority - a.priority);
  }

  getMapper(obj: PIXI.DisplayObject): SkiaMapper | null {
    return this.mappers.find(m => m.instance.canHandle(obj))?.instance ?? null;
  }
}