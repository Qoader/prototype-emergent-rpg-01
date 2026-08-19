<script lang="ts">
  import { onMount } from 'svelte';
  import { EmberfallGame, type GameSnapshot } from './lib/game';

  let gameHost: HTMLDivElement;
  let game: EmberfallGame;
  let snapshot: GameSnapshot = { score: 0, wave: 1, energy: 3 };
  let muted = false;

  onMount(() => {
    game = new EmberfallGame();
    game.mount(gameHost, (next) => (snapshot = next));
    return () => game?.destroy();
  });
</script>

<svelte:head><meta name="apple-mobile-web-app-capable" content="yes" /></svelte:head>

<main class="shell">
  <div class="topbar">
    <div class="brand"><span class="brand-mark">✦</span><span>EMBERFALL</span></div>
    <button class="icon-button" aria-label={muted ? 'Unmute' : 'Mute'} onclick={() => (muted = !muted)}>{muted ? '◌' : '◉'}</button>
  </div>
  <section class="game-card" aria-label="Emberfall game">
    <div class="canvas-wrap" bind:this={gameHost}></div>
    <div class="hud">
      <div class="stat"><span class="label">SCORE</span><span class="value">{String(snapshot.score).padStart(4, '0')}</span></div>
      <div class="wave"><span class="label">WAVE</span><span class="value">{String(snapshot.wave).padStart(2, '0')}</span></div>
      <div class="energy"><span class="label">LUMEN</span><span class="energy-dots">{#each [0, 1, 2] as dot}<span class:spent={dot >= snapshot.energy}>✦</span>{/each}</span></div>
    </div>
  </section>
  <section class="controls">
    <button class="gather" onclick={() => game?.collect()}><span>GATHER LUMEN</span><small>tap the wild crystals</small></button>
    <button class="recharge" onclick={() => game?.recharge()} aria-label="Recharge lumen">↻</button>
  </section>
  <p class="footer-note">The wild remembers every spark.</p>
</main>
