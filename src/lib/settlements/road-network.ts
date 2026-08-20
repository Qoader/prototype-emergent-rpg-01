import { chunkOrigin, type ChunkCoord } from '../coordinates';
import type { TerrainConfig } from '../terrain';
import { SettlementTopologyService } from './topology';
import { TerrainAwareRoadRouter } from './routing';
import type { Road, Settlement } from './types';

export class SettlementRoadNetwork {
  private readonly roads = new Map<string, Road>();
  private readonly topology = new SettlementTopologyService();
  private readonly router: TerrainAwareRoadRouter;
  constructor(seed: number, terrain: TerrainConfig) { this.router = new TerrainAwareRoadRouter(seed, terrain); }
  roadsForChunk(coord: ChunkCoord, chunkSize: number, regionCenter: { x: number; y: number }, universe: ReadonlyArray<Settlement>): ReadonlyArray<Road> {
    const origin = chunkOrigin(coord, chunkSize), sources = universe.filter((node) => Math.abs(node.center.x - regionCenter.x) < 4096 && Math.abs(node.center.y - regionCenter.y) < 4096), roads: Road[] = [];
    for (const edge of this.topology.buildEdges(sources, universe)) { let road = this.roads.get(edge.id); if (!road) { road = this.router.route(edge); this.roads.set(edge.id, road); } if (road.points.some((point) => point.x >= origin.x - 160 && point.x <= origin.x + chunkSize + 160 && point.y >= origin.y - 160 && point.y <= origin.y + chunkSize + 160)) roads.push(road); }
    return roads;
  }
}
