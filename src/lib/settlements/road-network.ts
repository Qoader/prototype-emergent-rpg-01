import { chunkOrigin, type ChunkCoord } from '../coordinates';
import { polylineIntersectsBounds } from './geometry';
import type { TerrainConfig } from '../terrain';
import { SettlementTopologyService } from './topology';
import { TerrainAwareRoadRouter } from './routing';
import type { Road, Settlement, SettlementEdge } from './types';

export class SettlementRoadNetwork {
  private readonly roads = new Map<string, Road>();
  private readonly topology = new SettlementTopologyService();
  private readonly router: TerrainAwareRoadRouter;
  constructor(
    seed: number,
    terrain: TerrainConfig,
    private readonly queryRadius = 4096,
  ) {
    this.router = new TerrainAwareRoadRouter(seed, terrain);
  }
  roadsForChunk(
    coord: ChunkCoord,
    chunkSize: number,
    universe: ReadonlyArray<Settlement>,
  ): ReadonlyArray<Road> {
    const origin = chunkOrigin(coord, chunkSize),
      bounds = {
        minX: origin.x,
        minY: origin.y,
        maxX: origin.x + chunkSize,
        maxY: origin.y + chunkSize,
      };
    const roads: Road[] = [];
    for (const edge of this.edgesForChunk(coord, chunkSize, universe)) {
      const length = Math.max(
        1,
        Math.hypot(edge.to.center.x - edge.from.center.x, edge.to.center.y - edge.from.center.y),
      );
      const padding = length * 0.32 + 24;
      if (!polylineIntersectsBounds([edge.from.center, edge.to.center], bounds, padding)) continue;
      let road = this.roads.get(edge.id);
      if (!road) {
        road = this.router.route(edge);
        this.roads.set(edge.id, road);
      }
      if (polylineIntersectsBounds(road.points, bounds, 24)) roads.push(road);
    }
    return roads;
  }
  edgesForChunk(
    coord: ChunkCoord,
    chunkSize: number,
    universe: ReadonlyArray<Settlement>,
  ): ReadonlyArray<SettlementEdge> {
    const regionSpan = 200 * chunkSize,
      regionOrigin = {
        x: Math.floor(coord.x / 200) * regionSpan,
        y: Math.floor(coord.y / 200) * regionSpan,
      },
      sources = universe.filter(
        (settlement) =>
          settlement.center.x >= regionOrigin.x - this.queryRadius &&
          settlement.center.x <= regionOrigin.x + regionSpan + this.queryRadius &&
          settlement.center.y >= regionOrigin.y - this.queryRadius &&
          settlement.center.y <= regionOrigin.y + regionSpan + this.queryRadius,
      );
    return this.topology.buildEdges(sources, universe);
  }
  edgesForSettlements(universe: ReadonlyArray<Settlement>): ReadonlyArray<SettlementEdge> {
    return this.topology.buildEdges(universe, universe);
  }
}
