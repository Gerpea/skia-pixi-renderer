// src/skia-wrapper/SkiaRenderer.ts
import CanvasKitInit from 'canvaskit-wasm';
import type { CanvasKit, Canvas, Surface, Paint, Image, Path } from 'canvaskit-wasm';
import * as PIXI from 'pixi.js-legacy';
import type { SkiaRendererOptions, RenderContext, PdfExportOptions } from './types';
import { TransformManager } from './TransformManager';
import { MapperRegistry, ContainerMapper, GraphicsMapper, SpriteMapper } from './mappers';
import { InteractionManager, type InteractionEvent } from './InteractionManager';
import { CK } from './utils/ck-helpers';
import { PathBuilderUtil } from './utils/path-builder';

export class SkiaRenderer {
  private ck: CanvasKit | null = null;
  private surface: Surface | null = null;
  private canvas: Canvas | null = null;
  private paint: Paint | null = null;

  private registry = new MapperRegistry();
  private imageCache = new Map<string, Image>();
  private alphaCache = new Map<string, Uint8Array>();
  private interactionManager: InteractionManager | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private tickerBound = false;

  constructor(private options: SkiaRendererOptions) {
    const containerMapper = new ContainerMapper();
    containerMapper.setRenderer(this);
    this.registry.register(containerMapper);
    this.registry.register(new GraphicsMapper());
    this.registry.register(new SpriteMapper());
  }

  async init(): Promise<void> {
    const { dpr = 1, wasmBaseUrl, locateFile, canvas: el } = this.options;
    const loc =
      locateFile ||
      (f => {
        const base = wasmBaseUrl?.endsWith('/') ? wasmBaseUrl : `${wasmBaseUrl}/`;
        return base ? `${base}${f}` : `/canvaskit/${f}`;
      });

    this.ck = await CanvasKitInit({ locateFile: loc });
    this.updateCanvasSize();

    this.resizeObserver = new ResizeObserver(() => this.updateCanvasSize());
    this.resizeObserver.observe(el);

    this.surface = this.ck.MakeSWCanvasSurface(el);
    if (!this.surface) throw new Error('MakeSWCanvasSurface returned null');

    this.canvas = this.surface.getCanvas();
    this.paint = CK.makePaint(this.ck);

    this.interactionManager = new InteractionManager(
      el,
      this.ck,
      this.registry,
      () => this.options.scene,
      this.alphaCache
    );

    PIXI.Ticker.shared.add(this.onTick);
    this.tickerBound = true;
  }

  private onTick = (): void => {
    if (this.options.scene) this.renderContainer(this.options.scene);
  };

  private updateCanvasSize(): void {
    const { dpr = 1, canvas: el } = this.options;
    const rect = el.getBoundingClientRect();
    el.width = Math.ceil(rect.width * dpr);
    el.height = Math.ceil(rect.height * dpr);
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
  }

  renderContainer(container: PIXI.Container): void {
    if (!this.canvas || !this.ck || !this.paint) return;
    const ctx: RenderContext = {
      ck: this.ck,
      canvas: this.canvas,
      paint: this.paint,
      imageCache: this.imageCache,
      alphaCache: this.alphaCache,
    };
    this.canvas.clear(this.ck.Color4f(0, 0, 0, 0));
    this.drawObject(ctx, container, TransformManager.identity());
    this.surface?.flush();
  }

  drawObject(ctx: RenderContext, obj: PIXI.DisplayObject, worldMatrix: Float32Array): void {
    if (!obj.visible || obj.alpha === 0) return;

    const mask = (obj as any).mask;
    let hasVectorMask = false;
    let hasAlphaMask = false;

    let objLayerPaint: Paint | null = null;
    let maskLayerPaint: Paint | null = null;

    if (mask) {
      // Pixi uses Graphics for vector masks (stencil/clip) and Sprites/Containers for alpha masks.
      const isVectorMask = mask instanceof PIXI.Graphics && !(mask as any).isSpriteMask;

      if (isVectorMask) {
        // 1. Vector Mask (Fast, binary clipping)
        const maskPath = this.buildMaskPath(ctx, mask, worldMatrix);
        if (maskPath) {
          ctx.canvas?.save();
          ctx.canvas?.clipPath(maskPath, ctx.ck?.ClipOp.Intersect, true);
          maskPath.delete();
          hasVectorMask = true;
        }
      } else {
        // 2. Alpha Mask (Supports transparency, sprites, containers)
        objLayerPaint = new ctx.ck.Paint();
        ctx.canvas?.saveLayer(objLayerPaint, null); // Layer 1: The Object

        maskLayerPaint = new ctx.ck.Paint();
        maskLayerPaint.setBlendMode(ctx.ck.BlendMode.DstIn); // Layer 2: The Mask (Alpha only)
        hasAlphaMask = true;
      }
    }

    // Draw the actual object
    this.registry.getMapper(obj)?.draw(ctx, obj as any, worldMatrix);

    if (hasAlphaMask && mask && maskLayerPaint && objLayerPaint) {
      // Save layer for the mask with DstIn blend mode
      ctx.canvas?.saveLayer(maskLayerPaint, null);

      // To draw the mask correctly regardless of where it is in the scene graph,
      // we calculate its parent's world transform relative to the current canvas matrix.
      const currentCanvasMatrix = new Float32Array(ctx.canvas!.getTotalMatrix());
      const currentInv = TransformManager.invert(currentCanvasMatrix);

      if (currentInv) {
        const parentWorldTransform = mask.parent
          ? mask.parent.transform.worldTransform
          : new PIXI.Matrix();
        const parentSkiaMatrix = TransformManager.pixiToSkiaMatrix(parentWorldTransform);

        const relMatrix = TransformManager.multiply(currentInv, parentSkiaMatrix);
        ctx.canvas?.concat(relMatrix);

        const maskMapper = this.registry.getMapper(mask);
        if (maskMapper) {
          const maskWorldMatrix = TransformManager.multiply(
            parentSkiaMatrix,
            TransformManager.pixiToSkiaMatrix(mask.transform.localTransform)
          );
          maskMapper.draw(ctx, mask, maskWorldMatrix);
        }
      }

      ctx.canvas?.restore(); // Composites Mask onto Object using DstIn
      ctx.canvas?.restore(); // Composites Object onto Main Canvas using SrcOver

      maskLayerPaint.delete();
      objLayerPaint.delete();
    } else if (hasVectorMask) {
      ctx.canvas?.restore(); // Restore vector clip
    }
  }

  /**
   * Builds the mask path and transforms it into the current canvas coordinate space (for Vector Masks).
   */
  private buildMaskPath(
    ctx: RenderContext,
    mask: PIXI.Graphics,
    currentWorldMatrix: Float32Array
  ): Path | null {
    const data = (mask as any).geometry?.graphicsData || [];
    if (!data.length) return null;

    const maskWorldMatrix = mask.transform.worldTransform;
    const maskSkiaMatrix = TransformManager.pixiToSkiaMatrix(maskWorldMatrix);

    const parentInv = TransformManager.invert(currentWorldMatrix);
    if (!parentInv) return null;

    const relMatrix = TransformManager.multiply(parentInv, maskSkiaMatrix);

    const builder = new ctx.ck.PathBuilder();
    try {
      for (const item of data) {
        const shapePath = PathBuilderUtil.build(item.shape, item.type, ctx.ck);
        if (shapePath) {
          builder.addPath(shapePath);
          shapePath.delete();
        }
      }
      builder.transform(Array.from(relMatrix));
      return builder.detach();
    } finally {
      builder.delete();
    }
  }

  hitTestObject(
    ctx: RenderContext,
    obj: PIXI.DisplayObject,
    worldMatrix: Float32Array,
    x: number,
    y: number
  ): boolean {
    return this.registry.getMapper(obj)?.hitTest(ctx, obj as any, worldMatrix, x, y) ?? false;
  }

  // 🖱️ Interaction API
  on(event: string, cb: (e: InteractionEvent) => void): void {
    this.interactionManager?.on(event, cb);
  }
  off(event: string, cb: (e: InteractionEvent) => void): void {
    this.interactionManager?.off(event, cb);
  }

  // 📄 PDF Export (Reuses Mappers)
  async exportToPdf(options: PdfExportOptions = {}): Promise<Uint8Array> {
    if (!this.ck?.pdf) throw new Error('PDF support not enabled in CanvasKit build');
    if (!this.options.scene) throw new Error('No scene provided for PDF export');

    const page = options.pageSize || {
      width: this.options.canvas.clientWidth,
      height: this.options.canvas.clientHeight,
    };

    const doc = this.ck.MakePDFDocument(options.metadata || {});
    if (!doc) throw new Error('Failed to create PDF document');

    try {
      const pdfCanvas = doc.beginPage(page.width, page.height);
      if (!pdfCanvas) throw new Error('Failed to begin page');

      const pdfPaint = this.ck.MakePaint();
      pdfPaint.setAntiAlias(true);
      const ctx: RenderContext = {
        ck: this.ck,
        canvas: pdfCanvas,
        paint: pdfPaint,
        imageCache: this.imageCache,
        alphaCache: this.alphaCache,
      };

      this.drawObject(ctx, this.options.scene, TransformManager.identity());
      doc.endPage();
      return doc.close();
    } catch (e) {
      doc.abort();
      throw e;
    }
  }

  async downloadPdf(options: PdfExportOptions = {}): Promise<void> {
    const bytes = await this.exportToPdf(options);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = options.filename || 'export.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  destroy(): void {
    if (this.tickerBound) PIXI.Ticker.shared.remove(this.onTick);
    this.resizeObserver?.disconnect();

    this.imageCache.forEach(img => img.delete?.());
    this.imageCache.clear();
    this.alphaCache.clear();

    this.paint?.delete();
    this.surface?.flush();
    this.surface?.delete();
    this.interactionManager?.destroy();
    this.ck = null;
  }
}
