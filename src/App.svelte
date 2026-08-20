<script lang="ts">
  import { onMount } from 'svelte';
  import { EmberfallGame } from './lib/game';

  let gameHost: HTMLDivElement;
  let game: EmberfallGame;
  let muted = false;

  onMount(() => {
    game = new EmberfallGame();
    game.mount(gameHost);
    return () => game?.destroy();
  });
</script>

<svelte:head><meta name="apple-mobile-web-app-capable" content="yes" /></svelte:head>

<main class="shell">
  <div class="topbar">
    <div class="brand"><span class="brand-mark">✦</span><span>EMBERFALL</span></div>
    <button class="icon-button" aria-label={muted ? 'Unmute' : 'Mute'} onclick={() => (muted = !muted)}>{muted ? '◌' : '◉'}</button>
  </div>
  <section class="game-card" aria-label="Emberfall top-down RPG map">
    <div class="canvas-wrap" bind:this={gameHost}></div>
  </section>
  <p class="footer-note">Tap anywhere on the map to explore · Rivers and trees cannot be crossed.</p>
</main>
