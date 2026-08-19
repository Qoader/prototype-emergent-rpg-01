import type { GameSnapshot } from './game';

export class GameState {
  private score = 0;
  private wave = 1;
  private energy = 3;

  snapshot(): GameSnapshot {
    return { score: this.score, wave: this.wave, energy: this.energy };
  }

  collect(): GameSnapshot {
    if (this.energy > 0) {
      this.score += 10;
      this.energy -= 1;
      if (this.score % 50 === 0) this.wave += 1;
    }
    return this.snapshot();
  }

  recharge(): GameSnapshot {
    this.energy = 3;
    return this.snapshot();
  }
}
