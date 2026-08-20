import { worldToChunk, type ChunkCoord, type WorldPoint } from '../coordinates';
import { biomeAt, type TerrainConfig } from '../terrain';
import { seededHash } from '../random';
import type { Settlement, SettlementType } from './types';
import type { SettlementConfig, SettlementDefinition } from './config';

export type TerrainSampler = { biomeAt(point: WorldPoint): ReturnType<typeof biomeAt> };
export type SettlementRegion = Readonly<{ x: number; y: number }>;

export class SettlementPlacementService {
  constructor(private readonly seed: number, private readonly terrain: TerrainConfig, private readonly config: SettlementConfig) {}
  regionFor(coord: ChunkCoord): SettlementRegion { return { x: Math.floor(coord.x / this.config.regionChunkSpan), y: Math.floor(coord.y / this.config.regionChunkSpan) }; }
  settlementsForRegion(region: SettlementRegion): ReadonlyArray<Settlement> { return this.config.definitions.flatMap((definition) => Array.from({ length: definition.count }, (_, index) => this.createSettlement(region, definition, index))); }
  private candidateFor(region: SettlementRegion, definition: SettlementDefinition, index: number): WorldPoint {
    const cell = Math.floor(index / definition.gridSide), column = index % definition.gridSide, span = this.config.regionChunkSpan;
    const jitter = (salt: number) => seededHash(this.seed, region.x, region.y, definition.salt + index * 2 + salt);
    return { x: (region.x * span + (column + 0.2 + jitter(0) * 0.6) * span / definition.gridSide) * 128 + 64, y: (region.y * span + (cell + 0.2 + jitter(1) * 0.6) * span / definition.gridSide) * 128 + 64 };
  }
  private suitability(point: WorldPoint): number { const biome = biomeAt(point, this.seed, this.terrain); return biome === 'plains' ? 3 : biome === 'forest' ? 1 : -100; }
  private createSettlement(region: SettlementRegion, definition: SettlementDefinition, index: number): Settlement {
    let center = this.candidateFor(region, definition, index), score = this.suitability(center);
    for (let attempt = 0; attempt < this.config.placementAttempts && score < 0; attempt += 1) {
      const salt = definition.salt + 9000 + index * 3 + attempt;
      const next = { x: center.x + (seededHash(this.seed, region.x, region.y, salt) - 0.5) * 180 * 128, y: center.y + (seededHash(this.seed, region.x, region.y, salt + 1) - 0.5) * 180 * 128 }, nextScore = this.suitability(next);
      if (nextScore > score) { center = next; score = nextScore; }
    }
    const chunk = worldToChunk(center), chunks: ChunkCoord[] = [];
    for (let y = 0; y < definition.size; y += 1) for (let x = 0; x < definition.size; x += 1) chunks.push({ x: chunk.x + x, y: chunk.y + y });
    return { id: `${definition.type}:${region.x},${region.y}:${index}`, type: definition.type, center, size: definition.size, chunks };
  }
}
