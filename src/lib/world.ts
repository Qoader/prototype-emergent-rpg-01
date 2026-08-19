export const CHUNK_SIZE = 128;

export type ChunkTier = 0 | 1 | 2 | 3;
export type ChunkCoord = { x: number; y: number };
export type WorldPoint = { x: number; y: number };

export type CrystalState = { id: string; x: number; y: number; active: boolean; phase: number };
export type Landmark = { kind: 'shrine' | 'ruin'; x: number; y: number };
export type TerrainKind = 'meadow' | 'marsh' | 'heath';

export type WorldChunk = {
  key: string;
  coord: ChunkCoord;
  tier: ChunkTier;
  terrain: TerrainKind;
  crystals: CrystalState[];
  landmarks: Landmark[];
  lastSimulatedAt: number;
};

export type WorldConfig = {
  seed: number;
  chunkSize: number;
  tier1Radius: number;
  tier2Radius: number;
  retentionRadius: number;
};

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  seed: 0x5eeda11,
  chunkSize: CHUNK_SIZE,
  tier1Radius: 1,
  tier2Radius: 4,
  retentionRadius: 5,
};

export function chunkKey(coord: ChunkCoord): string { return `${coord.x},${coord.y}`; }

export function worldToChunk(point: WorldPoint, chunkSize = CHUNK_SIZE): ChunkCoord {
  return { x: Math.floor(point.x / chunkSize), y: Math.floor(point.y / chunkSize) };
}

export function worldToLocal(point: WorldPoint, chunkSize = CHUNK_SIZE): WorldPoint {
  const chunk = worldToChunk(point, chunkSize);
  return { x: point.x - chunk.x * chunkSize, y: point.y - chunk.y * chunkSize };
}

export function chunkOrigin(coord: ChunkCoord, chunkSize = CHUNK_SIZE): WorldPoint {
  return { x: coord.x * chunkSize, y: coord.y * chunkSize };
}

export function tierForDistance(distance: number, config = DEFAULT_WORLD_CONFIG): ChunkTier {
  if (distance === 0) return 0;
  if (distance <= config.tier1Radius) return 1;
  if (distance <= config.tier2Radius) return 2;
  return 3;
}

function hash(seed: number, x: number, y: number, salt: number): number {
  let value = (seed ^ Math.imul(x, 0x45d9f3b) ^ Math.imul(y, 0x119de1f3) ^ salt) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x27d4eb2d);
  return ((value ^ (value >>> 15)) >>> 0) / 0x100000000;
}

export class ChunkGenerator {
  private readonly config: WorldConfig;

  constructor(config: Partial<WorldConfig> = {}) {
    this.config = { ...DEFAULT_WORLD_CONFIG, ...config };
  }

  generate(coord: ChunkCoord): WorldChunk {
    const key = chunkKey(coord);
    const terrainRoll = hash(this.config.seed, coord.x, coord.y, 7);
    const terrain: TerrainKind = terrainRoll < 0.2 ? 'marsh' : terrainRoll > 0.8 ? 'heath' : 'meadow';
    const crystals: CrystalState[] = [];
    const count = 2 + Math.floor(hash(this.config.seed, coord.x, coord.y, 11) * 4);
    for (let index = 0; index < count; index += 1) {
      crystals.push({
        id: `${key}:crystal:${index}`,
        x: 18 + hash(this.config.seed, coord.x, coord.y, 100 + index) * (this.config.chunkSize - 36),
        y: 18 + hash(this.config.seed, coord.x, coord.y, 200 + index) * (this.config.chunkSize - 36),
        active: true,
        phase: hash(this.config.seed, coord.x, coord.y, 300 + index) * Math.PI * 2,
      });
    }
    const landmarks: Landmark[] = [];
    if (hash(this.config.seed, coord.x, coord.y, 401) > 0.72) {
      landmarks.push({ kind: hash(this.config.seed, coord.x, coord.y, 402) > 0.5 ? 'shrine' : 'ruin', x: this.config.chunkSize / 2, y: this.config.chunkSize / 2 });
    }
    return { key, coord, tier: 3, terrain, crystals, landmarks, lastSimulatedAt: 0 };
  }
}

export class WorldManager {
  readonly config: WorldConfig;
  private readonly generator: ChunkGenerator;
  private readonly chunks = new Map<string, WorldChunk>();
  private readonly mutations = new Map<string, Set<string>>();
  private center: ChunkCoord = { x: 0, y: 0 };

  constructor(config: Partial<WorldConfig> = {}) {
    this.config = { ...DEFAULT_WORLD_CONFIG, ...config };
    this.generator = new ChunkGenerator(this.config);
  }

  get loadedChunks(): ReadonlyArray<WorldChunk> { return [...this.chunks.values()]; }
  get currentChunk(): ChunkCoord { return { ...this.center }; }

  syncAround(player: WorldPoint, now = 0): WorldChunk[] {
    this.center = worldToChunk(player, this.config.chunkSize);
    const next = new Set<string>();
    for (let y = -this.config.tier2Radius; y <= this.config.tier2Radius; y += 1) {
      for (let x = -this.config.tier2Radius; x <= this.config.tier2Radius; x += 1) {
        const coord = { x: this.center.x + x, y: this.center.y + y };
        const key = chunkKey(coord);
        next.add(key);
        if (!this.chunks.has(key)) this.chunks.set(key, this.restore(this.generator.generate(coord)));
      }
    }
    for (const [key, chunk] of this.chunks) {
      const distance = Math.max(Math.abs(chunk.coord.x - this.center.x), Math.abs(chunk.coord.y - this.center.y));
      chunk.tier = next.has(key) ? tierForDistance(distance, this.config) : 3;
      if (distance > this.config.retentionRadius) this.chunks.delete(key);
    }
    return [...this.loadedChunks];
  }

  tick(deltaSeconds: number, now: number): void {
    for (const chunk of this.chunks.values()) {
      if (chunk.tier === 0) chunk.lastSimulatedAt = now;
      else if (chunk.tier === 1 && now - chunk.lastSimulatedAt >= 0.25) chunk.lastSimulatedAt = now;
      else if (chunk.tier === 2 && now - chunk.lastSimulatedAt >= 30) chunk.lastSimulatedAt = now;
      void deltaSeconds;
    }
  }

  collectCrystal(id: string): boolean {
    for (const chunk of this.chunks.values()) {
      const crystal = chunk.crystals.find((candidate) => candidate.id === id);
      if (!crystal || !crystal.active) continue;
      crystal.active = false;
      let changed = this.mutations.get(chunk.key);
      if (!changed) { changed = new Set(); this.mutations.set(chunk.key, changed); }
      changed.add(id);
      return true;
    }
    return false;
  }

  private restore(chunk: WorldChunk): WorldChunk {
    const changed = this.mutations.get(chunk.key);
    if (changed) for (const crystal of chunk.crystals) crystal.active = !changed.has(crystal.id);
    return chunk;
  }
}
