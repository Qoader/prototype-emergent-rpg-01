import { Container, Graphics } from 'pixi.js';
import type { EngineSnapshot } from './game-engine';

const palette = { ink: 0x090d1d, violet: 0x8e7dff, cyan: 0x59e7e1, gold: 0xffc46b };
export class PixiPlayerRenderer {
  readonly view = new Container();
  private readonly destination = new Graphics()
    .circle(0, 0, 9)
    .stroke({ color: palette.gold, alpha: 0.9, width: 2 });
  constructor() {
    this.destination.addChild(new Graphics().circle(0, 0, 2).fill(palette.gold));
    this.destination.visible = false;
    this.view.addChild(this.destination, this.createPlayer());
  }
  render(snapshot: EngineSnapshot): void {
    this.view.position.set(snapshot.player.x, snapshot.player.y);
    if (snapshot.destination) {
      this.destination.position.set(
        snapshot.destination.x - snapshot.player.x,
        snapshot.destination.y - snapshot.player.y,
      );
      this.destination.visible = true;
    } else this.destination.visible = false;
  }
  private createPlayer(): Container {
    const hero = new Container();
    hero.addChild(new Graphics().ellipse(0, 16, 22, 8).fill({ color: 0x000000, alpha: 0.3 }));
    hero.addChild(new Graphics().circle(0, 0, 17).fill(palette.violet));
    hero.addChild(new Graphics().circle(0, -5, 11).fill(0xffd7b1));
    hero.addChild(new Graphics().poly([-12, -9, 0, -25, 12, -9]).fill(palette.cyan));
    hero.addChild(
      new Graphics().circle(-4, -6, 2).fill(palette.ink),
      new Graphics().circle(4, -6, 2).fill(palette.ink),
    );
    return hero;
  }
}
