import { Application, Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { GameState } from './game-state';
import { advanceTowards } from './movement';

export type GameSnapshot = { score: number; wave: number; energy: number };
type Crystal = { view: Container; homeY: number; phase: number };

const palette = {
  ink: 0x090d1d,
  grass: 0x172d35,
  grassLight: 0x21424a,
  path: 0x725d58,
  pathLight: 0x98796a,
  violet: 0x8e7dff,
  cyan: 0x59e7e1,
  gold: 0xffc46b,
};
const MAP_WIDTH = 900;
const MAP_HEIGHT = 620;

export class EmberfallGame {
  readonly app = new Application();
  private readonly world = new Container();
  private readonly map = new Container();
  private readonly crystals: Crystal[] = [];
  private readonly state = new GameState();
  private player = new Container();
  private destination: Graphics | undefined;
  private target: { x: number; y: number } | undefined;
  private elapsed = 0;
  private onChange: (snapshot: GameSnapshot) => void = () => {};

  async mount(host: HTMLElement, onChange: (snapshot: GameSnapshot) => void) {
    this.onChange = onChange;
    await this.app.init({ background: palette.ink, antialias: true, resizeTo: host, resolution: Math.min(devicePixelRatio, 2) });
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.world.addChild(this.map);
    this.createScene();
    this.resizeWorld();
    this.app.renderer.on('resize', this.resizeWorld, this);
    this.app.ticker.add(({ deltaTime }) => this.tick(deltaTime));
    this.onChange(this.state.snapshot());
  }

  destroy() { this.app.destroy(true, { children: true, texture: true }); }

  collect() {
    if (this.state.snapshot().energy <= 0 || this.crystals.length === 0) return;
    const target = this.crystals[Math.floor(Math.random() * this.crystals.length)];
    target.view.scale.set(1.35); target.view.alpha = 0;
    this.onChange(this.state.collect());
    window.setTimeout(() => { target.view.alpha = 1; target.view.scale.set(1); }, 240);
  }

  recharge() { this.onChange(this.state.recharge()); }

  private createScene() {
    const width = MAP_WIDTH;
    const height = MAP_HEIGHT;
    const background = new Graphics().rect(0, 0, width, height).fill(palette.grass);
    this.map.addChild(background);

    // A subtle tile grid makes the play space read as a navigable top-down map.
    const tiles = new Graphics();
    for (let x = 0; x < width; x += 40) tiles.moveTo(x, 0).lineTo(x, height);
    for (let y = 0; y < height; y += 40) tiles.moveTo(0, y).lineTo(width, y);
    tiles.stroke({ color: palette.grassLight, alpha: 0.28, width: 1 });
    this.map.addChild(tiles);

    const water = new Graphics().roundRect(585, 0, 315, 190, 28).fill({ color: 0x102c49, alpha: 0.95 });
    for (let y = 28; y < 175; y += 34) water.moveTo(610, y).quadraticCurveTo(670, y - 10, 730, y).quadraticCurveTo(790, y + 10, 860, y).stroke({ color: palette.cyan, alpha: 0.18, width: 2 });
    this.map.addChild(water);

    const road = new Graphics().moveTo(0, 510).quadraticCurveTo(250, 440, 400, 500).quadraticCurveTo(560, 565, 900, 445).stroke({ color: palette.path, width: 48, alpha: 0.9 });
    road.moveTo(0, 510).quadraticCurveTo(250, 440, 400, 500).quadraticCurveTo(560, 565, 900, 445).stroke({ color: palette.pathLight, width: 2, alpha: 0.45 });
    this.map.addChild(road);

    this.addTrees();
    this.addShrine(112, 144);
    this.addCrystals();
    this.addMapLabel('MOONHOLLOW', 114, 242);

    this.destination = new Graphics().circle(0, 0, 15).stroke({ color: palette.gold, alpha: 0.9, width: 2 });
    this.destination.addChild(new Graphics().circle(0, 0, 3).fill(palette.gold));
    this.destination.visible = false;
    this.map.addChild(this.destination);

    this.player = this.createPlayer();
    this.player.position.set(450, 425);
    this.map.addChild(this.player);

    this.map.eventMode = 'static';
    this.map.hitArea = new Rectangle(0, 0, width, height);
    this.map.on('pointertap', (event) => {
      const point = event.getLocalPosition(this.map);
      this.target = { x: point.x, y: point.y };
      this.destination?.position.set(point.x, point.y);
      this.destination!.visible = true;
    });
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

  private addTrees() {
    const trees = new Graphics();
    for (const [x, y] of [[70, 80], [220, 92], [340, 160], [500, 95], [760, 280], [820, 365], [240, 320], [55, 355]]) {
      trees.circle(x, y, 25).fill(0x0d202b).circle(x - 9, y - 10, 17).fill(0x2f6a5e).circle(x + 10, y - 7, 16).fill(0x397b66);
      trees.rect(x - 3, y + 16, 6, 16).fill(0x5b443d);
    }
    this.map.addChild(trees);
  }

  private addShrine(x: number, y: number) {
    const shrine = new Container();
    shrine.addChild(new Graphics().roundRect(-38, -26, 76, 52, 8).fill(0x342f52).stroke({ color: palette.violet, alpha: 0.6, width: 2 }));
    shrine.addChild(new Graphics().poly([-28, -26, 0, -52, 28, -26]).fill(palette.violet));
    shrine.addChild(new Graphics().circle(0, -4, 11).fill({ color: palette.cyan, alpha: 0.8 }));
    shrine.position.set(x, y); this.map.addChild(shrine);
  }

  private addCrystals() {
    for (let i = 0; i < 5; i += 1) {
      const crystal = new Container();
      crystal.addChild(new Graphics().circle(0, 0, 30).fill({ color: palette.violet, alpha: 0.08 }));
      crystal.addChild(new Graphics().poly([0, -19, 12, 0, 0, 20, -12, 0]).fill(i % 2 ? palette.cyan : palette.violet));
      crystal.position.set(120 + i * 165, 300 + (i % 2) * 90); this.map.addChild(crystal);
      this.crystals.push({ view: crystal, homeY: crystal.y, phase: i * 1.3 });
    }
  }

  private addMapLabel(text: string, x: number, y: number) {
    const label = new Text({ text, style: new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: 0xffffff, letterSpacing: 2 }) });
    label.alpha = 0.55; label.anchor.set(0.5); label.position.set(x, y); this.map.addChild(label);
  }

  private tick(delta: number) {
    this.elapsed += delta / 60;
    for (const crystal of this.crystals) {
      crystal.view.y = crystal.homeY + Math.sin(this.elapsed * 1.5 + crystal.phase) * 7;
      crystal.view.rotation = Math.sin(this.elapsed + crystal.phase) * 0.08;
    }
    if (!this.target) return;
    const movement = advanceTowards(this.player, this.target, 150, delta / 60);
    this.player.position.set(movement.position.x, movement.position.y);
    if (movement.arrived) {
      this.target = undefined;
      if (this.destination) this.destination.visible = false;
    } else {
      this.player.scale.y = 1 + Math.sin(this.elapsed * 14) * 0.04;
    }
  }

  private resizeWorld() {
    this.world.scale.set(this.app.screen.width / MAP_WIDTH, this.app.screen.height / MAP_HEIGHT);
  }
}
