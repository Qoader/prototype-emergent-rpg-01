import { chunkKey, chunkOrigin, type ChunkCoord } from './coordinates';
import { biomeAt } from './terrain';
import { riversForChunk, type RiverSegment } from './rivers';
import { type HouseObstacle, type TreeObstacle } from './obstacles';
import { mergeWorldConfig, type WorldConfig, type ChunkTier } from './world-config';
import { SettlementGraph, type Settlement } from './settlements';
import type { Road } from './settlements';
import { ProceduralTreeGenerator } from './tree-generator';

export type WorldChunk = Readonly<{ key: string; coord: ChunkCoord; tier: ChunkTier; biome: ReturnType<typeof biomeAt>; trees: ReadonlyArray<TreeObstacle>; houses: ReadonlyArray<HouseObstacle>; settlements?: ReadonlyArray<Settlement>; roads?: ReadonlyArray<Road>; rivers: ReadonlyArray<RiverSegment>; lastSimulatedAt: number }>;
export interface ChunkGenerator { generate(coord: ChunkCoord): WorldChunk; }

export class ProceduralChunkGenerator implements ChunkGenerator {
  private readonly config: WorldConfig;
  private readonly settlementGraph: SettlementGraph;
  private readonly treeGenerator: ProceduralTreeGenerator;
  constructor(config: Partial<WorldConfig> = {}) { this.config = mergeWorldConfig(config); this.settlementGraph = new SettlementGraph(this.config.seed, this.config.terrain); this.treeGenerator = new ProceduralTreeGenerator(this.config); }
  generate(coord: ChunkCoord): WorldChunk {
    const key = chunkKey(coord), origin = chunkOrigin(coord, this.config.chunkSize);
    const center = { x: origin.x + this.config.chunkSize / 2, y: origin.y + this.config.chunkSize / 2 };
    const biome = biomeAt(center, this.config.seed, this.config.terrain);
    const trees: TreeObstacle[] = [...this.treeGenerator.generateForChunk(coord)];
    const houses: HouseObstacle[] = [];
    const features = this.settlementGraph.featuresForChunk(coord, this.config.chunkSize);
    return { key, coord, tier: 3, biome, trees, houses, settlements: features.settlements, roads: features.roads, rivers: riversForChunk(coord, this.config.seed, this.config.chunkSize, this.config.terrain, this.config.rivers), lastSimulatedAt: 0 };
  }
}
