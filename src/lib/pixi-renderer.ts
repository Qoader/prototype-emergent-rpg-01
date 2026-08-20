import { Application, Container, Rectangle } from 'pixi.js';
import type { EngineSnapshot, RendererAdapter } from './game-engine';
import { screenToWorld } from './input-mapper';
import { PixiChunkRenderer } from './pixi-chunk-renderer';
import { PixiChunkEntity } from './pixi-chunk-entity';
import { PixiPlayerRenderer } from './pixi-player-renderer';
import type { WorldService } from './world-manager';

export class PixiRenderer implements RendererAdapter {
  readonly app = new Application();
  private readonly world = new Container();
  private readonly camera = new Container();
  private readonly map = new Container();
  private readonly chunks = new Map<string, PixiChunkEntity>();
  private readonly chunkRenderer = new PixiChunkRenderer();
  private readonly playerRenderer = new PixiPlayerRenderer();
  private zoom = 1;
  private host: HTMLElement | undefined;
  constructor(
    private readonly worldService: WorldService,
    private readonly onTarget: (point: { x: number; y: number }) => void,
  ) {}
  async mount(host: HTMLElement): Promise<void> {
    this.host = host;
    await this.app.init({
      background: 0x090d1d,
      antialias: true,
      resizeTo: host,
      resolution: Math.min(devicePixelRatio, 2),
    });
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.world.addChild(this.camera);
    this.camera.addChild(this.map);
    this.map.addChild(this.playerRenderer.view);
    this.world.eventMode = 'static';
    this.world.on('pointertap', (event) => {
      const point = event.getLocalPosition(this.world);
      this.onTarget(screenToWorld(point, this.camera.position, this.zoom));
    });
    this.app.renderer.on('resize', this.resize, this);
    this.resize();
  }
  render(snapshot: EngineSnapshot): void {
    const chunks = this.worldService.getLoadedChunks(),
      active = new Set(chunks.map((chunk) => chunk.key));
    for (const chunk of chunks) {
      let view = this.chunks.get(chunk.key);
      if (!view) {
        view = new PixiChunkEntity(this.chunkRenderer);
        this.map.addChildAt(view, 0);
        this.chunks.set(chunk.key, view);
      }
      view.update(chunk);
    }
    for (const [key, view] of this.chunks)
      if (!active.has(key)) {
        view.destroy({ children: true });
        this.chunks.delete(key);
      }
    this.playerRenderer.render(snapshot);
    this.camera.scale.set(this.zoom);
    this.camera.position.set(
      this.app.screen.width / 2 - snapshot.player.x * this.zoom,
      this.app.screen.height / 2 - snapshot.player.y * this.zoom,
    );
  }
  destroy(): void {
    this.app.destroy(true, { children: true, texture: true });
    this.host = undefined;
  }
  private resize(): void {
    this.zoom = Math.min(1.35, Math.max(0.85, this.app.screen.width / 620));
    this.world.hitArea = new Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
  }
}
