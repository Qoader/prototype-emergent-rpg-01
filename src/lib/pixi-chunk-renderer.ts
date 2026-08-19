import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CHUNK_SIZE, chunkOrigin } from './coordinates';
import type { WorldChunk } from './chunk-generator';

const palette = { plains: 0x263f39, forest: 0x1c3534, mountains: 0x3a3d4b, coast: 0x45504a, ocean: 0x102c49, grass: 0x3d765b, grassDark: 0x214d43, trunk: 0x684b3c, roof: 0x7a4e5d, wall: 0xb18b72, river: 0x59b9d4, riverEdge: 0x8edbe4 };
export class PixiChunkRenderer {
  render(chunk: WorldChunk, view: Container): void {
    view.removeChildren().forEach((child) => child.destroy({ children: true })); view.position.set(chunkOrigin(chunk.coord).x, chunkOrigin(chunk.coord).y); view.addChild(new Graphics().rect(0, 0, CHUNK_SIZE, CHUNK_SIZE).fill(palette[chunk.biome]));
    for (const river of chunk.rivers) { const visible = river.points.filter((point) => point.x >= view.x - 20 && point.x <= view.x + CHUNK_SIZE + 20 && point.y >= view.y - 20 && point.y <= view.y + CHUNK_SIZE + 20); if (visible.length > 1) { view.addChild(this.polyline(visible, view.x, view.y, palette.river, 22, 0.95)); view.addChild(this.polyline(visible, view.x, view.y, palette.riverEdge, 3, 0.32)); } }
    for (const tree of chunk.trees) { const x = tree.x - view.x, y = tree.y - view.y, treeView = new Graphics().ellipse(x, y + tree.radius + 5, tree.radius * 0.8, tree.radius * 0.3).fill({ color: 0x000000, alpha: 0.2 }); treeView.rect(x - 3, y + 5, 6, 14).fill(palette.trunk); treeView.circle(x, y, tree.radius).fill(palette.grassDark); treeView.circle(x - tree.radius * 0.35, y - tree.radius * 0.3, tree.radius * 0.7).fill(palette.grass); view.addChild(treeView); }
    for (const house of chunk.houses) { const x = house.x - view.x, y = house.y - view.y; view.addChild(new Graphics().rect(x, y + 10, house.width, house.height - 10).fill(palette.wall).stroke({ color: 0x5a3e44, width: 2 })); view.addChild(new Graphics().poly([x - 5, y + 12, x + house.width / 2, y - 10, x + house.width + 5, y + 12]).fill(palette.roof)); }
    const label = new Text({ text: `${chunk.biome} ${chunk.coord.x}:${chunk.coord.y}`, style: new TextStyle({ fontFamily: 'monospace', fontSize: 7, fill: 0xffffff }) }); label.alpha = 0.2; label.position.set(5, 5); view.addChild(label);
  }
  private polyline(points: ReadonlyArray<{ x: number; y: number }>, ox: number, oy: number, color: number, width: number, alpha: number): Graphics { const line = new Graphics(); line.moveTo(points[0].x - ox, points[0].y - oy); for (const point of points.slice(1)) line.lineTo(point.x - ox, point.y - oy); line.stroke({ color, alpha, width }); return line; }
}
