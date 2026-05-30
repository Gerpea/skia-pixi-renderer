// example/src/examples/PDFExportExample.ts
import * as PIXI from 'pixi.js-legacy';
import type { Example } from './types';
import { BaseExample } from './BaseExample';
import { SceneFactory } from '../SceneFactory';
import { exportSceneToPdf } from '../utils/pdf-export';

export class PDFExportExample extends BaseExample {
  private statusEl!: HTMLElement;

  constructor() {
    super('export', 'PDF Export');
    (this as any).description = 'Export shapes and sprites to PDF';
  }

  setupScene(): void {
    // Add initial shapes
    for (let i = 0; i < 5; i++) {
      this.scene.addChild(SceneFactory.createRandomGraphicsNoEvents());
    }
    
    // Add initial sprite
    this.scene.addChild(SceneFactory.createRandomSpriteNoEvents());
  }

  createContainer(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'example-panel';
    el.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Pixi.js</span>
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
          <span class="panel-title">Skia CanvasKit</span>
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
    this.scene.addChild(SceneFactory.createRandomGraphicsNoEvents());
  }

  protected onAddSprite(): void {
    this.scene.addChild(SceneFactory.createRandomSpriteNoEvents());
  }

  protected async onExport(): Promise<void> {
    try {
      await exportSceneToPdf(this.skiaRenderer);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }
}