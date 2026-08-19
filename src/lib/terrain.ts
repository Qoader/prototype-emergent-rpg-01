import type { WorldPoint } from './coordinates';
import { heightAt } from './random';

export type Biome = 'ocean' | 'coast' | 'plains' | 'forest' | 'mountains';
export type TerrainConfig = { oceanLevel: number; coastLevel: number; mountainLevel: number; forestLevel: number };
export const DEFAULT_TERRAIN_CONFIG: TerrainConfig = { oceanLevel: 0.22, coastLevel: 0.3, mountainLevel: 0.78, forestLevel: 0.54 };

export function biomeAt(point: WorldPoint, seed: number, config: TerrainConfig = DEFAULT_TERRAIN_CONFIG): Biome {
  const height = heightAt(point, seed);
  if (height < config.oceanLevel) return 'ocean';
  if (height < config.coastLevel) return 'coast';
  if (height > config.mountainLevel) return 'mountains';
  if (height > config.forestLevel) return 'forest';
  return 'plains';
}
