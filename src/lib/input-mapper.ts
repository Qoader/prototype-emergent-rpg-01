import type { Point } from './movement';
export function screenToWorld(point: Point, camera: { x: number; y: number }, zoom: number): Point { return { x: (point.x - camera.x) / zoom, y: (point.y - camera.y) / zoom }; }
