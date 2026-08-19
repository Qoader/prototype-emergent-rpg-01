import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const base = process.env.VITE_BASE_PATH ?? '/prototype-emergent-rpg-01/';

export default defineConfig({ base, plugins: [svelte()] });
