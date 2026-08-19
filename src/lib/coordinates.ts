export const CHUNK_SIZE = 128;
export const NAV_CELL_SIZE = 16;

export type ChunkCoord = { x: number; y: number };
export type WorldPoint = { x: number; y: number };

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
