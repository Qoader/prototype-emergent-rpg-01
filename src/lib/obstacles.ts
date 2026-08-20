import type { WorldChunk } from './chunk-generator';
import type { WorldPoint } from './coordinates';
import { biomeAt } from './terrain';
import { mergeWorldConfig, type WorldConfig } from './world-config';
import type { ObstacleConfig } from './obstacle-config';
import { distanceToSegment, pointInRect } from './world-geometry';

export { DEFAULT_OBSTACLE_CONFIG } from './obstacle-config';

export type TreeObstacle = { id: string; x: number; y: number; radius: number };
export type HouseObstacle = { id: string; x: number; y: number; width: number; height: number };
export type { ObstacleConfig } from './obstacle-config';

export function isPointBlocked(point: WorldPoint, chunk: WorldChunk, config: Partial<WorldConfig> & Pick<WorldConfig, 'seed'>): boolean {
  const worldConfig = mergeWorldConfig(config);
  if (biomeAt(point, worldConfig.seed, worldConfig.terrain) === 'ocean') return true;
  for (const tree of chunk.trees) if (Math.hypot(point.x - tree.x, point.y - tree.y) <= tree.radius) return true;
  for (const house of chunk.houses) if (pointInRect(point, house)) return true;
  for (const river of chunk.rivers) for (let index = 1; index < river.points.length; index += 1) if (distanceToSegment(point, river.points[index - 1], river.points[index]) <= worldConfig.rivers.collisionWidth) return true;
  return false;
}
