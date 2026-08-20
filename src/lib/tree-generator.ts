import { chunkOrigin, type ChunkCoord } from './coordinates';
import { biomeAt } from './terrain';
import { seededHash } from './random';
import type { WorldConfig } from './world-config';
import type { TreeObstacle } from './obstacles';

export class ProceduralTreeGenerator {
  constructor(private readonly config: WorldConfig) {}
  generateForChunk(coord: ChunkCoord): ReadonlyArray<TreeObstacle> {
    const origin = chunkOrigin(coord, this.config.chunkSize),
      biome = biomeAt(
        { x: origin.x + this.config.chunkSize / 2, y: origin.y + this.config.chunkSize / 2 },
        this.config.seed,
        this.config.terrain,
      );
    if (biome !== 'forest' && biome !== 'plains') return [];
    const obstacle = this.config.obstacles,
      count =
        biome === 'forest'
          ? obstacle.forestTreeCount
          : obstacle.plainsTreeBase +
            Math.floor(
              seededHash(this.config.seed, coord.x, coord.y, 101) * obstacle.plainsTreeVariance,
            ),
      margin = obstacle.treeMargin;
    return Array.from({ length: count }, (_, index) => ({
      id: `${coord.x},${coord.y}:tree:${index}`,
      x:
        origin.x +
        margin +
        seededHash(this.config.seed, coord.x, coord.y, 200 + index) *
          (this.config.chunkSize - margin * 2),
      y:
        origin.y +
        margin +
        seededHash(this.config.seed, coord.x, coord.y, 300 + index) *
          (this.config.chunkSize - margin * 2),
      radius: biome === 'forest' ? obstacle.forestTreeRadius : obstacle.plainsTreeRadius,
    }));
  }
}
