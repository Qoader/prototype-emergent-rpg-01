import { seededHash } from './random';

export class DeterministicRandom {
  constructor(private readonly seed: number, private readonly x: number, private readonly y: number) {}
  value(salt: number): number { return seededHash(this.seed, this.x, this.y, salt); }
  signed(salt: number): number { return this.value(salt) * 2 - 1; }
  integer(salt: number, min: number, max: number): number { return min + Math.floor(this.value(salt) * (max - min + 1)); }
}
