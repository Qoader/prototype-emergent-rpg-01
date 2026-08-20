import { chunkKey, worldToChunk, type ChunkCoord, type WorldPoint } from './coordinates';
import { WorldCollisionService } from './obstacles';
import { ProceduralChunkGenerator, type ChunkGenerator, type WorldChunk } from './chunk-generator';
import { mergeWorldConfig, tierForDistance, type WorldConfig } from './world-config';

export interface WorldService {
  syncAround(player: WorldPoint): ReadonlyArray<WorldChunk>;
  getChunkAt(point: WorldPoint): WorldChunk | undefined;
  getLoadedChunks(): ReadonlyArray<WorldChunk>;
  isWalkable(point: WorldPoint): boolean;
  tick(deltaSeconds: number, now: number): void;
}

export class WorldManager implements WorldService {
  readonly config: WorldConfig;
  private readonly generator: ChunkGenerator;
  private readonly chunks = new Map<string, WorldChunk>();
  private readonly collision = new WorldCollisionService();
  private center: ChunkCoord = { x: 0, y: 0 };
  constructor(config: Partial<WorldConfig> = {}, generator?: ChunkGenerator) {
    this.config = mergeWorldConfig(config);
    this.generator = generator ?? new ProceduralChunkGenerator(this.config);
  }
  get loadedChunks(): ReadonlyArray<WorldChunk> {
    return this.getLoadedChunks();
  }
  get currentChunk(): ChunkCoord {
    return { ...this.center };
  }
  getLoadedChunks(): ReadonlyArray<WorldChunk> {
    return [...this.chunks.values()];
  }
  syncAround(player: WorldPoint): ReadonlyArray<WorldChunk> {
    this.center = worldToChunk(player, this.config.chunkSize);
    const next = new Set<string>();
    for (let y = -this.config.tier2Radius; y <= this.config.tier2Radius; y += 1)
      for (let x = -this.config.tier2Radius; x <= this.config.tier2Radius; x += 1) {
        const coord = { x: this.center.x + x, y: this.center.y + y },
          key = chunkKey(coord);
        next.add(key);
        if (!this.chunks.has(key)) this.chunks.set(key, this.generator.generate(coord));
      }
    for (const [key, chunk] of this.chunks) {
      const distance = Math.max(
        Math.abs(chunk.coord.x - this.center.x),
        Math.abs(chunk.coord.y - this.center.y),
      );
      if (distance > this.config.retentionRadius) this.chunks.delete(key);
      else if (next.has(key))
        this.chunks.set(key, { ...chunk, tier: tierForDistance(distance, this.config) });
      else this.chunks.set(key, { ...chunk, tier: 3 });
    }
    return this.getLoadedChunks();
  }
  getChunkAt(point: WorldPoint): WorldChunk | undefined {
    return this.chunks.get(chunkKey(worldToChunk(point, this.config.chunkSize)));
  }
  isWalkable(point: WorldPoint): boolean {
    const chunk = this.getChunkAt(point);
    return !!chunk && !this.collision.isBlocked(point, chunk, this.config);
  }
  tick(_deltaSeconds: number, now: number): void {
    for (const [, chunk] of this.chunks) {
      const due =
        chunk.tier === 0 ||
        (chunk.tier === 1 && now - chunk.lastSimulatedAt >= 0.25) ||
        (chunk.tier === 2 && now - chunk.lastSimulatedAt >= 30);
      if (due) (chunk as { lastSimulatedAt: number }).lastSimulatedAt = now;
    }
  }
}
