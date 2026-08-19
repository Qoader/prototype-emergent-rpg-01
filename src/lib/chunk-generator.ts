import { chunkKey, chunkOrigin, type ChunkCoord } from './coordinates';
import { seededHash } from './random';
import { biomeAt } from './terrain';
import { riversForChunk, type RiverSegment } from './rivers';
import { type HouseObstacle, type TreeObstacle } from './obstacles';
import { mergeWorldConfig, type WorldConfig, type ChunkTier } from './world-config';

export type WorldChunk = Readonly<{ key: string; coord: ChunkCoord; tier: ChunkTier; biome: ReturnType<typeof biomeAt>; trees: ReadonlyArray<TreeObstacle>; houses: ReadonlyArray<HouseObstacle>; rivers: ReadonlyArray<RiverSegment>; lastSimulatedAt: number }>;
export interface ChunkGenerator { generate(coord: ChunkCoord): WorldChunk; }

export class ProceduralChunkGenerator implements ChunkGenerator {
  private readonly config: WorldConfig;
  constructor(config: Partial<WorldConfig> = {}) { this.config = mergeWorldConfig(config); }
  generate(coord: ChunkCoord): WorldChunk {
    const key = chunkKey(coord), origin = chunkOrigin(coord, this.config.chunkSize);
    const center = { x: origin.x + this.config.chunkSize / 2, y: origin.y + this.config.chunkSize / 2 };
    const biome = biomeAt(center, this.config.seed, this.config.terrain);
    const trees: TreeObstacle[] = [];
    if (biome === 'forest' || biome === 'plains') {
      const count = biome === 'forest' ? this.config.obstacles.forestTreeCount : this.config.obstacles.plainsTreeBase + Math.floor(seededHash(this.config.seed, coord.x, coord.y, 101) * this.config.obstacles.plainsTreeVariance);
      const margin = this.config.obstacles.treeMargin;
      for (let index = 0; index < count; index += 1) trees.push({ id: `${key}:tree:${index}`, x: origin.x + margin + seededHash(this.config.seed, coord.x, coord.y, 200 + index) * (this.config.chunkSize - margin * 2), y: origin.y + margin + seededHash(this.config.seed, coord.x, coord.y, 300 + index) * (this.config.chunkSize - margin * 2), radius: biome === 'forest' ? this.config.obstacles.forestTreeRadius : this.config.obstacles.plainsTreeRadius });
    }
    const houses: HouseObstacle[] = [];
    if (biome === 'plains' && seededHash(this.config.seed, coord.x, coord.y, 401) > this.config.obstacles.houseChance) houses.push({ id: `${key}:house:0`, x: origin.x + this.config.obstacles.houseX, y: origin.y + this.config.obstacles.houseY, width: this.config.obstacles.houseWidth, height: this.config.obstacles.houseHeight });
    return { key, coord, tier: 3, biome, trees, houses, rivers: riversForChunk(coord, this.config.seed, this.config.chunkSize, this.config.terrain, this.config.rivers), lastSimulatedAt: 0 };
  }
}
