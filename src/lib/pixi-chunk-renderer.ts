import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CHUNK_SIZE, chunkOrigin, worldToChunk } from './coordinates';
import type { WorldChunk } from './chunk-generator';
import type { Road, Settlement } from './settlements';

const palette = { plains: 0x263f39, forest: 0x1c3534, mountains: 0x3a3d4b, coast: 0x45504a, ocean: 0x102c49, grass: 0x3d765b, grassDark: 0x214d43, trunk: 0x684b3c, roof: 0x7a4e5d, wall: 0xb18b72, river: 0x59b9d4, riverEdge: 0x8edbe4, path: 0xb79a63, dirt: 0xa47b52, stone: 0xb9b8a5, highway: 0xd5c89b, settlement: 0xe8c477, settlementLight: 0xf6d995, city: 0x9e6d53, capital: 0xc8954d, wallDark: 0x403b3a, wallLight: 0xd9b879, gate: 0x241f25 };

export const ROAD_WIDTHS: Readonly<Record<Road['type'], number>> = { path: 5, dirt: 8, 'stone-paved': 11, highway: 15 };

export class PixiChunkRenderer {
  render(chunk: WorldChunk, view: Container): void {
    view.removeChildren().forEach((child) => child.destroy({ children: true })); view.position.set(chunkOrigin(chunk.coord).x, chunkOrigin(chunk.coord).y); view.addChild(new Graphics().rect(0, 0, CHUNK_SIZE, CHUNK_SIZE).fill(palette[chunk.biome]));
    for (const river of chunk.rivers) { const visible = river.points.filter((point) => point.x >= view.x - 20 && point.x <= view.x + CHUNK_SIZE + 20 && point.y >= view.y - 20 && point.y <= view.y + CHUNK_SIZE + 20); if (visible.length > 1) { view.addChild(this.polyline(visible, view.x, view.y, palette.river, 22, 0.95)); view.addChild(this.polyline(visible, view.x, view.y, palette.riverEdge, 3, 0.32)); } }
    for (const tree of chunk.trees) { const x = tree.x - view.x, y = tree.y - view.y, treeView = new Graphics().ellipse(x, y + tree.radius + 5, tree.radius * 0.8, tree.radius * 0.3).fill({ color: 0x000000, alpha: 0.2 }); treeView.rect(x - 3, y + 5, 6, 14).fill(palette.trunk); treeView.circle(x, y, tree.radius).fill(palette.grassDark); treeView.circle(x - tree.radius * 0.35, y - tree.radius * 0.3, tree.radius * 0.7).fill(palette.grass); view.addChild(treeView); }
    for (const house of chunk.houses) { const x = house.x - view.x, y = house.y - view.y; view.addChild(new Graphics().rect(x, y + 10, house.width, house.height - 10).fill(palette.wall).stroke({ color: 0x5a3e44, width: 2 })); view.addChild(new Graphics().poly([x - 5, y + 12, x + house.width / 2, y - 10, x + house.width + 5, y + 12]).fill(palette.roof)); }
    for (const road of chunk.roads ?? []) { const points = road.points.filter((point) => point.x >= view.x - 24 && point.x <= view.x + CHUNK_SIZE + 24 && point.y >= view.y - 24 && point.y <= view.y + CHUNK_SIZE + 24); if (points.length > 1) { const color = road.type === 'stone-paved' ? palette.stone : palette[road.type]; view.addChild(this.polyline(points, view.x, view.y, color, ROAD_WIDTHS[road.type], 0.9)); } }
    const settlements = (chunk.settlements ?? []).filter((settlement) => { const owner = worldToChunk(settlement.center); return owner.x === chunk.coord.x && owner.y === chunk.coord.y; });
    for (const settlement of settlements) { this.drawSettlement(settlement, chunk.roads ?? [], view); }
    const label = new Text({ text: `${chunk.biome} ${chunk.coord.x}:${chunk.coord.y}`, style: new TextStyle({ fontFamily: 'monospace', fontSize: 7, fill: 0xffffff }) }); label.alpha = 0.2; label.position.set(5, 5); view.addChild(label);
  }
  private drawSettlement(settlement: Settlement, roads: ReadonlyArray<Road>, view: Container): void {
    const x = settlement.center.x - view.x, y = settlement.center.y - view.y, radius = Math.max(5, settlement.size * 4);
    const color = settlement.type === 'capital' ? palette.capital : settlement.type === 'city' ? palette.city : palette.settlement;
    const marker = new Graphics();
    if (settlement.type === 'capital' || settlement.type === 'city') marker.circle(x, y, radius * 0.72).fill({ color, alpha: 0.92 }).stroke({ color: palette.settlementLight, width: 2 });
    else marker.circle(x, y, radius).fill({ color, alpha: 0.55 }).stroke({ color: palette.settlementLight, width: 2 });
    if (settlement.type === 'capital') marker.star(x, y, 6, radius * 0.42, radius * 0.2, -Math.PI / 2).fill(palette.settlementLight);
    else if (settlement.type === 'city') marker.rect(x - 3, y - 3, 6, 6).fill(palette.settlementLight);
    view.addChild(marker);
    if (settlement.type === 'city' || settlement.type === 'capital') this.drawFortifications(settlement, roads, view, x, y, radius);
  }
  private drawFortifications(settlement: Settlement, roads: ReadonlyArray<Road>, view: Container, x: number, y: number, radius: number): void {
    const wallRadius = radius * 0.9, walls = new Graphics().circle(x, y, wallRadius).stroke({ color: palette.wallDark, width: 6, alpha: 0.95 }).circle(x, y, wallRadius - 3).stroke({ color: palette.wallLight, width: 2, alpha: 0.9 });
    view.addChild(walls);
    const connected = roads.filter((road) => road.from === settlement.id || road.to === settlement.id);
    for (const road of connected) {
      const isFrom = road.from === settlement.id, neighbor = isFrom ? road.points[1] : road.points[road.points.length - 2];
      if (!neighbor) continue;
      const angle = Math.atan2(neighbor.y - settlement.center.y, neighbor.x - settlement.center.x), gx = x + Math.cos(angle) * wallRadius, gy = y + Math.sin(angle) * wallRadius;
      const gate = new Graphics().circle(0, 0, 5).fill(palette.gate).stroke({ color: palette.wallLight, width: 2 });
      gate.rect(-3, -6, 6, 12).fill(palette.gate); gate.position.set(gx, gy); gate.rotation = angle + Math.PI / 2; view.addChild(gate);
    }
  }
  private polyline(points: ReadonlyArray<{ x: number; y: number }>, ox: number, oy: number, color: number, width: number, alpha: number): Graphics { const line = new Graphics(); line.moveTo(points[0].x - ox, points[0].y - oy); for (const point of points.slice(1)) line.lineTo(point.x - ox, point.y - oy); line.stroke({ color, alpha, width }); return line; }
}
