import { chunkOrigin, type ChunkCoord } from '../coordinates';
import type { TerrainConfig } from '../terrain';
import { DEFAULT_SETTLEMENT_CONFIG, type SettlementConfig } from './config';
import { SettlementPlacementService, type SettlementRegion } from './placement';
import { SettlementTopologyService } from './topology';
import { TerrainAwareRoadRouter } from './routing';
import type { Road, Settlement, SettlementFeatures } from './types';

export class SettlementGraph {
  private readonly regions = new Map<string, ReadonlyArray<Settlement>>();
  private readonly roads = new Map<string, Road>();
  private readonly placement: SettlementPlacementService;
  private readonly topology = new SettlementTopologyService();
  private readonly router: TerrainAwareRoadRouter;
  constructor(seed: number, terrain: TerrainConfig, config: SettlementConfig = DEFAULT_SETTLEMENT_CONFIG) { this.placement = new SettlementPlacementService(seed, terrain, config); this.router = new TerrainAwareRoadRouter(seed, terrain); }
  private getRegion(region: SettlementRegion): ReadonlyArray<Settlement> { const key = `${region.x},${region.y}`, cached = this.regions.get(key); if (cached) return cached; const value = this.placement.settlementsForRegion(region); this.regions.set(key, value); return value; }
  private getNeighborhood(coord: ChunkCoord): Settlement[] { const region = this.placement.regionFor(coord), result: Settlement[] = []; for (let y = region.y - 1; y <= region.y + 1; y += 1) for (let x = region.x - 1; x <= region.x + 1; x += 1) result.push(...this.getRegion({ x, y })); return result; }
  private getRoadsForChunk(coord: ChunkCoord, chunkSize: number, universe: ReadonlyArray<Settlement>): ReadonlyArray<Road> {
    const origin = chunkOrigin(coord, chunkSize), region = this.placement.regionFor(coord), regionSpan = 200 * chunkSize, regionCenter = { x: (region.x + 0.5) * regionSpan, y: (region.y + 0.5) * regionSpan }, sources = universe.filter((node) => Math.abs(node.center.x - regionCenter.x) < 4096 && Math.abs(node.center.y - regionCenter.y) < 4096), roads: Road[] = [];
    for (const edge of this.topology.buildEdges(sources, universe)) { let road = this.roads.get(edge.id); if (!road) { road = this.router.route(edge); this.roads.set(edge.id, road); } if (road.points.some((point) => point.x >= origin.x - 160 && point.x <= origin.x + chunkSize + 160 && point.y >= origin.y - 160 && point.y <= origin.y + chunkSize + 160)) roads.push(road); }
    return roads;
  }
  featuresForChunk(coord: ChunkCoord, chunkSize = 128): SettlementFeatures { const universe = this.getNeighborhood(coord), settlements = universe.filter((settlement) => settlement.chunks.some((chunk) => chunk.x === coord.x && chunk.y === coord.y)); return { settlements, roads: this.getRoadsForChunk(coord, chunkSize, universe) }; }
}
