import { CHUNK_SIZE, type ChunkCoord, type WorldPoint } from '../coordinates';
import { biomeAt, type TerrainConfig } from '../terrain';
import { DeterministicRandom } from '../deterministic-random';
import type { Settlement, SettlementFeature } from './types';
import { settlementTemplate, type SettlementTemplate } from './rules';

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
const boundsOf = (x: number, y: number, width: number, height: number): Bounds => ({
  minX: x - width / 2,
  minY: y - height / 2,
  maxX: x + width / 2,
  maxY: y + height / 2,
});
const intersects = (a: Bounds, b: Bounds): boolean =>
  a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
const idHash = (id: string): number =>
  [...id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) | 0, 7);

export class SettlementLayoutService {
  constructor(
    private readonly seed: number,
    private readonly terrain: TerrainConfig,
  ) {}

  layoutFor(settlement: Settlement): ReadonlyArray<SettlementFeature> {
    const hash = idHash(settlement.id),
      random = new DeterministicRandom(this.seed, hash, settlement.size),
      template = settlementTemplate(settlement.type),
      scale = settlement.size * CHUNK_SIZE,
      cx = settlement.center.x,
      cy = settlement.center.y;
    const features: SettlementFeature[] = [];
    const footprint = boundsOf(cx, cy, scale * 0.82, scale * 0.72);
    const ground: SettlementFeature = {
      id: `${settlement.id}:ground`,
      settlementId: settlement.id,
      kind: 'ground',
      bounds: footprint,
      points: [
        { x: footprint.minX, y: footprint.minY },
        { x: footprint.maxX, y: footprint.minY },
        { x: footprint.maxX, y: footprint.maxY },
        { x: footprint.minX, y: footprint.maxY },
      ],
      style: biomeAt(settlement.center, this.seed, this.terrain),
    };
    features.push(ground);
    const roadPoints = this.localRoads(settlement, footprint, template, random);
    roadPoints.forEach((points, index) =>
      features.push({
        id: `${settlement.id}:street:${index}`,
        settlementId: settlement.id,
        kind: 'street',
        bounds: this.pointsBounds(points, template.streetWidth),
        points,
        width: template.streetWidth,
        roadType: template.roadType,
        blocked: false,
      }),
    );
    if (template.hasWalls) this.addWalls(features, settlement, footprint, roadPoints);
    this.addBuildings(features, settlement, footprint, roadPoints, template, random);
    if (template.hasLandmark)
      this.addLandmarks(features, settlement, footprint, random, template.hasFarm);
    return features;
  }

  featuresForChunk(settlement: Settlement, chunk: ChunkCoord): ReadonlyArray<SettlementFeature> {
    const origin = { x: chunk.x * CHUNK_SIZE, y: chunk.y * CHUNK_SIZE },
      chunkBounds = {
        minX: origin.x - 24,
        minY: origin.y - 24,
        maxX: origin.x + CHUNK_SIZE + 24,
        maxY: origin.y + CHUNK_SIZE + 24,
      };
    return this.layoutFor(settlement).filter((feature) => intersects(feature.bounds, chunkBounds));
  }

  private localRoads(
    settlement: Settlement,
    footprint: Bounds,
    template: SettlementTemplate,
    random: DeterministicRandom,
  ): WorldPoint[][] {
    const cx = settlement.center.x,
      cy = settlement.center.y,
      roads: WorldPoint[][] = [
        [
          { x: footprint.minX, y: cy },
          { x: cx, y: cy },
          { x: footprint.maxX, y: cy },
        ],
      ];
    if (settlement.type === 'waypost')
      return [
        [
          { x: footprint.minX, y: cy },
          { x: cx, y: cy },
        ],
      ];
    for (let index = 0; index < template.spokeCount; index += 1) {
      const angle =
        (Math.PI * 2 * index) / template.spokeCount + random.signed(2110 + index) * 0.11;
      const end = {
        x: cx + Math.cos(angle) * (footprint.maxX - cx) * 0.82,
        y: cy + Math.sin(angle) * (footprint.maxY - cy) * 0.82,
      };
      roads.push([
        { x: cx, y: cy },
        { x: cx + Math.cos(angle + 0.12) * 18, y: cy + Math.sin(angle + 0.12) * 18 },
        end,
      ]);
    }
    if (settlement.type === 'city' || settlement.type === 'capital') {
      const ringX = (footprint.maxX - footprint.minX) * 0.26,
        ringY = (footprint.maxY - footprint.minY) * 0.24;
      roads.push([
        { x: cx - ringX, y: cy - ringY },
        { x: cx + ringX, y: cy - ringY },
        { x: cx + ringX, y: cy + ringY },
        { x: cx - ringX, y: cy + ringY },
        { x: cx - ringX, y: cy - ringY },
      ]);
    }
    return roads;
  }

  private addBuildings(
    features: SettlementFeature[],
    settlement: Settlement,
    footprint: Bounds,
    roads: WorldPoint[][],
    template: SettlementTemplate,
    random: DeterministicRandom,
  ): void {
    const count = template.buildingCount,
      cell = Math.max(
        28,
        Math.min(72, (footprint.maxX - footprint.minX) / Math.max(3, Math.sqrt(count) + 1)),
      );
    let index = 0;
    for (let y = footprint.minY + cell; y < footprint.maxY - cell && index < count; y += cell)
      for (let x = footprint.minX + cell; x < footprint.maxX - cell && index < count; x += cell) {
        const jitterX = random.signed(2200 + index * 2) * cell * 0.275,
          jitterY = random.signed(2201 + index * 2) * cell * 0.275;
        const position = { x: x + jitterX, y: y + jitterY },
          width = settlement.type === 'capital' ? 30 : settlement.type === 'city' ? 26 : 22,
          height = settlement.type === 'waypost' ? 22 : 26,
          bounds = boundsOf(position.x, position.y, width, height);
        if (
          roads.some((road) =>
            road.some(
              (point) =>
                Math.abs(point.x - position.x) < width && Math.abs(point.y - position.y) < height,
            ),
          )
        )
          continue;
        features.push({
          id: `${settlement.id}:building:${index}`,
          settlementId: settlement.id,
          kind: 'building',
          bounds,
          position,
          width,
          height,
          rotation: random.signed(2202 + index) * 0.15,
          style: `${settlement.type}-${index % 3}`,
          blocked: true,
        });
        index += 1;
      }
  }

  private addWalls(
    features: SettlementFeature[],
    settlement: Settlement,
    footprint: Bounds,
    roads: WorldPoint[][],
  ): void {
    const points = [
      { x: footprint.minX, y: footprint.minY },
      { x: footprint.maxX, y: footprint.minY },
      { x: footprint.maxX, y: footprint.maxY },
      { x: footprint.minX, y: footprint.maxY },
      { x: footprint.minX, y: footprint.minY },
    ];
    features.push({
      id: `${settlement.id}:wall`,
      settlementId: settlement.id,
      kind: 'wall',
      bounds: footprint,
      points,
      width: settlement.type === 'capital' ? 9 : 7,
      blocked: true,
    });
    roads.forEach((road, index) => {
      const point = road.reduce(
        (farthest, candidate) =>
          Math.hypot(candidate.x - settlement.center.x, candidate.y - settlement.center.y) >
          Math.hypot(farthest.x - settlement.center.x, farthest.y - settlement.center.y)
            ? candidate
            : farthest,
        road[0],
      );
      const next = road[Math.max(0, road.indexOf(point) - 1)] ?? road[1] ?? point;
      features.push({
        id: `${settlement.id}:gate:${index}`,
        settlementId: settlement.id,
        kind: 'gate',
        bounds: boundsOf(point.x, point.y, 24, 24),
        position: point,
        width: 24,
        height: 24,
        rotation: Math.atan2(point.y - next.y, point.x - next.x),
        blocked: false,
      });
    });
  }

  private addLandmarks(
    features: SettlementFeature[],
    settlement: Settlement,
    footprint: Bounds,
    random: DeterministicRandom,
    hasFarm: boolean,
  ): void {
    const position =
      settlement.type === 'capital'
        ? settlement.center
        : {
            x: settlement.center.x + random.signed(2300) * 24,
            y: settlement.center.y + random.signed(2301) * 24,
          };
    const bounds = boundsOf(
      position.x,
      position.y,
      settlement.type === 'capital' ? 70 : 28,
      settlement.type === 'capital' ? 70 : 28,
    );
    features.push({
      id: `${settlement.id}:landmark`,
      settlementId: settlement.id,
      kind: 'landmark',
      bounds,
      position,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
      style: settlement.type === 'capital' ? 'keep' : 'well',
      blocked: settlement.type === 'capital',
    });
    if (hasFarm) {
      const farm = boundsOf(footprint.maxX - 28, footprint.maxY - 28, 42, 30);
      features.push({
        id: `${settlement.id}:farm`,
        settlementId: settlement.id,
        kind: 'farm',
        bounds: farm,
        position: { x: farm.minX + 21, y: farm.minY + 15 },
        width: 42,
        height: 30,
        blocked: true,
      });
    }
  }

  private pointsBounds(points: ReadonlyArray<WorldPoint>, padding: number): Bounds {
    return {
      minX: Math.min(...points.map((point) => point.x)) - padding,
      minY: Math.min(...points.map((point) => point.y)) - padding,
      maxX: Math.max(...points.map((point) => point.x)) + padding,
      maxY: Math.max(...points.map((point) => point.y)) + padding,
    };
  }
}
