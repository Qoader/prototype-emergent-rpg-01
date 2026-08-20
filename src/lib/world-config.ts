import { CHUNK_SIZE } from './coordinates';
import { DEFAULT_TERRAIN_CONFIG, type TerrainConfig } from './terrain';
import { DEFAULT_RIVER_CONFIG, type RiverConfig } from './rivers';
import { DEFAULT_OBSTACLE_CONFIG, type ObstacleConfig } from './obstacle-config';

export type ChunkTier = 0 | 1 | 2 | 3;
export type WorldConfig = { seed: number; chunkSize: number; tier1Radius: number; tier2Radius: number; retentionRadius: number; terrain: TerrainConfig; rivers: RiverConfig; obstacles: ObstacleConfig };
export const DEFAULT_WORLD_CONFIG: WorldConfig = { seed: 0x5eeda11, chunkSize: CHUNK_SIZE, tier1Radius: 1, tier2Radius: 4, retentionRadius: 5, terrain: DEFAULT_TERRAIN_CONFIG, rivers: DEFAULT_RIVER_CONFIG, obstacles: DEFAULT_OBSTACLE_CONFIG };
export function mergeWorldConfig(config: Partial<WorldConfig> = {}): WorldConfig { return { ...DEFAULT_WORLD_CONFIG, ...config, terrain: { ...DEFAULT_TERRAIN_CONFIG, ...config.terrain }, rivers: { ...DEFAULT_RIVER_CONFIG, ...config.rivers }, obstacles: { ...DEFAULT_OBSTACLE_CONFIG, ...config.obstacles } }; }
export function tierForDistance(distance: number, config: WorldConfig = DEFAULT_WORLD_CONFIG): ChunkTier { if (distance === 0) return 0; if (distance <= config.tier1Radius) return 1; if (distance <= config.tier2Radius) return 2; return 3; }
