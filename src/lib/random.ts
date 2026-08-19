import type { WorldPoint } from './coordinates';

export function seededHash(seed: number, x: number, y: number, salt: number): number {
  let value = (seed ^ Math.imul(x, 0x45d9f3b) ^ Math.imul(y, 0x119de1f3) ^ salt) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x27d4eb2d);
  return ((value ^ (value >>> 15)) >>> 0) / 0x100000000;
}

export function heightAt(point: WorldPoint, seed: number): number {
  const broad = Math.sin((point.x + seed * 0.17) / 720) * 0.22 + Math.cos((point.y - seed * 0.11) / 910) * 0.2;
  const detail = Math.sin((point.x + point.y) / 190 + seed) * 0.06 + Math.cos((point.x - point.y) / 260) * 0.05;
  return 0.52 + broad + detail;
}
