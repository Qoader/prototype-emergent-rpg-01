import type { WorldChunk } from './chunk-generator';
import type { WorldPoint } from './coordinates';
import { biomeAt } from './terrain';
import { mergeWorldConfig, type WorldConfig } from './world-config';

export type TreeObstacle = { id: string; x: number; y: number; radius: number };
export type HouseObstacle = { id: string; x: number; y: number; width: number; height: number };
export type ObstacleConfig = { treeMargin: number; forestTreeCount: number; plainsTreeBase: number; plainsTreeVariance: number; forestTreeRadius: number; plainsTreeRadius: number; houseChance: number; houseX: number; houseY: number; houseWidth: number; houseHeight: number; riverCollisionWidth: number };
export const DEFAULT_OBSTACLE_CONFIG: ObstacleConfig = { treeMargin: 16, forestTreeCount: 7, plainsTreeBase: 2, plainsTreeVariance: 3, forestTreeRadius: 13, plainsTreeRadius: 11, houseChance: 0.65, houseX: 38, houseY: 42, houseWidth: 52, houseHeight: 38, riverCollisionWidth: 12 };

function distanceToSegment(point: WorldPoint, start: WorldPoint, end: WorldPoint): number {
  const dx = end.x - start.x, dy = end.y - start.y, lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function isPointBlocked(point: WorldPoint, chunk: WorldChunk, config: Partial<WorldConfig> & Pick<WorldConfig, 'seed'>): boolean {
  const worldConfig = mergeWorldConfig(config);
  if (biomeAt(point, worldConfig.seed, worldConfig.terrain) === 'ocean') return true;
  for (const tree of chunk.trees) if (Math.hypot(point.x - tree.x, point.y - tree.y) <= tree.radius) return true;
  for (const house of chunk.houses) if (point.x >= house.x && point.x <= house.x + house.width && point.y >= house.y && point.y <= house.y + house.height) return true;
  for (const river of chunk.rivers) for (let index = 1; index < river.points.length; index += 1) if (distanceToSegment(point, river.points[index - 1], river.points[index]) <= worldConfig.rivers.collisionWidth) return true;
  return false;
}
