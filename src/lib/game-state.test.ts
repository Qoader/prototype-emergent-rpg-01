import { describe, expect, it } from 'vitest';
import { GameState } from './game-state';

describe('GameState', () => {
  it('starts with three lumen and an empty score', () => {
    expect(new GameState().snapshot()).toEqual({ score: 0, wave: 1, energy: 3 });
  });

  it('awards lumen, spends energy, and advances the wave every 50 points', () => {
    const state = new GameState();

    state.collect();
    state.collect();
    state.collect();
    state.recharge();
    state.collect();
    state.collect();

    expect(state.snapshot()).toEqual({ score: 50, wave: 2, energy: 1 });
  });

  it('does not collect when energy is empty and can recharge it', () => {
    const state = new GameState();
    state.collect();
    state.collect();
    state.collect();

    expect(state.collect()).toEqual({ score: 30, wave: 1, energy: 0 });
    expect(state.recharge()).toEqual({ score: 30, wave: 1, energy: 3 });
  });
});
