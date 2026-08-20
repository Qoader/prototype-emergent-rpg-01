import { describe, expect, it } from 'vitest';
import { GameEngine } from './game-engine';
import { AStarNavigator } from './navigation';
import type { WorldChunk } from './chunk-generator';
import type { WorldService } from './world-manager';

function fakeWorld(): WorldService {
  const chunk = {
    key: '0,0',
    coord: { x: 0, y: 0 },
    tier: 0,
    biome: 'plains',
    trees: [],
    houses: [],
    rivers: [],
    lastSimulatedAt: 0,
  } as WorldChunk;
  return {
    syncAround: () => [chunk],
    getChunkAt: () => chunk,
    getLoadedChunks: () => [chunk],
    isWalkable: () => true,
    tick: () => {},
  };
}

describe('GameEngine', () => {
  it('does not resync the world on every movement tick within one chunk', () => {
    let syncs = 0;
    const world = fakeWorld();
    const trackedWorld: WorldService = {
      ...world,
      syncAround: (point) => {
        syncs += 1;
        return world.syncAround(point);
      },
    };
    const engine = new GameEngine(trackedWorld, new AStarNavigator());
    for (let index = 0; index < 10; index += 1) engine.tick(1 / 60);
    expect(syncs).toBe(1);
  });

  it('moves headlessly and keeps its renderer-independent snapshot', () => {
    const engine = new GameEngine(
      fakeWorld(),
      new AStarNavigator(),
      { movementSpeed: 16 },
      { now: () => 1000 },
    );
    engine.setDestination({ x: 40, y: 8 });
    engine.tick(1);
    expect(engine.getSnapshot().player.x).toBeGreaterThan(0);
    expect(engine.getSnapshot().player.x).toBeLessThan(40);
    expect(engine.getSnapshot().destination).toEqual({ x: 40, y: 8 });
  });
});
