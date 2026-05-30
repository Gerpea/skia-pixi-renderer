// example/src/examples/DragExample.ts
import * as PIXI from 'pixi.js-legacy';
import type { Example } from './types';
import { BaseExample } from './BaseExample';
import { exportSceneToPdf } from '../utils/pdf-export';

export class DragExample extends BaseExample {
  private dragTarget: PIXI.DisplayObject | null = null;
  private dragOffset = { x: 0, y: 0 };

  constructor() {
    super('drag', 'Drag & Drop');
    (this as any).description = 'Click and drag shapes with mouse';
  }

  setupScene(): void {
    // Create draggable shapes with random positions
    for (let i = 0; i < 8; i++) {
      const shape = this.createDraggableShape(i);
      this.scene.addChild(shape);
    }
  }

  createContainer(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'example-panel';
    el.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Pixi.js (Drag)</span>
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
          <span class="panel-title">Skia CanvasKit (Drag)</span>
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

  private createDraggableShape(index: number): PIXI.Graphics {
    const g = new PIXI.Graphics();
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800, 0x8800ff];
    
    g.beginFill(colors[index % colors.length]);
    g.drawRoundedRect(-30, -30, 60, 60, 8);
    g.endFill();
    
    // Random position across full canvas (600x600)
    g.x = 50 + Math.random() * 500;
    g.y = 50 + Math.random() * 500;
    
    // Enable interaction
    g.eventMode = 'static';
    g.cursor = 'grab';
    
    this.setupDragForObject(g);
    return g;
  }

  private setupDragForObject(obj: PIXI.DisplayObject): void {
    obj.eventMode = 'static';
    obj.cursor = 'grab';
    
    obj.on('pointerdown', (e) => {
      obj.cursor = 'grabbing';
      // Bring to front by moving to end of children array
      const parent = obj.parent;
      if (parent) {
        parent.removeChild(obj);
        parent.addChild(obj);
      }
      this.dragTarget = obj;
      this.dragOffset.x = obj.x - e.global.x;
      this.dragOffset.y = obj.y - e.global.y;
      e.stopPropagation();
    });
    
    obj.on('pointermove', (e) => {
      if (this.dragTarget === obj) {
        obj.position.set(e.global.x + this.dragOffset.x, e.global.y + this.dragOffset.y);
      }
    });
    
    obj.on('pointerup', () => {
      if (this.dragTarget === obj) {
        obj.cursor = 'grab';
        this.dragTarget = null;
      }
    });
    
    obj.on('pointerupoutside', () => {
      if (this.dragTarget === obj) {
        obj.cursor = 'grab';
        this.dragTarget = null;
      }
    });
  }

  protected onAddShape(): void {
    const shape = this.addRandomShape();
    this.scene.addChild(shape);
    this.setupDragForObject(shape);
  }

  protected onAddSprite(): void {
    const sprite = this.addRandomSprite();
    this.scene.addChild(sprite);
    this.setupDragForObject(sprite);
  }

  protected async onExport(): Promise<void> {
    try {
      await exportSceneToPdf(this.skiaRenderer);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }
}