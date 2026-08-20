import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.svelte';

const mockGame = vi.hoisted(() => ({
  mount: vi.fn(async () => {}),
  destroy: vi.fn(),
}));

vi.mock('./lib/game', () => ({ EmberfallGame: vi.fn(() => mockGame) }));

describe('App integration', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    mockGame.mount.mockClear();
    mockGame.destroy.mockClear();
  });

  it('mounts the exploration game without lumen controls', async () => {
    render(App);
    expect(await screen.findByText('EMBERFALL')).toBeInTheDocument();
    expect(mockGame.mount).toHaveBeenCalledOnce();
    expect(screen.queryByText(/lumen/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gather|recharge/i })).not.toBeInTheDocument();
    expect(screen.getByText(/rivers and trees cannot be crossed/i)).toBeInTheDocument();
  });

  it('toggles mute state through the shell control', async () => {
    render(App);
    const muteButton = screen.getByRole('button', { name: 'Mute' });
    await fireEvent.click(muteButton);
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Unmute' }));
    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument();
  });

  it('destroys the game when the component unmounts', () => {
    const { unmount } = render(App);
    unmount();
    expect(mockGame.destroy).toHaveBeenCalledOnce();
  });
});
