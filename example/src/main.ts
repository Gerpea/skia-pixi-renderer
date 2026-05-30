// example/src/main.ts
import * as PIXI from 'pixi.js-legacy';
import { SkiaRenderer } from 'skpxr';
import { SceneFactory } from './SceneFactory';
import { UIController } from './UIController';
import { exportSceneToPdf } from './utils/pdf-export';
import './ui/styles.scss';

async function init(): Promise<void> {
  // 1️⃣ Initialize Pixi Application
  const pixiApp = new PIXI.Application({
    width: 300,
    height: 300,
    backgroundColor: 0x1099bb,
    forceCanvas: true,
    resolution: window.devicePixelRatio || 1
  });
  document.getElementById('pixi-container')!.appendChild(pixiApp.view);

  // 2️⃣ Create Shared Scene Container
  const scene = new PIXI.Container();
  pixiApp.stage.addChild(scene);

  // 3️⃣ Initialize Skia Renderer (New API: auto-syncs to Ticker.shared & ResizeObserver)
  const skiaRenderer = new SkiaRenderer({
    scene,
    canvas: document.getElementById('skia-canvas') as HTMLCanvasElement,
    wasmBaseUrl: '/canvaskit/'
  });
  await skiaRenderer.init();

  // 4️⃣ Add Initial Shapes & Sprites
  const initialObjects = SceneFactory.createSampleScene();
  scene.addChild(initialObjects.mainContainer);

  // 5️⃣ UI Setup
  const ui = new UIController();
  ui.enableControls();

  ui.onGenerate(() => {
    scene.addChild(SceneFactory.createRandomGraphics());
    ui.updateStatus('🎲 Shape added to scene');
  });

  ui.onAddSprite(() => {
    scene.addChild(SceneFactory.createRandomSprite());
    ui.updateStatus('🖼️ Sprite added to scene');
  });

  ui.onExport(async () => {
    await exportSceneToPdf(skiaRenderer);
    ui.updateStatus('✅ PDF exported successfully');
  });

  // 6️⃣ Skia Interaction (Pixi-like API)
  skiaRenderer.on('pointerdown', (e) => {
    if (e.target) {
      console.log(`👆 Skia Clicked: ${e.target.constructor.name}`);
      // Visual feedback: toggle tint
      e.target.tint = e.target.tint === 0xFFFFFF ? 0xCCCCCC : 0xFFFFFF;
    }
  });

  skiaRenderer.on('pointerover', () => {
    (document.getElementById('skia-canvas') as HTMLCanvasElement).style.cursor = 'pointer';
  });

  skiaRenderer.on('pointerout', () => {
    (document.getElementById('skia-canvas') as HTMLCanvasElement).style.cursor = 'default';
  });

  // 7️⃣ FPS Tracking
  let pFrames = 0, sFrames = 0, lastTime = performance.now();
  pixiApp.ticker.add(() => {
    pFrames++;
    sFrames++; // Skia auto-renders on shared ticker, so we count frames here
    const now = performance.now();
    if (now - lastTime >= 1000) {
      document.getElementById('pixi-fps')!.textContent = `${pFrames} FPS`;
      document.getElementById('skia-fps')!.textContent = `${sFrames} FPS`;
      pFrames = 0; sFrames = 0; lastTime = now;
    }
  });

  // 8️⃣ Cleanup on unload
  window.addEventListener('beforeunload', () => skiaRenderer.destroy());
}

init().catch(err => {
  console.error('🚨 Init failed:', err);
  document.getElementById('status')!.textContent = '⛔ Error: ' + err.message;
});