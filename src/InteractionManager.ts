import * as PIXI from 'pixi.js-legacy';
import type { CanvasKit } from 'canvaskit-wasm';
import type { RenderContext } from './types';
import { MapperRegistry } from './mappers';
import { TransformManager } from './TransformManager';
import { PixiEventBridge } from './PixiEventBridge';

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
  private downTarget: PIXI.DisplayObject | null = null;
  private hitCtx: RenderContext;

  constructor(
    canvas: HTMLCanvasElement,
    ck: CanvasKit,
    registry: MapperRegistry,
    getScene: () => PIXI.Container | null
  ) {
    this.canvas = canvas;
    this.ck = ck;
    this.registry = registry;
    this.getScene = getScene;
    canvas.style.touchAction = 'none';

    this.hitCtx = { ck, canvas: null, paint: null, imageCache: new Map(), alphaCache: new Map() };
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointerleave', this.onOut);
  }

  // ✅ Renderer-level listeners (optional, for global canvas events)
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

  private onDown = (e: PointerEvent) => {
    const ev = this.hitTest(e);
    this.downTarget = ev.target; // ✅ Track down target
    this.emitRendererEvent('pointerdown', ev);
    PixiEventBridge.dispatch('pointerdown', ev.target, ev.global, e);
  };

  private onUp = (e: PointerEvent) => {
    const ev = this.hitTest(e);
    this.emitRendererEvent('pointerup', ev);
    PixiEventBridge.dispatch('pointerup', ev.target, ev.global, e);

    // ✅ 2. TAP / CLICK GESTURE RECOGNITION
    if (this.downTarget && this.downTarget === ev.target) {
      this.emitRendererEvent('pointertap', ev);
      PixiEventBridge.dispatch('pointertap', ev.target, ev.global, e);

      // Pixi also emits 'click' for mouse/touch parity
      this.emitRendererEvent('click', ev);
      PixiEventBridge.dispatch('click', ev.target, ev.global, e);
    }
    this.downTarget = null;
  };
  private onMove = (e: PointerEvent) => {
    const ev = this.hitTest(e);

    // ✅ 1. CURSOR MANAGEMENT
    const cursor = (ev.target as any)?.cursor || 'default';
    if (this.canvas.style.cursor !== cursor) {
      this.canvas.style.cursor = cursor;
    }

    if (ev.target !== this.overTarget) {
      if (this.overTarget) {
        this.emitRendererEvent('pointerout', {
          ...ev,
          target: this.overTarget,
          type: 'pointerout',
        });
        PixiEventBridge.dispatch('pointerout', this.overTarget, ev.global, e);
      }
      if (ev.target) {
        this.emitRendererEvent('pointerover', { ...ev, type: 'pointerover' });
        PixiEventBridge.dispatch('pointerover', ev.target, ev.global, e);
      }
      this.overTarget = ev.target;
    }

    this.emitRendererEvent('pointermove', ev);
    PixiEventBridge.dispatch('pointermove', ev.target, ev.global, e);
  };

  private onOut = (e: PointerEvent) => {
    this.canvas.style.cursor = 'default';
    if (this.overTarget) {
      const ev = {
        type: 'pointerout' as const,
        target: this.overTarget,
        global: { x: 0, y: 0 },
        local: { x: 0, y: 0 },
        originalEvent: e,
      };
      this.emitRendererEvent('pointerout', ev);
      PixiEventBridge.dispatch('pointerout', this.overTarget, { x: 0, y: 0 }, e);
    }
    this.overTarget = null;
  };

  private processEvent(type: 'pointerdown' | 'pointerup', e: PointerEvent): void {
    const ev = this.hitTest(e);
    this.emitRendererEvent(type, ev);
    // ✅ Removed local parameter
    PixiEventBridge.dispatch(type, ev.target, ev.global, e);
  }

  private emitRendererEvent(type: string, ev: InteractionEvent): void {
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

  /** Recursive hit test that respects Pixi's eventMode, interactiveChildren, and hitArea */
  private recursiveHitTest(
    obj: PIXI.DisplayObject,
    parentMatrix: Float32Array,
    x: number,
    y: number
  ): PIXI.DisplayObject | null {
    if (!obj.visible || obj.alpha === 0) return null;

    const world = TransformManager.multiply(
      parentMatrix,
      TransformManager.pixiToSkiaMatrix(obj.transform)
    );

    // ✅ Check children FIRST (back-to-front), but respect interactiveChildren
    if (obj instanceof PIXI.Container && (obj as any).interactiveChildren !== false) {
      for (let i = obj.children.length - 1; i >= 0; i--) {
        const hit = this.recursiveHitTest(obj.children[i], world, x, y);
        if (hit) return hit;
      }
    }

    // ✅ Check if this object is interactive
    if (!PixiEventBridge.isInteractive(obj)) return null;

    // ✅ Use explicit hitArea if provided (bypasses mapper hit test)
    if (obj.hitArea) {
      const local = TransformManager.inverseTransformPoint(world, x, y);
      if (obj.hitArea.contains(local.x, local.y)) return obj;
      return null;
    }

    // ✅ Fallback to mapper hit test (Graphics, Sprite, etc.)
    const mapper = this.registry.getMapper(obj);
    if (mapper?.hitTest(this.hitCtx, obj, world, x, y)) {
      return obj;
    }

    return null;
  }
}
