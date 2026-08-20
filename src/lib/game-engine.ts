import { advanceTowards, type Point } from './movement';
import { type ChunkCoord, worldToChunk } from './coordinates';
import type { Navigator } from './navigation';
import type { WorldService } from './world-manager';

export interface Clock {
  now(): number;
}
export interface RendererAdapter {
  mount(host: HTMLElement): Promise<void>;
  render(snapshot: EngineSnapshot): void;
  destroy(): void;
}
export type EngineSnapshot = Readonly<{
  player: Point;
  destination?: Point;
  path: ReadonlyArray<Point>;
  elapsed: number;
}>;
export type EngineConfig = { movementSpeed: number };
export const DEFAULT_ENGINE_CONFIG: EngineConfig = { movementSpeed: 150 };

export class GameEngine {
  private player: Point = { x: 0, y: 0 };
  private destination: Point | undefined;
  private path: Point[] = [];
  private elapsed = 0;
  private syncedChunk: ChunkCoord;
  private readonly config: EngineConfig;
  constructor(
    private readonly world: WorldService,
    private readonly navigator: Navigator,
    config: Partial<EngineConfig> = {},
    private readonly clock: Clock = { now: () => performance.now() },
  ) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.world.syncAround(this.player);
    this.syncedChunk = this.world.getChunkAt(this.player)?.coord ?? worldToChunk(this.player);
  }
  getSnapshot(): EngineSnapshot {
    return {
      player: { ...this.player },
      destination: this.destination && { ...this.destination },
      path: this.path.map((point) => ({ ...point })),
      elapsed: this.elapsed,
    };
  }
  getWorld(): WorldService {
    return this.world;
  }
  setDestination(target: Point): void {
    this.destination = { ...target };
    this.path = this.navigator.findPath(this.player, target, this.world).slice(1);
  }
  tick(deltaSeconds: number): void {
    const safeDelta = Math.max(0, deltaSeconds);
    this.elapsed += safeDelta;
    this.world.tick(safeDelta, this.clock.now() / 1000);
    if (this.path.length > 0) {
      const movement = advanceTowards(
        this.player,
        this.path[0],
        this.config.movementSpeed,
        safeDelta,
      );
      this.player = movement.position;
      if (movement.arrived) {
        this.path.shift();
        if (this.path.length === 0) this.destination = undefined;
      }
    }
    const currentChunk = this.world.getChunkAt(this.player)?.coord;
    if (
      !currentChunk ||
      currentChunk.x !== this.syncedChunk.x ||
      currentChunk.y !== this.syncedChunk.y
    ) {
      this.world.syncAround(this.player);
      this.syncedChunk = this.world.getChunkAt(this.player)?.coord ?? worldToChunk(this.player);
    }
  }
}
