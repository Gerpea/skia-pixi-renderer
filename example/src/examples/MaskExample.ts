// example/src/examples/MaskExample.ts
import * as PIXI from 'pixi.js-legacy';
import type { Example } from './types';
import { BaseExample } from './BaseExample';
import { exportSceneToPdf } from '../utils/pdf-export';

export class MaskExample extends BaseExample {
  private dragTarget: PIXI.DisplayObject | null = null;
  private dragOffset = { x: 0, y: 0 };
  private maskRef!: PIXI.Graphics;

  constructor() {
    super('mask', 'Masking');
    (this as any).description = 'Graphics mask demonstration - drag shapes to see masking effect';
  }

  setupScene(): void {
    // Create a content container that will hold shapes to be masked
    const content = new PIXI.Container();
    
    // Create shapes that will be draggable and masked
    for (let i = 0; i < 10; i++) {
      const shape = this.createDraggableShape(i);
      content.addChild(shape);
    }
    
    // Create the mask - positioned in world coordinates
    this.maskRef = new PIXI.Graphics();
    this.maskRef.beginFill(0xffffff);
    this.maskRef.drawCircle(0, 0, 300);  // Circle at origin
    this.maskRef.endFill();
    this.maskRef.x = 300;  // Position mask at center of the 600x600 canvas
    this.maskRef.y = 300;

    // Apply mask to content - shapes only visible inside the circle area
    content.mask = this.maskRef;
    
    // Add content to scene first (so it's children[0])
    this.scene.addChild(content);
    
    // Add mask to scene for Skia transform reference (invisible)
    this.scene.addChild(this.maskRef);
  }

  createContainer(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'example-panel';
    el.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Pixi.js (Masked)</span>
          <div class="panel-actions">
            <button class="btn-add-shape">Add Shape</button>
            <button class="btn-export">Export PDF</button>
          </div>
          <span class="panel-fps pixi-fps">-- FPS</span>
        </div>
        <div class="canvas-wrapper pixi-canvas"></div>
      </div>
      
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Skia CanvasKit (Masked)</span>
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
    obj.on('pointerdown', (e) => {
      obj.cursor = 'grabbing';
      // Bring to front
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
    const content = this.scene.children[0] as PIXI.Container; // First child is content
    if (content) {
      const shape = this.createDraggableShape(Math.floor(Math.random() * 100));
      content.addChild(shape);
    }
  }

  protected onAddSprite(): void {
    // Not used in mask example
  }

  protected async onExport(): Promise<void> {
    try {
      await exportSceneToPdf(this.skiaRenderer);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }
}