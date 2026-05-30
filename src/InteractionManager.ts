import * as PIXI from 'pixi.js-legacy';
import type { CanvasKit } from 'canvaskit-wasm';
import type { RenderContext } from './types';
import { MapperRegistry } from './mappers';
import { TransformManager } from './TransformManager';

export interface InteractionEvent {
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointerover' | 'pointerout';
  target: PIXI.DisplayObject | null;
  global: { x: number; y: number };
  local: { x: number; y: number };
  originalEvent: PointerEvent;
}

export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private ck: CanvasKit;
  private registry: MapperRegistry;
  private getScene: () => PIXI.Container | null;
  private callbacks = new Map<string, Set<(e: InteractionEvent) => void>>();
  private overTarget: PIXI.DisplayObject | null = null;
  private hitCtx: RenderContext;

  constructor(
    canvas: HTMLCanvasElement,
    ck: CanvasKit,
    registry: MapperRegistry,
    getScene: () => PIXI.Container | null,
    alphaCache: Map<string, Uint8Array> // ✅ Accept shared alpha cache
  ) {
    this.canvas = canvas;
    this.ck = ck;
    this.registry = registry;
    this.getScene = getScene;
    canvas.style.touchAction = 'none';

    // ✅ Provide the alpha cache to the hit-test context
    this.hitCtx = { ck, canvas: null, paint: null, imageCache: new Map(), alphaCache };
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointerleave', this.onOut);
  }

  on(event: string, cb: (e: InteractionEvent) => void): void {
    if (!this.callbacks.has(event)) this.callbacks.set(event, new Set());
    this.callbacks.get(event)!.add(cb);
  }

  off(event: string, cb: (e: InteractionEvent) => void): void {
    this.callbacks.get(event)?.delete(cb);
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointerleave', this.onOut);
  }

  private getCoords(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent) => this.emit('pointerdown', this.hitTest(e));
  private onUp = (e: PointerEvent) => this.emit('pointerup', this.hitTest(e));

  private onMove = (e: PointerEvent) => {
    const ev = this.hitTest(e);
    if (ev.target !== this.overTarget) {
      if (this.overTarget)
        this.emit('pointerout', { ...ev, target: this.overTarget, type: 'pointerout' });
      if (ev.target) this.emit('pointerover', { ...ev, type: 'pointerover' });
      this.overTarget = ev.target;
    }
    this.emit('pointermove', ev);
  };

  private onOut = (e: PointerEvent) => {
    if (this.overTarget) {
      this.emit('pointerout', {
        type: 'pointerout',
        target: this.overTarget,
        global: { x: 0, y: 0 },
        local: { x: 0, y: 0 },
        originalEvent: e,
      });
    }
    this.overTarget = null;
  };

  private emit(type: string, ev: InteractionEvent): void {
    this.callbacks.get(type)?.forEach(cb => cb({ ...ev, type: type as any }));
  }

  private hitTest(e: PointerEvent): InteractionEvent {
    const global = this.getCoords(e);
    const scene = this.getScene();
    const target = scene
      ? this.recursiveHitTest(scene, TransformManager.identity(), global.x, global.y)
      : null;
    let local = { x: global.x, y: global.y };

    if (target) {
      const m = TransformManager.pixiToSkiaMatrix(target.transform);
      const p = TransformManager.inverseTransformPoint(m, global.x, global.y);
      local = p;
    }

    return { type: 'pointermove', target, global, local, originalEvent: e };
  }

  private recursiveHitTest(
    obj: PIXI.DisplayObject,
    parentMatrix: Float32Array,
    x: number,
    y: number
  ): PIXI.DisplayObject | null {
    if (!obj.visible || obj.alpha === 0) return null;

    // Calculate world matrix for this object
    const world = TransformManager.multiply(
      parentMatrix,
      TransformManager.pixiToSkiaMatrix(obj.transform)
    );

    // ✅ FIX 1: Check children FIRST (back-to-front / top-most first)
    if (obj instanceof PIXI.Container) {
      for (let i = obj.children.length - 1; i >= 0; i--) {
        const hit = this.recursiveHitTest(obj.children[i], world, x, y);
        if (hit) return hit; // Stop immediately and return the deepest child hit
      }
    }

    // ✅ FIX 2: Check the object itself ONLY if no children were hit
    const mapper = this.registry.getMapper(obj);
    if (mapper?.hitTest(this.hitCtx, obj, world, x, y)) {
      return obj;
    }

    return null;
  }
}
