// example/src/examples/index.ts
import type { Example } from './types';
import { PDFExportExample } from './PDFExportExample';
import { DragExample } from './DragExample';
import { MaskExample } from './MaskExample';
import { BlendExample } from './BlendExample';

export { type Example, PDFExportExample, DragExample, MaskExample, BlendExample };

export interface ExampleDefinition {
  id: string;
  name: string;
  description: string;
  create: () => Example;
}

export const EXAMPLES: ExampleDefinition[] = [
  {
    id: 'export',
    name: 'PDF Export',
    description: 'Export Pixi scene to PDF via Skia backend',
    create: () => new PDFExportExample(),
  },
  {
    id: 'drag',
    name: 'Drag & Drop',
    description: 'Drag objects with mouse interaction',
    create: () => new DragExample(),
  },
  {
    id: 'mask',
    name: 'Masking',
    description: 'Graphics mask demonstration',
    create: () => new MaskExample(),
  },
  {
    id: 'blend',
    name: 'Blend Modes',
    description: 'Blend mode visualization',
    create: () => new BlendExample(),
  },
];