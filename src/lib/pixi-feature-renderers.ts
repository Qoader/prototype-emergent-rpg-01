import { Container, Graphics } from 'pixi.js';
import type { WorldChunk } from './chunk-generator';
import { CHUNK_SIZE } from './coordinates';
import type { Road, SettlementFeature } from './settlements';

export const WORLD_PALETTE = {
  plains: 0x263f39,
  forest: 0x1c3534,
  mountains: 0x3a3d4b,
  coast: 0x45504a,
  ocean: 0x102c49,
  grass: 0x3d765b,
  grassDark: 0x214d43,
  trunk: 0x684b3c,
  roof: 0x7a4e5d,
  wall: 0xb18b72,
  river: 0x59b9d4,
  riverEdge: 0x8edbe4,
  path: 0xb79a63,
  dirt: 0xa47b52,
  stone: 0xb9b8a5,
  highway: 0xd5c89b,
  settlement: 0xe8c477,
  settlementLight: 0xf6d995,
  capital: 0xc8954d,
  wallDark: 0x403b3a,
  wallLight: 0xd9b879,
  gate: 0x241f25,
};
export const ROAD_WIDTHS: Readonly<Record<Road['type'], number>> = {
  path: 5,
  dirt: 8,
  'stone-paved': 11,
  highway: 15,
};

export class TerrainRenderer {
  render(chunk: WorldChunk, view: Container): void {
    view.addChild(
      new Graphics().rect(0, 0, CHUNK_SIZE, CHUNK_SIZE).fill(WORLD_PALETTE[chunk.biome]),
    );
    for (const river of chunk.rivers) {
      const points = visiblePoints(river.points, view.x, view.y, 20);
      if (points.length > 1) {
        view.addChild(polyline(points, view.x, view.y, WORLD_PALETTE.river, 22, 0.95));
        view.addChild(polyline(points, view.x, view.y, WORLD_PALETTE.riverEdge, 3, 0.32));
      }
    }
  }
}

export class NaturalObstacleRenderer {
  render(chunk: WorldChunk, view: Container): void {
    for (const tree of chunk.trees) {
      const x = tree.x - view.x,
        y = tree.y - view.y,
        treeView = new Graphics()
          .ellipse(x, y + tree.radius + 5, tree.radius * 0.8, tree.radius * 0.3)
          .fill({ color: 0x000000, alpha: 0.2 });
      treeView.rect(x - 3, y + 5, 6, 14).fill(WORLD_PALETTE.trunk);
      treeView.circle(x, y, tree.radius).fill(WORLD_PALETTE.grassDark);
      treeView
        .circle(x - tree.radius * 0.35, y - tree.radius * 0.3, tree.radius * 0.7)
        .fill(WORLD_PALETTE.grass);
      view.addChild(treeView);
    }
    for (const house of chunk.houses) {
      const x = house.x - view.x,
        y = house.y - view.y,
        body = new Graphics()
          .rect(x, y + 10, house.width, house.height - 10)
          .fill(WORLD_PALETTE.wall)
          .stroke({ color: 0x5a3e44, width: 2 });
      view.addChild(body);
      view.addChild(
        new Graphics()
          .poly([x - 5, y + 12, x + house.width / 2, y - 10, x + house.width + 5, y + 12])
          .fill(WORLD_PALETTE.roof),
      );
    }
  }
}

export class RoadRenderer {
  render(roads: ReadonlyArray<Road>, view: Container): void {
    for (const road of roads) {
      const points = visiblePoints(road.points, view.x, view.y, 24);
      if (points.length > 1) {
        const color = road.type === 'stone-paved' ? WORLD_PALETTE.stone : WORLD_PALETTE[road.type];
        view.addChild(polyline(points, view.x, view.y, 0x332d2d, ROAD_WIDTHS[road.type] + 5, 0.55));
        view.addChild(polyline(points, view.x, view.y, color, ROAD_WIDTHS[road.type], 0.9));
      }
    }
  }
}

export class SettlementRenderer {
  renderGround(features: ReadonlyArray<SettlementFeature>, view: Container): void {
    for (const feature of features) if (feature.kind === 'ground') this.draw(feature, view);
  }
  renderStructures(features: ReadonlyArray<SettlementFeature>, view: Container): void {
    for (const kind of ['street', 'farm', 'fence', 'building', 'landmark', 'wall', 'gate'] as const)
      for (const feature of features) if (feature.kind === kind) this.draw(feature, view);
  }
  private draw(feature: SettlementFeature, view: Container): void {
    const x = feature.position ? feature.position.x - view.x : 0,
      y = feature.position ? feature.position.y - view.y : 0,
      graphic = new Graphics();
    if (feature.kind === 'ground' && feature.points)
      graphic
        .poly(feature.points.flatMap((point) => [point.x - view.x, point.y - view.y]))
        .fill({ color: WORLD_PALETTE.settlement, alpha: 0.18 });
    else if (feature.kind === 'street' && feature.points && feature.width) {
      view.addChild(polyline(feature.points, view.x, view.y, 0x332d2d, feature.width + 3, 0.45));
      view.addChild(
        polyline(
          feature.points,
          view.x,
          view.y,
          feature.roadType === 'stone-paved'
            ? WORLD_PALETTE.stone
            : feature.roadType === 'dirt'
              ? WORLD_PALETTE.dirt
              : WORLD_PALETTE.path,
          feature.width,
          0.82,
        ),
      );
      return;
    } else if (feature.kind === 'building' && feature.width && feature.height) {
      graphic
        .rect(x - feature.width / 2, y - feature.height / 2 + 5, feature.width, feature.height - 5)
        .fill(WORLD_PALETTE.wall)
        .stroke({ color: 0x5a3e44, width: 2 });
      graphic
        .poly([
          x - feature.width / 2 - 3,
          y - feature.height / 2 + 6,
          x,
          y - feature.height / 2 - 7,
          x + feature.width / 2 + 3,
          y - feature.height / 2 + 6,
        ])
        .fill(WORLD_PALETTE.roof);
    } else if (feature.kind === 'wall' && feature.points) {
      view.addChild(
        polyline(feature.points, view.x, view.y, WORLD_PALETTE.wallDark, feature.width ?? 7, 0.95),
      );
      view.addChild(polyline(feature.points, view.x, view.y, WORLD_PALETTE.wallLight, 2, 0.9));
      return;
    } else if (feature.kind === 'gate' && feature.width && feature.height) {
      graphic
        .rect(-feature.width / 2, -feature.height / 2, feature.width, feature.height)
        .fill(WORLD_PALETTE.gate)
        .stroke({ color: WORLD_PALETTE.wallLight, width: 2 });
      graphic.position.set(x, y);
      graphic.rotation = feature.rotation ?? 0;
    } else if (feature.kind === 'landmark')
      graphic
        .star(
          x,
          y,
          feature.style === 'keep' ? 6 : 4,
          Math.max(7, (feature.width ?? 20) / 2),
          Math.max(3, (feature.width ?? 20) / 4),
        )
        .fill(feature.style === 'keep' ? WORLD_PALETTE.capital : WORLD_PALETTE.settlementLight);
    else if (feature.kind === 'farm' && feature.width && feature.height)
      graphic
        .rect(x - feature.width / 2, y - feature.height / 2, feature.width, feature.height)
        .fill({ color: WORLD_PALETTE.grassDark, alpha: 0.55 })
        .stroke({ color: WORLD_PALETTE.dirt, width: 2 });
    else if (feature.kind === 'fence' && feature.points) {
      view.addChild(polyline(feature.points, view.x, view.y, WORLD_PALETTE.wallLight, 2, 0.8));
      return;
    }
    view.addChild(graphic);
  }
}

function visiblePoints(
  points: ReadonlyArray<{ x: number; y: number }>,
  ox: number,
  oy: number,
  padding: number,
): ReadonlyArray<{ x: number; y: number }> {
  return points.filter(
    (point) =>
      point.x >= ox - padding &&
      point.x <= ox + CHUNK_SIZE + padding &&
      point.y >= oy - padding &&
      point.y <= oy + CHUNK_SIZE + padding,
  );
}
function polyline(
  points: ReadonlyArray<{ x: number; y: number }>,
  ox: number,
  oy: number,
  color: number,
  width: number,
  alpha: number,
): Graphics {
  const line = new Graphics();
  line.moveTo(points[0].x - ox, points[0].y - oy);
  for (const point of points.slice(1)) line.lineTo(point.x - ox, point.y - oy);
  line.stroke({ color, alpha, width });
  return line;
}
