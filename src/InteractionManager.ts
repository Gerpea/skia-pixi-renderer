// src/skia-wrapper/InteractionManager.ts
import * as PIXI from 'pixi.js-legacy';
import type { CanvasKit, Path } from 'canvaskit-wasm';
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
    this.canvas.addEventListener('pointercancel', this.onCancel);
    this.canvas.addEventListener('pointerleave', this.onOut);

    // ✅ Global listeners ensure pointerup reaches drag target even outside canvas
    window.addEventListener('pointerup', this.onGlobalUp);
    window.addEventListener('pointercancel', this.onGlobalUp);
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
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.canvas.removeEventListener('pointerleave', this.onOut);
    window.removeEventListener('pointerup', this.onGlobalUp);
    window.removeEventListener('pointercancel', this.onGlobalUp);
  }

  private getCoords(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId);
    const ev = this.hitTest(e);
    this.downTarget = ev.target;

    this.emitRendererEvent('pointerdown', ev);
    PixiEventBridge.dispatch('pointerdown', ev.target, ev.global, e);
  };

  private onUp = (e: PointerEvent) => {
    const ev = this.hitTest(e);

    // ✅ Always dispatch pointerup to the original downTarget so dragging state clears
    const upTarget = this.downTarget || ev.target;
    this.emitRendererEvent('pointerup', { ...ev, target: upTarget });
    PixiEventBridge.dispatch('pointerup', upTarget, ev.global, e);

    // Tap/click only if up and down match
    if (this.downTarget && this.downTarget === ev.target) {
      this.emitRendererEvent('pointertap', ev);
      PixiEventBridge.dispatch('pointertap', ev.target, ev.global, e);
      this.emitRendererEvent('click', ev);
      PixiEventBridge.dispatch('click', ev.target, ev.global, e);
    }

    this.clearDragState(e);
  };

  private onCancel = (e: PointerEvent) => {
    this.clearDragState(e);
  };

  private onGlobalUp = (e: PointerEvent) => {
    // Only process if it originated from our canvas
    if (this.downTarget) {
      const global = this.getCoords(e);
      const ev = {
        type: 'pointerup' as const,
        target: this.downTarget,
        global,
        local: { x: 0, y: 0 },
        originalEvent: e,
      };
      this.emitRendererEvent('pointerup', ev);
      PixiEventBridge.dispatch('pointerup', this.downTarget, global, e);
      this.clearDragState(e);
    }
  };

  private onMove = (e: PointerEvent) => {
    const global = this.getCoords(e);
    const ev = this.hitTest(e);

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
        PixiEventBridge.dispatch('pointerout', this.overTarget, global, e);
      }
      if (ev.target) {
        this.emitRendererEvent('pointerover', { ...ev, type: 'pointerover' });
        PixiEventBridge.dispatch('pointerover', ev.target, global, e);
      }
      this.overTarget = ev.target;
    }

    // ✅ Dispatch move to actual hit target (hover logic stays independent)
    this.emitRendererEvent('pointermove', ev);
    PixiEventBridge.dispatch('pointermove', ev.target, global, e);
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

  private clearDragState(e: PointerEvent): void {
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      // I want application to not crush, but don't care about the message
    }
    this.downTarget = null;
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
    let local = {
      x: global.x,
      y: global.y,
    };

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

    const world = TransformManager.multiply(
      parentMatrix,
      TransformManager.pixiToSkiaMatrix(obj.transform)
    );

    if (obj instanceof PIXI.Container && (obj as any).interactiveChildren !== false) {
      for (let i = obj.children.length - 1; i >= 0; i--) {
        const hit = this.recursiveHitTest(obj.children[i], world, x, y);
        if (hit) return hit;
      }
    }

    if (!PixiEventBridge.isInteractive(obj)) return null;

    if (obj.hitArea) {
      const local = TransformManager.inverseTransformPoint(world, x, y);
      if (obj.hitArea.contains(local.x, local.y)) return obj;
      return null;
    }

    const mapper = this.registry.getMapper(obj);
    if (mapper?.hitTest(this.hitCtx, obj, world, x, y)) {
      return obj;
    }

    return null;
  }
}
