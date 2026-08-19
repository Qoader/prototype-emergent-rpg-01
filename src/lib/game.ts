import { Application, Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { findPath } from './navigation';
import { advanceTowards } from './movement';
import { CHUNK_SIZE, chunkOrigin, type WorldChunk, WorldManager } from './world';

const palette = {
  ink: 0x090d1d,
  plains: 0x263f39,
  forest: 0x1c3534,
  mountains: 0x3a3d4b,
  coast: 0x45504a,
  ocean: 0x102c49,
  grass: 0x3d765b,
  grassDark: 0x214d43,
  trunk: 0x684b3c,
  roof: 0x7a4e5d,
  wall: 0xb18b72,
  river: 0x59b9d4,
  riverEdge: 0x8edbe4,
  violet: 0x8e7dff,
  cyan: 0x59e7e1,
  gold: 0xffc46b,
};

export class EmberfallGame {
  readonly app = new Application();
  private readonly world = new Container();
  private readonly camera = new Container();
  private readonly map = new Container();
  private readonly worldState = new WorldManager();
  private readonly chunkViews = new Map<string, Container>();
  private player = new Container();
  private destination: Graphics | undefined;
  private path: { x: number; y: number }[] = [];
  private elapsed = 0;
  private zoom = 1;

  async mount(host: HTMLElement) {
    await this.app.init({ background: palette.ink, antialias: true, resizeTo: host, resolution: Math.min(devicePixelRatio, 2) });
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.world.addChild(this.camera);
    this.camera.addChild(this.map);
    this.createScene();
    this.syncWorld();
    this.resizeWorld();
    this.app.renderer.on('resize', this.resizeWorld, this);
    this.app.ticker.add(({ deltaTime }) => this.tick(deltaTime));
  }

  destroy() { this.app.destroy(true, { children: true, texture: true }); }

  private createScene() {
    this.destination = new Graphics().circle(0, 0, 9).stroke({ color: palette.gold, alpha: 0.9, width: 2 });
    this.destination.addChild(new Graphics().circle(0, 0, 2).fill(palette.gold));
    this.destination.visible = false;
    this.map.addChild(this.destination);

    this.player = this.createPlayer();
    this.player.position.set(0, 0);
    this.map.addChild(this.player);

    this.world.eventMode = 'static';
    this.world.on('pointertap', (event) => {
      const point = event.getLocalPosition(this.world);
      const target = { x: (point.x - this.camera.x) / this.zoom, y: (point.y - this.camera.y) / this.zoom };
      this.path = findPath(this.player, target, this.worldState);
      this.destination?.position.set(target.x, target.y);
      if (this.destination) this.destination.visible = true;
    });
  }

  private syncWorld() {
    const chunks = this.worldState.syncAround(this.player);
    const activeKeys = new Set(chunks.map((chunk) => chunk.key));
    for (const chunk of chunks) {
      if (!this.chunkViews.has(chunk.key)) this.addChunk(chunk);
      this.refreshChunk(chunk);
    }
    for (const [key, view] of this.chunkViews) {
      if (!activeKeys.has(key)) { view.destroy({ children: true }); this.chunkViews.delete(key); }
    }
  }

  private addChunk(chunk: WorldChunk) {
    const view = new Container();
    const origin = chunkOrigin(chunk.coord, CHUNK_SIZE);
    view.position.set(origin.x, origin.y);
    this.map.addChildAt(view, 0);
    this.chunkViews.set(chunk.key, view);
  }

  private refreshChunk(chunk: WorldChunk) {
    const view = this.chunkViews.get(chunk.key);
    if (!view) return;
    view.removeChildren().forEach((child) => child.destroy({ children: true }));
    const terrain = palette[chunk.biome];
    view.addChild(new Graphics().rect(0, 0, CHUNK_SIZE, CHUNK_SIZE).fill(terrain));
    const origin = chunkOrigin(chunk.coord, CHUNK_SIZE);

    for (const river of chunk.rivers) {
      const water = new Graphics();
      const visiblePoints = river.points.filter((point) => point.x >= origin.x - 20 && point.x <= origin.x + CHUNK_SIZE + 20 && point.y >= origin.y - 20 && point.y <= origin.y + CHUNK_SIZE + 20);
      if (visiblePoints.length > 1) {
        water.moveTo(visiblePoints[0].x - origin.x, visiblePoints[0].y - origin.y);
        for (const point of visiblePoints.slice(1)) water.lineTo(point.x - origin.x, point.y - origin.y);
        water.stroke({ color: palette.river, alpha: 0.95, width: 22 });
        water.moveTo(visiblePoints[0].x - origin.x, visiblePoints[0].y - origin.y);
        for (const point of visiblePoints.slice(1)) water.lineTo(point.x - origin.x, point.y - origin.y);
        water.stroke({ color: palette.riverEdge, alpha: 0.32, width: 3 });
        view.addChild(water);
      }
    }

    for (const tree of chunk.trees) {
      const x = tree.x - origin.x;
      const y = tree.y - origin.y;
      const treeView = new Graphics().ellipse(x, y + tree.radius + 5, tree.radius * 0.8, tree.radius * 0.3).fill({ color: 0x000000, alpha: 0.2 });
      treeView.rect(x - 3, y + 5, 6, 14).fill(palette.trunk);
      treeView.circle(x, y, tree.radius).fill(palette.grassDark);
      treeView.circle(x - tree.radius * 0.35, y - tree.radius * 0.3, tree.radius * 0.7).fill(palette.grass);
      view.addChild(treeView);
    }

    for (const house of chunk.houses) {
      const x = house.x - origin.x;
      const y = house.y - origin.y;
      view.addChild(new Graphics().rect(x, y + 10, house.width, house.height - 10).fill(palette.wall).stroke({ color: 0x5a3e44, width: 2 }));
      view.addChild(new Graphics().poly([x - 5, y + 12, x + house.width / 2, y - 10, x + house.width + 5, y + 12]).fill(palette.roof));
    }

    const label = new Text({ text: `${chunk.biome} ${chunk.coord.x}:${chunk.coord.y}`, style: new TextStyle({ fontFamily: 'monospace', fontSize: 7, fill: 0xffffff }) });
    label.alpha = 0.2; label.position.set(5, 5); view.addChild(label);
  }

  private createPlayer() {
    const hero = new Container();
    hero.addChild(new Graphics().ellipse(0, 16, 22, 8).fill({ color: 0x000000, alpha: 0.3 }));
    hero.addChild(new Graphics().circle(0, 0, 17).fill(palette.violet));
    hero.addChild(new Graphics().circle(0, -5, 11).fill(0xffd7b1));
    hero.addChild(new Graphics().poly([-12, -9, 0, -25, 12, -9]).fill(palette.cyan));
    hero.addChild(new Graphics().circle(-4, -6, 2).fill(palette.ink), new Graphics().circle(4, -6, 2).fill(palette.ink));
    return hero;
  }

  private tick(delta: number) {
    const seconds = delta / 60;
    this.elapsed += seconds;
    this.worldState.tick(seconds, this.elapsed);
    if (this.path.length > 0) {
      const movement = advanceTowards(this.player, this.path[0], 150, seconds);
      this.player.position.set(movement.position.x, movement.position.y);
      if (movement.arrived) {
        this.path.shift();
        if (this.path.length === 0 && this.destination) this.destination.visible = false;
      } else this.player.scale.y = 1 + Math.sin(this.elapsed * 14) * 0.04;
      const current = this.worldState.currentChunk;
      if (current.x !== Math.floor(this.player.x / CHUNK_SIZE) || current.y !== Math.floor(this.player.y / CHUNK_SIZE)) this.syncWorld();
    }
    this.centerCamera();
  }

  private resizeWorld() {
    this.zoom = Math.min(1.35, Math.max(0.85, this.app.screen.width / 620));
    this.world.hitArea = new Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
    this.centerCamera();
  }

  private centerCamera() {
    this.camera.scale.set(this.zoom);
    this.camera.position.set(this.app.screen.width / 2 - this.player.x * this.zoom, this.app.screen.height / 2 - this.player.y * this.zoom);
  }
}
