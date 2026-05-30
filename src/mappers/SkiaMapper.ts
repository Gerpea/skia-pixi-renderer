import * as PIXI from 'pixi.js-legacy';
import type { RenderContext } from '../types';

export interface SkiaMapper<T extends PIXI.DisplayObject = PIXI.DisplayObject> {
  priority: number;
  canHandle(obj: PIXI.DisplayObject): obj is T;
  draw(ctx: RenderContext, obj: T, worldMatrix: Float32Array): void;
  hitTest(ctx: RenderContext, obj: T, worldMatrix: Float32Array, x: number, y: number): boolean;
}