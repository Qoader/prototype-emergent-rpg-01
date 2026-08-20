import type { WorldChunk } from './chunk-generator';

export function chunkRenderSignature(chunk: WorldChunk): string {
  return JSON.stringify({
    coord: chunk.coord,
    biome: chunk.biome,
    trees: chunk.trees,
    houses: chunk.houses,
    settlements: chunk.settlements ?? [],
    roads: chunk.roads ?? [],
    layout: chunk.layout ?? [],
    rivers: chunk.rivers,
  });
}
