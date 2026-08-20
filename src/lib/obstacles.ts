import type { WorldPoint } from './coordinates';
import { biomeAt } from './terrain';
import { mergeWorldConfig, type WorldConfig } from './world-config';
import { distanceToSegment, pointInRect } from './world-geometry';
import type { CollisionService, CollisionSource } from './collision-types';

export { DEFAULT_OBSTACLE_CONFIG } from './obstacle-config';

export type TreeObstacle = { id: string; x: number; y: number; radius: number };
export type HouseObstacle = { id: string; x: number; y: number; width: number; height: number };
export type { ObstacleConfig } from './obstacle-config';

export class WorldCollisionService implements CollisionService {
  private readonly configCache = new WeakMap<object, WorldConfig>();

  private mergedConfig(config: Partial<WorldConfig> & Pick<WorldConfig, 'seed'>): WorldConfig {
    let merged = this.configCache.get(config);
    if (!merged) {
      merged = mergeWorldConfig(config);
      this.configCache.set(config, merged);
    }
    return merged;
  }

  isBlocked(
    point: WorldPoint,
    chunk: CollisionSource,
    config: Partial<WorldConfig> & Pick<WorldConfig, 'seed'>,
  ): boolean {
    const worldConfig = this.mergedConfig(config);
    if (biomeAt(point, worldConfig.seed, worldConfig.terrain) === 'ocean') return true;
    for (const tree of chunk.trees)
      if (Math.hypot(point.x - tree.x, point.y - tree.y) <= tree.radius) return true;
    for (const house of chunk.houses) if (pointInRect(point, house)) return true;
    for (const feature of chunk.layout ?? [])
      if (feature.blocked) {
        if ((feature.kind === 'wall' || feature.kind === 'fence') && feature.points) {
          for (let index = 1; index < feature.points.length; index += 1)
            if (
              distanceToSegment(point, feature.points[index - 1], feature.points[index]) <=
              (feature.width ?? 4) / 2
            )
              return true;
        } else if (
          pointInRect(point, {
            x: feature.bounds.minX,
            y: feature.bounds.minY,
            width: feature.bounds.maxX - feature.bounds.minX,
            height: feature.bounds.maxY - feature.bounds.minY,
          })
        )
          return true;
      }
    for (const river of chunk.rivers)
      for (let index = 1; index < river.points.length; index += 1)
        if (
          distanceToSegment(point, river.points[index - 1], river.points[index]) <=
          worldConfig.rivers.collisionWidth
        )
          return true;
    return false;
  }
}

const defaultCollisionService = new WorldCollisionService();
export function isPointBlocked(
  point: WorldPoint,
  chunk: CollisionSource,
  config: Partial<WorldConfig> & Pick<WorldConfig, 'seed'>,
): boolean {
  return defaultCollisionService.isBlocked(point, chunk, config);
}
