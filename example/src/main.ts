// example/src/main.ts
import { ExamplesController } from './ExamplesController';
import './ui/styles.scss';

async function init(): Promise<void> {
  const drawerEl = document.getElementById('example-list')!;
  const containerEl = document.getElementById('example-container')!;
  
  // Setup examples controller
  const examplesController = new ExamplesController(containerEl, drawerEl);
  examplesController.init();
  
  // Start with first example
  await examplesController.start('export');
}

init().catch(err => {
  console.error('🚨 Init failed:', err);
});