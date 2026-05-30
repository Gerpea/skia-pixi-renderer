// example/src/examples/types.ts
export interface Example {
  /** Initialize the example, set up the scene and UI */
  init(): Promise<void>;
  /** Clean up resources */
  dispose(): void;
  /** Get the HTML element for the example's UI controls (to be placed in the drawer) */
  getUIElement(): HTMLElement;
  /** Optional: update method called each frame */
  update?(deltaTime: number): void;
  /** Get the container element for this example (the side-by-side panels) */
  getContainer(): HTMLElement;
}