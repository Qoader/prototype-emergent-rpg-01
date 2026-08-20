import type { TerrainConfig } from '../terrain';
import type { ChunkCoord } from '../coordinates';
import { DEFAULT_SETTLEMENT_CONFIG, type SettlementConfig } from './config';
import { SettlementPlacementService, type SettlementRegion } from './placement';
import type { Settlement } from './types';

export class SettlementCatalog {
  private readonly regions = new Map<string, ReadonlyArray<Settlement>>();
  private readonly placement: SettlementPlacementService;
  constructor(
    seed: number,
    terrain: TerrainConfig,
    config: SettlementConfig = DEFAULT_SETTLEMENT_CONFIG,
  ) {
    this.placement = new SettlementPlacementService(seed, terrain, config);
  }
  regionFor(coord: ChunkCoord): SettlementRegion {
    return this.placement.regionFor(coord);
  }
  settlementsForRegion(region: SettlementRegion): ReadonlyArray<Settlement> {
    const key = `${region.x},${region.y}`,
      cached = this.regions.get(key);
    if (cached) return cached;
    const settlements = this.placement.settlementsForRegion(region);
    this.regions.set(key, settlements);
    return settlements;
  }
  neighborhoodForChunk(coord: ChunkCoord): ReadonlyArray<Settlement> {
    const region = this.regionFor(coord),
      result: Settlement[] = [];
    for (let y = region.y - 1; y <= region.y + 1; y += 1)
      for (let x = region.x - 1; x <= region.x + 1; x += 1)
        result.push(...this.settlementsForRegion({ x, y }));
    return result;
  }
}
