import * as PIXI from 'pixi.js-legacy';
import type { CanvasKit, Canvas, Paint, Image, PDFMetadata } from 'canvaskit-wasm';

export interface RenderContext {
  ck: CanvasKit;
  canvas: Canvas | null;
  paint: Paint | null;
  imageCache: Map<string, Image>;
  alphaCache: Map<string, Uint8Array>;
  activeMasks?: Set<PIXI.DisplayObject>;
}

export interface SkiaRendererOptions {
  scene: PIXI.Container;
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
  backgroundColor?: number | string;
  dpr?: number;
  wasmBaseUrl?: string;
  locateFile?: (file: string) => string;
  backend?: 'webgl' | 'cpu';
}

export interface PdfExportOptions {
  filename?: string;
  pageSize?: { width: number; height: number };
  metadata?: PDFMetadata;
}
