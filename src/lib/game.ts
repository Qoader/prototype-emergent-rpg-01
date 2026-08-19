import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';

export type GameSnapshot = { score: number; wave: number; energy: number };
type Crystal = { view: Container; homeY: number; phase: number };
const palette = { ink: 0x090d1d, violet: 0x8e7dff, cyan: 0x59e7e1 };

export class EmberfallGame {
  readonly app = new Application();
  private readonly world = new Container();
  private readonly crystals: Crystal[] = [];
  private score = 0;
  private wave = 1;
  private energy = 3;
  private elapsed = 0;
  private onChange: (snapshot: GameSnapshot) => void = () => {};

  async mount(host: HTMLElement, onChange: (snapshot: GameSnapshot) => void) {
    this.onChange = onChange;
    await this.app.init({ background: palette.ink, antialias: true, resizeTo: host, resolution: Math.min(devicePixelRatio, 2) });
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.createScene();
    this.app.ticker.add(({ deltaTime }) => this.tick(deltaTime));
    this.onChange(this.snapshot());
  }

  destroy() { this.app.destroy(true, { children: true, texture: true }); }

  collect() {
    if (this.energy <= 0 || this.crystals.length === 0) return;
    const target = this.crystals[Math.floor(Math.random() * this.crystals.length)];
    target.view.scale.set(1.35); target.view.alpha = 0;
    this.score += 10; this.energy -= 1;
    if (this.score % 50 === 0) this.wave += 1;
    this.onChange(this.snapshot());
    window.setTimeout(() => { target.view.alpha = 1; target.view.scale.set(1); }, 240);
  }

  recharge() { this.energy = 3; this.onChange(this.snapshot()); }
  private snapshot(): GameSnapshot { return { score: this.score, wave: this.wave, energy: this.energy }; }

  private createScene() {
    const stars = new Graphics();
    for (let i = 0; i < 100; i += 1) {
      stars.circle(Math.random() * 900, Math.random() * 700, Math.random() * 1.8 + 0.4)
        .fill({ color: i % 4 === 0 ? palette.cyan : 0x4b4a72, alpha: Math.random() * 0.6 + 0.2 });
    }
    this.world.addChild(stars);
    const title = new Text({ text: 'THE LUMEN WILDS', style: new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: palette.cyan, letterSpacing: 3 }) });
    title.anchor.set(0.5); title.position.set(450, 54); this.world.addChild(title);
    for (let i = 0; i < 5; i += 1) {
      const crystal = new Container();
      const glow = new Graphics().circle(0, 0, 35).fill({ color: palette.violet, alpha: 0.08 });
      const shard = new Graphics().poly([0, -22, 13, 0, 0, 23, -13, 0]).fill({ color: i % 2 ? palette.cyan : palette.violet });
      shard.rotation = Math.PI / 4; crystal.addChild(glow, shard);
      crystal.position.set(120 + i * 165, 250 + (i % 2) * 100); this.world.addChild(crystal);
      this.crystals.push({ view: crystal, homeY: crystal.y, phase: i * 1.3 });
    }
    const hint = new Text({ text: 'TAP TO GATHER LUMEN', style: new TextStyle({ fontFamily: 'monospace', fontSize: 13, fill: 0xffffff, letterSpacing: 2 }) });
    hint.alpha = 0.7;
    hint.anchor.set(0.5); hint.position.set(450, 560); this.world.addChild(hint);
  }

  private tick(delta: number) {
    this.elapsed += delta / 60;
    for (const crystal of this.crystals) {
      crystal.view.y = crystal.homeY + Math.sin(this.elapsed * 1.5 + crystal.phase) * 9;
      crystal.view.rotation = Math.sin(this.elapsed + crystal.phase) * 0.08;
    }
  }
}
