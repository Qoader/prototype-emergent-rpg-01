import { Application, Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { GameState } from './game-state';
import { advanceTowards } from './movement';
import { CHUNK_SIZE, chunkOrigin, type CrystalState, type WorldChunk, WorldManager } from './world';

export type GameSnapshot = { score: number; wave: number; energy: number };
type CrystalView = { id: string; view: Container; homeY: number; phase: number };

const palette = { ink: 0x090d1d, meadow: 0x172d35, marsh: 0x1c2938, heath: 0x26333a, grid: 0x21424a, violet: 0x8e7dff, cyan: 0x59e7e1, gold: 0xffc46b };

export class EmberfallGame {
  readonly app = new Application();
  private readonly world = new Container();
  private readonly camera = new Container();
  private readonly map = new Container();
  private readonly state = new GameState();
  private readonly worldState = new WorldManager();
  private readonly chunkViews = new Map<string, Container>();
  private readonly crystals: CrystalView[] = [];
  private player = new Container();
  private destination: Graphics | undefined;
  private target: { x: number; y: number } | undefined;
  private elapsed = 0;
  private zoom = 1;
  private onChange: (snapshot: GameSnapshot) => void = () => {};

  async mount(host: HTMLElement, onChange: (snapshot: GameSnapshot) => void) {
    this.onChange = onChange;
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
    this.onChange(this.state.snapshot());
  }

  destroy() { this.app.destroy(true, { children: true, texture: true }); }

  collect() {
    if (this.state.snapshot().energy <= 0) return;
    const target = this.crystals.find((crystal) => crystal.view.visible);
    if (!target || !this.worldState.collectCrystal(target.id)) return;
    target.view.visible = false;
    this.onChange(this.state.collect());
  }

  recharge() { this.onChange(this.state.recharge()); }

  private createScene() {
    this.destination = new Graphics().circle(0, 0, 15).stroke({ color: palette.gold, alpha: 0.9, width: 2 });
    this.destination.addChild(new Graphics().circle(0, 0, 3).fill(palette.gold));
    this.destination.visible = false;
    this.map.addChild(this.destination);

    this.player = this.createPlayer();
    this.player.position.set(0, 0);
    this.map.addChild(this.player);

    this.world.eventMode = 'static';
    this.world.on('pointertap', (event) => {
      const point = event.getLocalPosition(this.world);
      this.target = { x: (point.x - this.camera.x) / this.zoom, y: (point.y - this.camera.y) / this.zoom };
      this.destination?.position.set(this.target.x, this.target.y);
      if (this.destination) this.destination.visible = true;
    });
  }

  private syncWorld() {
    const chunks = this.worldState.syncAround(this.player, this.elapsed);
    const activeKeys = new Set(chunks.map((chunk) => chunk.key));
    for (const chunk of chunks) {
      if (!this.chunkViews.has(chunk.key)) this.addChunk(chunk);
      this.refreshChunk(chunk);
    }
    for (const [key, view] of this.chunkViews) {
      if (!activeKeys.has(key)) {
        for (let index = this.crystals.length - 1; index >= 0; index -= 1) {
          if (this.crystals[index].id.startsWith(`${key}:`)) this.crystals.splice(index, 1);
        }
        view.destroy({ children: true });
        this.chunkViews.delete(key);
      }
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
    for (let index = this.crystals.length - 1; index >= 0; index -= 1) {
      if (this.crystals[index].id.startsWith(`${chunk.key}:`)) this.crystals.splice(index, 1);
    }
    view.removeChildren().forEach((child) => child.destroy({ children: true }));
    const terrain = chunk.terrain === 'marsh' ? palette.marsh : chunk.terrain === 'heath' ? palette.heath : palette.meadow;
    view.addChild(new Graphics().rect(0, 0, CHUNK_SIZE, CHUNK_SIZE).fill(terrain));
    const grid = new Graphics();
    for (let i = 0; i <= CHUNK_SIZE; i += 32) grid.moveTo(i, 0).lineTo(i, CHUNK_SIZE).moveTo(0, i).lineTo(CHUNK_SIZE, i);
    grid.stroke({ color: palette.grid, alpha: 0.25, width: 1 });
    view.addChild(grid);
    for (const landmark of chunk.landmarks) {
      const landmarkView = new Graphics();
      if (landmark.kind === 'shrine') landmarkView.roundRect(landmark.x - 18, landmark.y - 13, 36, 26, 5).fill(0x342f52).stroke({ color: palette.violet, alpha: 0.65, width: 2 });
      else landmarkView.rect(landmark.x - 18, landmark.y - 10, 36, 20).fill(0x4d4749).stroke({ color: 0xc9a787, alpha: 0.45, width: 2 });
      view.addChild(landmarkView);
    }
    for (const crystal of chunk.crystals) {
      const crystalView = this.createCrystal(crystal);
      view.addChild(crystalView);
      this.crystals.push({ id: crystal.id, view: crystalView, homeY: crystalView.y, phase: crystal.phase });
    }
    const label = new Text({ text: `${chunk.coord.x}:${chunk.coord.y}`, style: new TextStyle({ fontFamily: 'monospace', fontSize: 7, fill: 0xffffff }) });
    label.alpha = 0.2; label.position.set(5, 5); view.addChild(label);
  }

  private createCrystal(crystal: CrystalState) {
    const view = new Container();
    view.position.set(crystal.x, crystal.y);
    view.visible = crystal.active;
    view.addChild(new Graphics().circle(0, 0, 15).fill({ color: palette.violet, alpha: 0.08 }));
    view.addChild(new Graphics().poly([0, -10, 7, 0, 0, 11, -7, 0]).fill(crystal.phase > Math.PI ? palette.cyan : palette.violet));
    return view;
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
    if (this.target) {
      const movement = advanceTowards(this.player, this.target, 150, seconds);
      this.player.position.set(movement.position.x, movement.position.y);
      if (movement.arrived) { this.target = undefined; if (this.destination) this.destination.visible = false; }
      else this.player.scale.y = 1 + Math.sin(this.elapsed * 14) * 0.04;
      const before = this.worldState.currentChunk;
      const after = this.worldState.config.chunkSize;
      void after;
      if (before.x !== Math.floor(this.player.x / CHUNK_SIZE) || before.y !== Math.floor(this.player.y / CHUNK_SIZE)) {
        this.syncWorld();
      }
    }
    for (const crystal of this.crystals) {
      if (crystal.view.visible) { crystal.view.y = crystal.homeY + Math.sin(this.elapsed * 1.5 + crystal.phase) * 4; crystal.view.rotation = Math.sin(this.elapsed + crystal.phase) * 0.08; }
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
