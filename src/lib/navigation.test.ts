import { describe, expect, it } from 'vitest';
import { findPath } from './navigation';
import { CHUNK_SIZE, type WorldPoint, type WorldChunk, type WorldManager } from './world';

function navigationWorld(blocked: (point: WorldPoint) => boolean) {
  const chunks: WorldChunk[] = [];
  for (let y = -1; y <= 1; y += 1)
    for (let x = -1; x <= 1; x += 1) {
      chunks.push({
        key: `${x},${y}`,
        coord: { x, y },
        tier: 0,
        biome: 'plains',
        trees: [],
        houses: [],
        rivers: [],
        lastSimulatedAt: 0,
      });
    }
  return {
    config: { seed: 1, chunkSize: CHUNK_SIZE, tier1Radius: 1, tier2Radius: 4, retentionRadius: 5 },
    loadedChunks: chunks,
    isWalkable: (point: WorldPoint) => !blocked(point),
  } as unknown as WorldManager;
}

describe('navigation', () => {
  it('routes around a blocked wall without diagonal corner cutting', () => {
    const world = navigationWorld((point) => point.x >= 32 && point.x < 48 && point.y < 80);
    const path = findPath({ x: 16, y: 48 }, { x: 80, y: 48 }, world);

    expect(path.length).toBeGreaterThan(5);
    expect(path.at(-1)).toEqual({ x: 88, y: 56 });
    expect(path.every((point) => !world.isWalkable || world.isWalkable(point))).toBe(true);
    expect(path.some((point) => point.y >= 80)).toBe(true);
  });

  it('uses the nearest reachable cell when the requested target is blocked', () => {
    const world = navigationWorld((point) => point.x >= 32 && point.x < 48 && point.y < 80);
    const requested = { x: 40, y: 40 };
    const path = findPath({ x: 16, y: 40 }, requested, world);

    expect(path.length).toBeGreaterThan(0);
    expect(path.at(-1)).not.toEqual(requested);
    expect(world.isWalkable(path.at(-1)!)).toBe(true);
  });

  it('returns the current position when the loaded navigation area has no route', () => {
    const start = { x: 16, y: 40 };
    const world = navigationWorld(() => true);

    expect(findPath(start, { x: 80, y: 40 }, world)).toEqual([start]);
  });

  it('searches an enclosed target once instead of repeating the full map search', () => {
    let walkabilityChecks = 0;
    const center = { x: 160, y: 160 };
    const world = navigationWorld((point) => {
      walkabilityChecks += 1;
      const distanceFromCenter = Math.max(
        Math.abs(point.x - center.x),
        Math.abs(point.y - center.y),
      );
      return distanceFromCenter >= 200 && distanceFromCenter <= 220;
    });

    expect(findPath({ x: -100, y: 160 }, center, world)).toEqual([{ x: -100, y: 160 }]);
    expect(walkabilityChecks).toBeLessThan(20_000);
  });

  it('returns the current position when no chunks are loaded', () => {
    const start = { x: -12, y: 24 };
    const world = { loadedChunks: [] } as unknown as WorldManager;

    expect(findPath(start, { x: 80, y: 40 }, world)).toEqual([start]);
  });
});
