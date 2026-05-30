// example/src/utils/pdf-export.ts
import { SkiaRenderer, type PdfExportOptions } from 'skpxr';

export async function exportSceneToPdf(
  skiaRenderer: SkiaRenderer,
  options: Omit<PdfExportOptions, 'pageSize'> = { filename: 'pixi-skia-export.pdf' }
): Promise<void> {
  try {
    await skiaRenderer.downloadPdf(options);
  } catch (err) {
    console.error('PDF export failed:', err);
    throw err;
  }
}