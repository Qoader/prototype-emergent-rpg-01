import { describe, expect, it } from 'vitest';
import { ChunkGenerator, WorldManager, biomeAt, chunkOrigin, isPointBlocked, tierForDistance, worldToChunk, worldToLocal } from './world';

describe('world coordinates', () => {
  it('maps negative positions into the correct chunk and local space', () => {
    expect(worldToChunk({ x: -1, y: -129 })).toEqual({ x: -1, y: -2 });
    expect(worldToLocal({ x: -1, y: -129 })).toEqual({ x: 127, y: 127 });
    expect(chunkOrigin({ x: -2, y: 3 })).toEqual({ x: -256, y: 384 });
  });
});

describe('procedural terrain and obstacles', () => {
  it('generates stable content for the same seed and coordinate', () => {
    const generator = new ChunkGenerator({ seed: 42 });
    expect(generator.generate({ x: -3, y: 8 })).toEqual(generator.generate({ x: -3, y: 8 }));
  });

  it('replaces random houses with deterministic settlement and road features', () => {
    const chunk = new ChunkGenerator({ seed: 42 }).generate({ x: 2, y: 2 });
    expect(chunk.houses).toEqual([]);
    expect(chunk.settlements).toBeDefined();
    expect(chunk.roads).toBeDefined();
  });

  it('changes generated content when the world seed changes', () => {
    const coordinate = { x: 4, y: -2 };
    const first = new ChunkGenerator({ seed: 1 }).generate(coordinate);
    const second = new ChunkGenerator({ seed: 2 }).generate(coordinate);
    expect({ biome: first.biome, trees: first.trees, houses: first.houses, rivers: first.rivers })
      .not.toEqual({ biome: second.biome, trees: second.trees, houses: second.houses, rivers: second.rivers });
  });

  it('keeps generated trees and houses inside their chunk bounds', () => {
    const chunk = new ChunkGenerator({ seed: 42 }).generate({ x: 0, y: 0 });
    for (const tree of chunk.trees) {
      expect(tree.x - tree.radius).toBeGreaterThanOrEqual(0);
      expect(tree.y - tree.radius).toBeGreaterThanOrEqual(0);
      expect(tree.x + tree.radius).toBeLessThanOrEqual(128);
      expect(tree.y + tree.radius).toBeLessThanOrEqual(128);
    }
    for (const house of chunk.houses) {
      expect(house.x).toBeGreaterThanOrEqual(0);
      expect(house.y).toBeGreaterThanOrEqual(0);
      expect(house.x + house.width).toBeLessThanOrEqual(128);
      expect(house.y + house.height).toBeLessThanOrEqual(128);
    }
  });

  it('classifies high, low, and intermediate world regions into biomes', () => {
    const samples = [-2000, -1000, 0, 1000, 2000].flatMap((x) => [-2000, -1000, 0, 1000, 2000].map((y) => biomeAt({ x, y }, 42)));
    expect(samples).toContain('ocean');
    expect(samples).toContain('mountains');
    expect(samples).toContain('plains');
  });

  it('marks generated trees and houses as blocked', () => {
    const chunk = new ChunkGenerator({ seed: 42 }).generate({ x: 0, y: 0 });
    if (chunk.trees[0]) expect(isPointBlocked(chunk.trees[0], chunk, { seed: 42, chunkSize: 128, tier1Radius: 1, tier2Radius: 4, retentionRadius: 5 })).toBe(true);
    if (chunk.houses[0]) expect(isPointBlocked({ x: chunk.houses[0].x + 2, y: chunk.houses[0].y + 2 }, chunk, { seed: 42, chunkSize: 128, tier1Radius: 1, tier2Radius: 4, retentionRadius: 5 })).toBe(true);
  });

  it('marks ocean cells as blocked', () => {
    const generator = new ChunkGenerator({ seed: 42 });
    let oceanChunk;
    for (let y = -20; y <= 20 && !oceanChunk; y += 1) for (let x = -20; x <= 20; x += 1) {
      const candidate = generator.generate({ x, y });
      if (candidate.biome === 'ocean') oceanChunk = candidate;
    }
    expect(oceanChunk).toBeDefined();
    const point = { x: oceanChunk!.coord.x * 128 + 64, y: oceanChunk!.coord.y * 128 + 64 };
    expect(isPointBlocked(point, oceanChunk!, { seed: 42, chunkSize: 128, tier1Radius: 1, tier2Radius: 4, retentionRadius: 5 })).toBe(true);
  });

  it('marks a river centerline as blocked in every chunk it crosses', () => {
    const generator = new ChunkGenerator({ seed: 42 });
    let riverChunk;
    for (let y = -20; y <= 20 && !riverChunk; y += 1) for (let x = -20; x <= 20; x += 1) {
      const candidate = generator.generate({ x, y });
      if (candidate.rivers.length > 0) riverChunk = candidate;
    }
    expect(riverChunk).toBeDefined();
    const riverPoint = riverChunk!.rivers[0].points[Math.floor(riverChunk!.rivers[0].points.length / 2)];
    const owningChunk = generator.generate(worldToChunk(riverPoint));
    expect(isPointBlocked(riverPoint, owningChunk, { seed: 42, chunkSize: 128, tier1Radius: 1, tier2Radius: 4, retentionRadius: 5 })).toBe(true);
  });

  it('creates deterministic river paths from mountain sources toward low terrain', () => {
    const generator = new ChunkGenerator({ seed: 42 });
    const chunks = [];
    for (let y = -12; y <= 12; y += 1) for (let x = -12; x <= 12; x += 1) chunks.push(generator.generate({ x, y }));
    const rivers = chunks.flatMap((chunk) => chunk.rivers);
    expect(rivers.length).toBeGreaterThan(0);
    const river = rivers[0];
    expect(biomeAt(river.points[0], 42)).toBe('mountains');
    expect(biomeAt(river.points.at(-1)!, 42)).toBe('ocean');
    expect(river.points.length).toBeGreaterThan(2);
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
    expect(world.getChunkAt({ x: 129, y: 0 })?.key).toBe('1,0');
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
    world.tick(30, 30.3);
    expect(macro.lastSimulatedAt).toBe(30.3);
    expect(frozen.lastSimulatedAt).toBe(0);
  });
});
