// example/src/examples/BlendExample.ts
import * as PIXI from 'pixi.js-legacy';
import type { Example } from './types';
import { BaseExample } from './BaseExample';
import { SceneFactory } from '../SceneFactory';
import { exportSceneToPdf } from '../utils/pdf-export';

export class BlendExample extends BaseExample {
  private blends = [
    PIXI.BLEND_MODES.ADD,
    PIXI.BLEND_MODES.MULTIPLY,
    PIXI.BLEND_MODES.SCREEN,
    PIXI.BLEND_MODES.OVERLAY,
    PIXI.BLEND_MODES.DIFFERENCE,
  ];

  constructor() {
    super('blend', 'Blend Modes');
    (this as any).description = 'Different blend mode visualizations';
  }

  setupScene(): void {
    // Add blend-mode shapes
    for (let i = 0; i < 10; i++) {
      const shape = SceneFactory.createRandomGraphicsNoEvents();
      shape.blendMode = this.blends[i % this.blends.length];
      this.scene.addChild(shape);
    }
    
    // Add some sprites with blend modes too
    for (let i = 0; i < 5; i++) {
      const sprite = SceneFactory.createRandomSpriteNoEvents();
      sprite.blendMode = this.blends[i % this.blends.length];
      this.scene.addChild(sprite);
    }
  }

  createContainer(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'example-panel';
    el.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Pixi.js (Blend)</span>
          <div class="panel-actions">
            <button class="btn-add-shape">Add Shape</button>
            <button class="btn-add-sprite">Add Sprite</button>
          </div>
          <span class="panel-fps pixi-fps">-- FPS</span>
        </div>
        <div class="canvas-wrapper pixi-canvas"></div>
      </div>
      
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Skia CanvasKit (Blend)</span>
          <div class="panel-actions">
            <button class="btn-export">Export PDF</button>
          </div>
          <span class="panel-fps skia-fps">-- FPS</span>
        </div>
        <div class="canvas-wrapper skia-canvas"></div>
      </div>
    `;
    return el;
  }

  protected onAddShape(): void {
    const shape = this.addRandomShape();
    const nextBlend = this.blends[this.scene.children.length % this.blends.length];
    shape.blendMode = nextBlend;
    this.scene.addChild(shape);
  }

  protected onAddSprite(): void {
    const sprite = this.addRandomSprite();
    const nextBlend = this.blends[this.scene.children.length % this.blends.length];
    sprite.blendMode = nextBlend;
    this.scene.addChild(sprite);
  }

  protected async onExport(): Promise<void> {
    try {
      await exportSceneToPdf(this.skiaRenderer);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }
}