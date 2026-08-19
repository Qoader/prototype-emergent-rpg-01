import { describe, expect, it } from 'vitest';
import { ChunkGenerator, WorldManager, chunkOrigin, tierForDistance, worldToChunk, worldToLocal } from './world';

describe('world coordinates', () => {
  it('maps negative positions into the correct chunk and local space', () => {
    expect(worldToChunk({ x: -1, y: -129 })).toEqual({ x: -1, y: -2 });
    expect(worldToLocal({ x: -1, y: -129 })).toEqual({ x: 127, y: 127 });
    expect(chunkOrigin({ x: -2, y: 3 })).toEqual({ x: -256, y: 384 });
  });
});

describe('procedural chunks', () => {
  it('generates stable content for the same seed and coordinate', () => {
    const generator = new ChunkGenerator({ seed: 42, chunkSize: 128, tier1Radius: 1, tier2Radius: 4, retentionRadius: 5 });
    expect(generator.generate({ x: -3, y: 8 })).toEqual(generator.generate({ x: -3, y: 8 }));
  });

  it('changes generated content when the world seed changes', () => {
    const coordinate = { x: 4, y: -2 };
    const first = new ChunkGenerator({ seed: 1 }).generate(coordinate);
    const second = new ChunkGenerator({ seed: 2 }).generate(coordinate);
    expect({ terrain: first.terrain, crystals: first.crystals, landmarks: first.landmarks })
      .not.toEqual({ terrain: second.terrain, crystals: second.crystals, landmarks: second.landmarks });
  });

  it('keeps generated feature positions inside the chunk', () => {
    const chunk = new ChunkGenerator({ seed: 42 }).generate({ x: 0, y: 0 });
    expect(chunk.crystals.length).toBeGreaterThanOrEqual(2);
    expect(chunk.crystals.length).toBeLessThanOrEqual(5);
    for (const crystal of chunk.crystals) {
      expect(crystal.x).toBeGreaterThan(0);
      expect(crystal.x).toBeLessThan(128);
      expect(crystal.y).toBeGreaterThan(0);
      expect(crystal.y).toBeLessThan(128);
    }
  });

  it('assigns centered simulation rings', () => {
    expect([tierForDistance(0), tierForDistance(1), tierForDistance(2), tierForDistance(5)]).toEqual([0, 1, 2, 3]);
  });
});

describe('world streaming', () => {
  it('loads the player-centered window and updates it after crossing a chunk', () => {
    const world = new WorldManager({ seed: 42 });
    world.syncAround({ x: 0, y: 0 });
    expect(world.loadedChunks).toHaveLength(81);
    expect(world.loadedChunks.find((chunk) => chunk.key === '0,0')?.tier).toBe(0);
    expect(world.loadedChunks.find((chunk) => chunk.key === '1,1')?.tier).toBe(1);

    world.syncAround({ x: 129, y: 0 });
    expect(world.currentChunk).toEqual({ x: 1, y: 0 });
    expect(world.loadedChunks.find((chunk) => chunk.key === '1,0')?.tier).toBe(0);
    expect(world.loadedChunks.find((chunk) => chunk.key === '-5,0')).toBeUndefined();
  });

  it('retains collected crystal mutations when a chunk is reloaded', () => {
    const world = new WorldManager({ seed: 7 });
    world.syncAround({ x: 0, y: 0 });
    const chunk = world.loadedChunks.find((candidate) => candidate.key === '0,0')!;
    const crystal = chunk.crystals[0];
    expect(world.collectCrystal(crystal.id)).toBe(true);
    world.syncAround({ x: 800, y: 0 });
    world.syncAround({ x: 0, y: 0 });
    expect(world.loadedChunks.find((candidate) => candidate.key === '0,0')?.crystals.find((item) => item.id === crystal.id)?.active).toBe(false);
  });

  it('rejects unknown and already-collected crystals', () => {
    const world = new WorldManager({ seed: 7 });
    world.syncAround({ x: 0, y: 0 });
    const crystal = world.loadedChunks.find((chunk) => chunk.key === '0,0')!.crystals[0];

    expect(world.collectCrystal('missing-crystal')).toBe(false);
    expect(world.collectCrystal(crystal.id)).toBe(true);
    expect(world.collectCrystal(crystal.id)).toBe(false);
  });

  it('updates each simulation ring on its configured cadence and freezes Tier 3', () => {
    const world = new WorldManager({ seed: 42 });
    world.syncAround({ x: 0, y: 0 });
    world.syncAround({ x: 128, y: 0 });

    const full = world.loadedChunks.find((chunk) => chunk.key === '1,0')!;
    const coarse = world.loadedChunks.find((chunk) => chunk.key === '0,0')!;
    const macro = world.loadedChunks.find((chunk) => chunk.key === '-3,0')!;
    const frozen = world.loadedChunks.find((chunk) => chunk.key === '-4,0')!;
    expect([full.tier, coarse.tier, macro.tier, frozen.tier]).toEqual([0, 1, 2, 3]);

    world.tick(0.1, 0.1);
    expect(full.lastSimulatedAt).toBe(0.1);
    expect(coarse.lastSimulatedAt).toBe(0);
    expect(macro.lastSimulatedAt).toBe(0);
    expect(frozen.lastSimulatedAt).toBe(0);

    world.tick(0.2, 0.3);
    expect(coarse.lastSimulatedAt).toBe(0.3);
    expect(macro.lastSimulatedAt).toBe(0);
    expect(frozen.lastSimulatedAt).toBe(0);

    world.tick(30, 30.3);
    expect(macro.lastSimulatedAt).toBe(30.3);
    expect(frozen.lastSimulatedAt).toBe(0);
  });
});
