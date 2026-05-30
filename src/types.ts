// src/skia-wrapper/types.ts
import * as PIXI from 'pixi.js-legacy';
import type { CanvasKit, Canvas, Paint, Image, PDFMetadata } from 'canvaskit-wasm';

export interface RenderContext {
  ck: CanvasKit;
  canvas: Canvas | null;
  paint: Paint | null;
  imageCache: Map<string, any>;
  /** Stores the alpha channel (Uint8Array) for pixel-perfect hit testing */
  alphaCache: Map<string, Uint8Array>;
}

export interface SkiaRendererOptions {
  scene: PIXI.Container;
  canvas: HTMLCanvasElement;
  dpr?: number;
  wasmBaseUrl?: string;
  locateFile?: (file: string) => string;
}

export interface PdfExportOptions {
  filename?: string;
  pageSize?: { width: number; height: number };
  metadata?: PDFMetadata;
}
