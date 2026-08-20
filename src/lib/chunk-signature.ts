import type { WorldChunk } from './chunk-generator';

export function chunkRenderSignature(chunk: WorldChunk): string {
  return `${chunk.key}:${chunk.renderRevision ?? 0}`;
}
