import { chunkOrigin, type ChunkCoord } from '../coordinates';
import type { TerrainConfig } from '../terrain';
import { DEFAULT_SETTLEMENT_CONFIG, type SettlementConfig } from './config';
import { SettlementCatalog } from './catalog';
import { SettlementRoadNetwork } from './road-network';
import { SettlementLayoutService } from './layout';
import type { SettlementFeature, SettlementFeatures } from './types';

export class SettlementGraph {
  private readonly catalog: SettlementCatalog;
  private readonly roads: SettlementRoadNetwork;
  private readonly layouts = new Map<string, ReadonlyArray<SettlementFeature>>();
  private readonly layout: SettlementLayoutService;
  constructor(seed: number, terrain: TerrainConfig, config: SettlementConfig = DEFAULT_SETTLEMENT_CONFIG) { this.catalog = new SettlementCatalog(seed, terrain, config); this.roads = new SettlementRoadNetwork(seed, terrain); this.layout = new SettlementLayoutService(seed, terrain); }
  featuresForChunk(coord: ChunkCoord, chunkSize = 128): SettlementFeatures {
    const universe = this.catalog.neighborhoodForChunk(coord), settlements = universe.filter((settlement) => settlement.chunks.some((chunk) => chunk.x === coord.x && chunk.y === coord.y)), origin = chunkOrigin(coord, chunkSize), region = this.catalog.regionFor(coord), regionSpan = 200 * chunkSize, regionCenter = { x: (region.x + 0.5) * regionSpan, y: (region.y + 0.5) * regionSpan }, bounds = { minX: origin.x - 24, minY: origin.y - 24, maxX: origin.x + chunkSize + 24, maxY: origin.y + chunkSize + 24 }, layout: SettlementFeature[] = [];
    for (const settlement of universe) { let features = this.layouts.get(settlement.id); if (!features) { features = this.layout.layoutFor(settlement); this.layouts.set(settlement.id, features); } layout.push(...features.filter((feature) => feature.bounds.minX <= bounds.maxX && feature.bounds.maxX >= bounds.minX && feature.bounds.minY <= bounds.maxY && feature.bounds.maxY >= bounds.minY)); }
    return { settlements, roads: this.roads.roadsForChunk(coord, chunkSize, regionCenter, universe), layout };
  }
}
