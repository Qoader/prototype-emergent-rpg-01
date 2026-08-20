import { biomeAt, type TerrainConfig } from '../terrain';
import type { WorldPoint } from '../coordinates';
import { settlementConnector } from './geometry';
import type { Road, SettlementEdge } from './types';

export class TerrainAwareRoadRouter {
  constructor(
    private readonly seed: number,
    private readonly terrain: TerrainConfig,
  ) {}
  route(edge: SettlementEdge): Road {
    return {
      id: edge.id,
      type: edge.type,
      from: edge.from.id,
      to: edge.to.id,
      points: this.path(
        settlementConnector(edge.from, edge.to.center),
        settlementConnector(edge.to, edge.from.center),
      ),
    };
  }
  private path(start: WorldPoint, end: WorldPoint): ReadonlyArray<WorldPoint> {
    const dx = end.x - start.x,
      dy = end.y - start.y,
      length = Math.max(1, Math.hypot(dx, dy)),
      nx = -dy / length,
      ny = dx / length;
    const score = (bend: number) =>
      [-0.28, -0.14, 0, 0.14, 0.28].includes(bend)
        ? Array.from({ length: 7 }, (_, i) => {
            const t = (i + 1) / 8,
              wave = Math.sin(t * Math.PI) * bend * length;
            return biomeAt(
              { x: start.x + dx * t + nx * wave, y: start.y + dy * t + ny * wave },
              this.seed,
              this.terrain,
            ) === 'ocean'
              ? 100
              : 0;
          }).reduce((a, b) => a + b, 0 as number)
        : Infinity;
    const bend = [-0.28, -0.14, 0, 0.14, 0.28].reduce(
      (best, value) => (score(value) < score(best) ? value : best),
      0,
    );
    return Array.from({ length: 9 }, (_, index) => {
      const t = index / 8,
        wave =
          Math.sin(t * Math.PI) * bend * length +
          Math.sin(t * Math.PI * 3 + this.seed) * Math.min(48, length * 0.04);
      return { x: start.x + dx * t + nx * wave, y: start.y + dy * t + ny * wave };
    });
  }
}
