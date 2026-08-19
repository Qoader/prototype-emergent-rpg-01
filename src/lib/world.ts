/** Backwards-compatible domain barrel. New code should import focused modules directly. */
export * from './coordinates';
export * from './terrain';
export * from './rivers';
export * from './obstacles';
export * from './world-config';
export type { ChunkGenerator as ChunkGeneratorService, WorldChunk } from './chunk-generator';
export * from './world-manager';

import { ProceduralChunkGenerator } from './chunk-generator';
/** Compatibility name retained for the original public API. */
export const ChunkGenerator = ProceduralChunkGenerator;
