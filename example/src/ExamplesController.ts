// example/src/ExamplesController.ts
import type { Example } from './examples/types';
import { EXAMPLES } from './examples';

export class ExamplesController {
  private examples = EXAMPLES;
  private activeExample: Example | null = null;
  private containerEl: HTMLElement;
  private drawerEl: HTMLElement;

  constructor(container: HTMLElement, drawer: HTMLElement) {
    this.containerEl = container;
    this.drawerEl = drawer;
  }

  init(): void {
    this.renderDrawer();
  }

  private renderDrawer(): void {
    this.drawerEl.innerHTML = '';
    for (const example of this.examples) {
      const itemEl = example.create().getUIElement();
      itemEl.addEventListener('click', () => this.switchExample(example.id));
      this.drawerEl.appendChild(itemEl);
    }
  }

  async switchExample(exampleId: string): Promise<void> {
    // Clean up current example
    if (this.activeExample) {
      this.activeExample.dispose();
    }

    // Clear container
    this.containerEl.innerHTML = '';

    // Find and initialize new example
    const def = this.examples.find(e => e.id === exampleId);
    if (!def) return;

    const example = def.create();
    await example.init();
    this.activeExample = example;

    // Mount the example's container to DOM
    const exampleEl = example.getContainer();
    if (exampleEl) {
      this.containerEl.appendChild(exampleEl);
    }

    // Mark active in drawer
    this.drawerEl.querySelectorAll('.example-item').forEach(el => {
      el.classList.toggle('active', el.dataset.exampleId === exampleId);
    });
  }

  async start(defaultExampleId: string = 'export'): Promise<void> {
    await this.switchExample(defaultExampleId);
  }
}