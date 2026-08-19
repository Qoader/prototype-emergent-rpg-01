import { chunkOrigin, type ChunkCoord, type WorldPoint } from './coordinates';
import { seededHash, heightAt } from './random';
import { biomeAt, type TerrainConfig } from './terrain';

export type RiverSegment = { id: string; points: WorldPoint[] };
export type RiverConfig = { macroChunkSpan: number; sourceSkipChance: number; searchRays: number; searchStep: number; maxSearchDistance: number; pointSpacing: number; bendAmplitude: number; intersectionMargin: number; collisionWidth: number };
export const DEFAULT_RIVER_CONFIG: RiverConfig = { macroChunkSpan: 8, sourceSkipChance: 0.35, searchRays: 16, searchStep: 128, maxSearchDistance: 4096, pointSpacing: 64, bendAmplitude: 24, intersectionMargin: 24, collisionWidth: 12 };

function riverPath(seed: number, source: WorldPoint, config: RiverConfig): WorldPoint[] {
  let target = source;
  let lowest = Infinity;
  for (let angleIndex = 0; angleIndex < config.searchRays; angleIndex += 1) {
    const angle = angleIndex * Math.PI * 2 / config.searchRays;
    for (let distance = config.searchStep; distance <= config.maxSearchDistance; distance += config.searchStep) {
      const candidate = { x: source.x + Math.cos(angle) * distance, y: source.y + Math.sin(angle) * distance };
      const height = heightAt(candidate, seed);
      if (height < lowest) { lowest = height; target = candidate; }
      if (height < 0.22) break;
    }
  }
  const length = Math.max(8, Math.ceil(Math.hypot(target.x - source.x, target.y - source.y) / config.pointSpacing));
  const points: WorldPoint[] = [];
  for (let index = 0; index <= length; index += 1) {
    const t = index / length;
    const baseX = source.x + (target.x - source.x) * t;
    const baseY = source.y + (target.y - source.y) * t;
    const bend = Math.sin(t * Math.PI * 3 + seed * 0.03) * config.bendAmplitude * Math.sin(t * Math.PI);
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const lengthValue = Math.max(1, Math.hypot(dx, dy));
    points.push({ x: baseX - dy / lengthValue * bend, y: baseY + dx / lengthValue * bend });
  }
  points[0] = source;
  points[points.length - 1] = target;
  return points;
}

export function riversForChunk(coord: ChunkCoord, seed: number, chunkSize: number, terrainConfig: TerrainConfig, config: RiverConfig = DEFAULT_RIVER_CONFIG): RiverSegment[] {
  const origin = chunkOrigin(coord, chunkSize);
  const rivers: RiverSegment[] = [];
  const macroX = Math.floor(coord.x / config.macroChunkSpan);
  const macroY = Math.floor(coord.y / config.macroChunkSpan);
  for (let y = macroY - 1; y <= macroY + 1; y += 1) for (let x = macroX - 1; x <= macroX + 1; x += 1) {
    if (seededHash(seed, x, y, 8100) < config.sourceSkipChance) continue;
    const source = { x: x * chunkSize * config.macroChunkSpan + 120 + seededHash(seed, x, y, 8101) * chunkSize * 6, y: y * chunkSize * config.macroChunkSpan + 120 + seededHash(seed, x, y, 8102) * chunkSize * 6 };
    if (biomeAt(source, seed, terrainConfig) !== 'mountains') continue;
    const id = `river:${x},${y}`;
    const path = riverPath(seed, source, config);
    const relevant = path.some((point) => point.x >= origin.x - config.intersectionMargin && point.x <= origin.x + chunkSize + config.intersectionMargin && point.y >= origin.y - config.intersectionMargin && point.y <= origin.y + chunkSize + config.intersectionMargin);
    if (relevant) rivers.push({ id, points: path });
  }
  return rivers;
}
