import { Container } from 'pixi.js';
import type { WorldChunk } from './chunk-generator';
import { chunkRenderSignature } from './chunk-signature';
import { PixiChunkRenderer } from './pixi-chunk-renderer';

export class PixiChunkEntity extends Container {
  private signature = '';
  constructor(private readonly renderer: PixiChunkRenderer) {
    super();
  }
  update(chunk: WorldChunk): void {
    const nextSignature = chunkRenderSignature(chunk);
    if (nextSignature === this.signature) return;
    this.renderer.render(chunk, this);
    this.signature = nextSignature;
  }
}
