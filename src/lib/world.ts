export const CHUNK_SIZE = 128;
export const NAV_CELL_SIZE = 16;

export type ChunkTier = 0 | 1 | 2 | 3;
export type ChunkCoord = { x: number; y: number };
export type WorldPoint = { x: number; y: number };
export type Biome = 'ocean' | 'coast' | 'plains' | 'forest' | 'mountains';

export type TreeObstacle = { id: string; x: number; y: number; radius: number };
export type HouseObstacle = { id: string; x: number; y: number; width: number; height: number };
export type RiverSegment = { id: string; points: WorldPoint[] };

export type WorldChunk = {
  key: string;
  coord: ChunkCoord;
  tier: ChunkTier;
  biome: Biome;
  trees: TreeObstacle[];
  houses: HouseObstacle[];
  rivers: RiverSegment[];
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

function heightAt(point: WorldPoint, seed: number): number {
  const broad = Math.sin((point.x + seed * 0.17) / 720) * 0.22 + Math.cos((point.y - seed * 0.11) / 910) * 0.2;
  const detail = Math.sin((point.x + point.y) / 190 + seed) * 0.06 + Math.cos((point.x - point.y) / 260) * 0.05;
  return 0.52 + broad + detail;
}

export function biomeAt(point: WorldPoint, seed = DEFAULT_WORLD_CONFIG.seed): Biome {
  const height = heightAt(point, seed);
  if (height < 0.22) return 'ocean';
  if (height < 0.3) return 'coast';
  if (height > 0.78) return 'mountains';
  if (height > 0.54) return 'forest';
  return 'plains';
}

function distanceToSegment(point: WorldPoint, start: WorldPoint, end: WorldPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function riverPath(seed: number, source: WorldPoint, id: string): WorldPoint[] {
  let target = source;
  let lowest = Infinity;
  for (let angleIndex = 0; angleIndex < 16; angleIndex += 1) {
    const angle = angleIndex * Math.PI / 8;
    for (let distance = 256; distance <= 4096; distance += 128) {
      const candidate = { x: source.x + Math.cos(angle) * distance, y: source.y + Math.sin(angle) * distance };
      const height = heightAt(candidate, seed);
      if (height < lowest) { lowest = height; target = candidate; }
      if (height < 0.22) break;
    }
  }
  const points: WorldPoint[] = [];
  const length = Math.max(8, Math.ceil(Math.hypot(target.x - source.x, target.y - source.y) / 64));
  for (let index = 0; index <= length; index += 1) {
    const t = index / length;
    const baseX = source.x + (target.x - source.x) * t;
    const baseY = source.y + (target.y - source.y) * t;
    const bend = Math.sin(t * Math.PI * 3 + seed * 0.03) * 24 * Math.sin(t * Math.PI);
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const lengthValue = Math.max(1, Math.hypot(dx, dy));
    points.push({ x: baseX - dy / lengthValue * bend, y: baseY + dx / lengthValue * bend });
  }
  points[0] = source;
  points[points.length - 1] = target;
  void id;
  return points;
}

function riversForChunk(coord: ChunkCoord, config: WorldConfig): RiverSegment[] {
  const origin = chunkOrigin(coord, config.chunkSize);
  const rivers: RiverSegment[] = [];
  const macroX = Math.floor(coord.x / 8);
  const macroY = Math.floor(coord.y / 8);
  for (let y = macroY - 1; y <= macroY + 1; y += 1) {
    for (let x = macroX - 1; x <= macroX + 1; x += 1) {
      if (hash(config.seed, x, y, 8100) < 0.35) continue;
      const source = {
        x: x * config.chunkSize * 8 + 120 + hash(config.seed, x, y, 8101) * config.chunkSize * 6,
        y: y * config.chunkSize * 8 + 120 + hash(config.seed, x, y, 8102) * config.chunkSize * 6,
      };
      if (biomeAt(source, config.seed) !== 'mountains') continue;
      const id = `river:${x},${y}`;
      const path = riverPath(config.seed, source, id);
      const relevant = path.some((point) => point.x >= origin.x - 24 && point.x <= origin.x + config.chunkSize + 24 && point.y >= origin.y - 24 && point.y <= origin.y + config.chunkSize + 24);
      if (relevant) rivers.push({ id, points: path });
    }
  }
  return rivers;
}

export function isPointBlocked(point: WorldPoint, chunk: WorldChunk, config: WorldConfig): boolean {
  if (biomeAt(point, config.seed) === 'ocean') return true;
  for (const tree of chunk.trees) if (Math.hypot(point.x - tree.x, point.y - tree.y) <= tree.radius) return true;
  for (const house of chunk.houses) if (point.x >= house.x && point.x <= house.x + house.width && point.y >= house.y && point.y <= house.y + house.height) return true;
  for (const river of chunk.rivers) for (let index = 1; index < river.points.length; index += 1) if (distanceToSegment(point, river.points[index - 1], river.points[index]) <= 12) return true;
  return false;
}

export class ChunkGenerator {
  private readonly config: WorldConfig;

  constructor(config: Partial<WorldConfig> = {}) { this.config = { ...DEFAULT_WORLD_CONFIG, ...config }; }

  generate(coord: ChunkCoord): WorldChunk {
    const key = chunkKey(coord);
    const origin = chunkOrigin(coord, this.config.chunkSize);
    const center = { x: origin.x + this.config.chunkSize / 2, y: origin.y + this.config.chunkSize / 2 };
    const biome = biomeAt(center, this.config.seed);
    const trees: TreeObstacle[] = [];
    if (biome === 'forest' || biome === 'plains') {
      const count = biome === 'forest' ? 7 : 2 + Math.floor(hash(this.config.seed, coord.x, coord.y, 101) * 3);
      const margin = 16;
      for (let index = 0; index < count; index += 1) trees.push({ id: `${key}:tree:${index}`, x: origin.x + margin + hash(this.config.seed, coord.x, coord.y, 200 + index) * (this.config.chunkSize - margin * 2), y: origin.y + margin + hash(this.config.seed, coord.x, coord.y, 300 + index) * (this.config.chunkSize - margin * 2), radius: biome === 'forest' ? 13 : 11 });
    }
    const houses: HouseObstacle[] = [];
    if (biome === 'plains' && hash(this.config.seed, coord.x, coord.y, 401) > 0.65) {
      houses.push({ id: `${key}:house:0`, x: origin.x + 38, y: origin.y + 42, width: 52, height: 38 });
    }
    return { key, coord, tier: 3, biome, trees, houses, rivers: riversForChunk(coord, this.config), lastSimulatedAt: 0 };
  }
}

export class WorldManager {
  readonly config: WorldConfig;
  private readonly generator: ChunkGenerator;
  private readonly chunks = new Map<string, WorldChunk>();
  private center: ChunkCoord = { x: 0, y: 0 };

  constructor(config: Partial<WorldConfig> = {}) { this.config = { ...DEFAULT_WORLD_CONFIG, ...config }; this.generator = new ChunkGenerator(this.config); }
  get loadedChunks(): ReadonlyArray<WorldChunk> { return [...this.chunks.values()]; }
  get currentChunk(): ChunkCoord { return { ...this.center }; }

  syncAround(player: WorldPoint): WorldChunk[] {
    this.center = worldToChunk(player, this.config.chunkSize);
    const next = new Set<string>();
    for (let y = -this.config.tier2Radius; y <= this.config.tier2Radius; y += 1) for (let x = -this.config.tier2Radius; x <= this.config.tier2Radius; x += 1) {
      const coord = { x: this.center.x + x, y: this.center.y + y };
      const key = chunkKey(coord);
      next.add(key);
      if (!this.chunks.has(key)) this.chunks.set(key, this.generator.generate(coord));
    }
    for (const [key, chunk] of this.chunks) {
      const distance = Math.max(Math.abs(chunk.coord.x - this.center.x), Math.abs(chunk.coord.y - this.center.y));
      chunk.tier = next.has(key) ? tierForDistance(distance, this.config) : 3;
      if (distance > this.config.retentionRadius) this.chunks.delete(key);
    }
    return [...this.loadedChunks];
  }

  getChunkAt(point: WorldPoint): WorldChunk | undefined { return this.chunks.get(chunkKey(worldToChunk(point, this.config.chunkSize))); }
  isWalkable(point: WorldPoint): boolean { const chunk = this.getChunkAt(point); return !!chunk && !isPointBlocked(point, chunk, this.config); }

  tick(_deltaSeconds: number, now: number): void {
    for (const chunk of this.chunks.values()) {
      if (chunk.tier === 0) chunk.lastSimulatedAt = now;
      else if (chunk.tier === 1 && now - chunk.lastSimulatedAt >= 0.25) chunk.lastSimulatedAt = now;
      else if (chunk.tier === 2 && now - chunk.lastSimulatedAt >= 30) chunk.lastSimulatedAt = now;
    }
  }
}
