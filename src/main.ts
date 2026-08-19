import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

const app = document.getElementById('app');
if (!app) throw new Error('App mount element was not found.');
mount(App, { target: app });
