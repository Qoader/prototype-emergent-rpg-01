import { AStarNavigator } from './navigation';
import { GameEngine } from './game-engine';
import { PixiRenderer } from './pixi-renderer';
import { WorldManager } from './world-manager';

export class EmberfallGame {
  private readonly world = new WorldManager();
  private readonly engine = new GameEngine(
    this.world,
    new AStarNavigator(),
    {},
    { now: () => performance.now() },
  );
  private readonly renderer = new PixiRenderer(this.world, (point) =>
    this.engine.setDestination(point),
  );
  private mounted = false;
  async mount(host: HTMLElement): Promise<void> {
    await this.renderer.mount(host);
    this.mounted = true;
    this.renderer.render(this.engine.getSnapshot());
    this.renderer.app.ticker.add(({ deltaTime }) => {
      if (!this.mounted) return;
      this.engine.tick(deltaTime / 60);
      this.renderer.render(this.engine.getSnapshot());
    });
  }
  destroy(): void {
    this.mounted = false;
    this.renderer.destroy();
  }
}
