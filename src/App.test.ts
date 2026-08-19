import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.svelte';

const mockGame = vi.hoisted(() => ({
  mount: vi.fn(async (_host: HTMLElement, onChange: (snapshot: { score: number; wave: number; energy: number }) => void) => {
    onChange({ score: 0, wave: 1, energy: 3 });
  }),
  collect: vi.fn(),
  recharge: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock('./lib/game', () => ({
  EmberfallGame: vi.fn(() => mockGame),
}));

describe('App integration', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mockGame.mount.mockClear();
    mockGame.collect.mockClear();
    mockGame.recharge.mockClear();
    mockGame.destroy.mockClear();
  });

  it('mounts the game and exposes the HUD controls', async () => {
    render(App);

    expect(await screen.findByText('EMBERFALL')).toBeInTheDocument();
    expect(mockGame.mount).toHaveBeenCalledOnce();
    expect(screen.getByText('0000')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
  });

  it('delegates gather and recharge actions to the game engine', async () => {
    render(App);

    await fireEvent.click(screen.getByRole('button', { name: /gather lumen/i }));
    await fireEvent.click(screen.getByRole('button', { name: /recharge lumen/i }));

    expect(mockGame.collect).toHaveBeenCalledOnce();
    expect(mockGame.recharge).toHaveBeenCalledOnce();
  });
});
