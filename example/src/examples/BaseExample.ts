// example/src/examples/BaseExample.ts
import * as PIXI from 'pixi.js-legacy';
import { SkiaRenderer } from 'skpxr';
import { SceneFactory } from '../SceneFactory';
import type { Example } from './types';

export abstract class BaseExample implements Example {
  protected pixiApp!: PIXI.Application;
  protected skiaRenderer!: SkiaRenderer;
  protected scene!: PIXI.Container;
  protected mountPoint!: HTMLElement;

  // FPS tracking
  private pixiFrames = 0;
  private skiaFrames = 0;
  private lastFpsUpdate = 0;

  protected constructor(protected id: string, protected name: string) {}

  async init(): Promise<void> {
    // Create container for this example
    this.mountPoint = this.createContainer();
    
    // Initialize Pixi Application with responsive size
    this.pixiApp = new PIXI.Application({
      width: 600,
      height: 600,
      backgroundColor: 0x1099bb,
      forceCanvas: true,
      resolution: window.devicePixelRatio || 1,
    });

    // Create shared scene container
    this.scene = new PIXI.Container();
    this.pixiApp.stage.addChild(this.scene);

    // Initialize scene
    this.setupScene();

    // Initialize Skia Renderer
    this.skiaRenderer = new SkiaRenderer({
      scene: this.scene,
      width: 600,
      height: 600,
      backgroundColor: this.pixiApp.renderer.background.color,
      wasmBaseUrl: '/canvaskit/',
    });
    await this.skiaRenderer.init();

    // Mount canvases to DOM
    const pixiWrapper = this.mountPoint.querySelector('.pixi-canvas')! as HTMLDivElement;
    const skiaWrapper = this.mountPoint.querySelector('.skia-canvas')! as HTMLDivElement;
    pixiWrapper.appendChild(this.pixiApp.view);
    skiaWrapper.appendChild(this.skiaRenderer.view);

    // Setup FPS tracking and button handlers
    this.setupFPS();
    this.setupButtonHandlers();
  }

  abstract setupScene(): void;
  abstract createContainer(): HTMLElement;

  getContainer(): HTMLElement {
    return this.mountPoint;
  }

  dispose(): void {
    this.skiaRenderer?.destroy();
    this.pixiApp?.destroy();
  }

  getUIElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'example-item';
    el.dataset.exampleId = this.id;
    el.innerHTML = `
      <h3>${this.name}</h3>
      <p>${(this as any).description || ''}</p>
    `;
    return el;
  }

  protected setupFPS(): void {
    const pixiEl = this.mountPoint?.querySelector('.pixi-fps');
    const skiaEl = this.mountPoint?.querySelector('.skia-fps');

    if (pixiEl && skiaEl) {
      this.pixiApp.ticker.add(() => {
        this.pixiFrames++;
        this.skiaFrames++;
        this.updateFPS(pixiEl, skiaEl);
      });
    }
  }

  private updateFPS(pixiEl: Element, skiaEl: Element): void {
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      (pixiEl as HTMLElement).textContent = `${this.pixiFrames} FPS`;
      (skiaEl as HTMLElement).textContent = `${this.skiaFrames} FPS`;
      this.pixiFrames = 0;
      this.skiaFrames = 0;
      this.lastFpsUpdate = now;
    }
  }

  protected addRandomShape(): PIXI.Graphics {
    return SceneFactory.createRandomGraphicsNoEvents();
  }

  protected addRandomSprite(): PIXI.Sprite {
    return SceneFactory.createRandomSpriteNoEvents();
  }

  protected abstract onAddShape(): void;
  protected abstract onAddSprite(): void;
  protected abstract onExport(): Promise<void>;

  private setupButtonHandlers(): void {
    const addShapeBtn = this.mountPoint.querySelector('.btn-add-shape') as HTMLButtonElement;
    const addSpriteBtn = this.mountPoint.querySelector('.btn-add-sprite') as HTMLButtonElement;
    const exportBtn = this.mountPoint.querySelector('.btn-export') as HTMLButtonElement;

    addShapeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAddShape();
    });
    addSpriteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAddSprite();
    });
    exportBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onExport();
    });
  }
}