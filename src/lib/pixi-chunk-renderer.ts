import { Container, Text, TextStyle } from 'pixi.js';
import { chunkOrigin } from './coordinates';
import type { WorldChunk } from './chunk-generator';
import {
  NaturalObstacleRenderer,
  RoadRenderer,
  SettlementRenderer,
  TerrainRenderer,
} from './pixi-feature-renderers';

/** Coordinates the chunk scene; feature renderers own their own visual concerns. */
export class PixiChunkRenderer {
  private readonly terrain = new TerrainRenderer();
  private readonly obstacles = new NaturalObstacleRenderer();
  private readonly roads = new RoadRenderer();
  private readonly settlements = new SettlementRenderer();

  render(chunk: WorldChunk, view: Container): void {
    view.removeChildren().forEach((child) => child.destroy({ children: true }));
    view.position.set(chunkOrigin(chunk.coord).x, chunkOrigin(chunk.coord).y);
    this.terrain.render(chunk, view);
    this.settlements.renderGround(chunk.layout ?? [], view);
    this.roads.render(chunk.roads ?? [], view);
    this.obstacles.render(chunk, view);
    this.settlements.renderStructures(chunk.layout ?? [], view);
    const label = new Text({
      text: `${chunk.biome} ${chunk.coord.x}:${chunk.coord.y}`,
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 7, fill: 0xffffff }),
    });
    label.alpha = 0.2;
    label.position.set(5, 5);
    view.addChild(label);
  }
}
