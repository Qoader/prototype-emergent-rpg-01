import { CHUNK_SIZE, type WorldPoint } from '../coordinates';
import type { Settlement } from './types';

export type WorldBounds = Readonly<{
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}>;

export function settlementBounds(settlement: Settlement): WorldBounds {
  const scale = settlement.size * CHUNK_SIZE;
  return {
    minX: settlement.center.x - (scale * 0.82) / 2,
    minY: settlement.center.y - (scale * 0.72) / 2,
    maxX: settlement.center.x + (scale * 0.82) / 2,
    maxY: settlement.center.y + (scale * 0.72) / 2,
  };
}

export function settlementConnector(settlement: Settlement, toward: WorldPoint): WorldPoint {
  const dx = toward.x - settlement.center.x;
  const dy = toward.y - settlement.center.y;
  if (dx === 0 && dy === 0) return settlement.center;
  const bounds = settlementBounds(settlement);
  const scaleX =
    Math.abs(dx) > 0
      ? (dx > 0 ? bounds.maxX - settlement.center.x : bounds.minX - settlement.center.x) / dx
      : Infinity;
  const scaleY =
    Math.abs(dy) > 0
      ? (dy > 0 ? bounds.maxY - settlement.center.y : bounds.minY - settlement.center.y) / dy
      : Infinity;
  const scale = Math.min(Math.abs(scaleX), Math.abs(scaleY));
  return { x: settlement.center.x + dx * scale, y: settlement.center.y + dy * scale };
}

export function polylineIntersectsBounds(
  points: ReadonlyArray<WorldPoint>,
  bounds: WorldBounds,
  padding = 0,
): boolean {
  if (points.length === 0) return false;
  const expanded = {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  };
  for (let index = 0; index < points.length - 1; index += 1)
    if (clipSegment(points[index], points[index + 1], expanded)) return true;
  return points.some(
    (point) =>
      point.x >= expanded.minX &&
      point.x <= expanded.maxX &&
      point.y >= expanded.minY &&
      point.y <= expanded.maxY,
  );
}

export function clipPolylineToBounds(
  points: ReadonlyArray<WorldPoint>,
  bounds: WorldBounds,
  padding = 0,
): ReadonlyArray<WorldPoint> {
  if (points.length === 0) return [];
  const expanded = {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  };
  const result: WorldPoint[] = [];
  const append = (point: WorldPoint) => {
    const previous = result.at(-1);
    if (!previous || previous.x !== point.x || previous.y !== point.y) result.push(point);
  };
  for (let index = 0; index < points.length - 1; index += 1) {
    const clipped = clipSegment(points[index], points[index + 1], expanded);
    if (clipped) {
      append(clipped[0]);
      append(clipped[1]);
    }
  }
  if (points.length === 1 && polylineIntersectsBounds(points, bounds, padding)) append(points[0]);
  return result;
}

function clipSegment(
  start: WorldPoint,
  end: WorldPoint,
  bounds: WorldBounds,
): [WorldPoint, WorldPoint] | undefined {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let entering = 0;
  let leaving = 1;
  for (const [p, q] of [
    [-dx, start.x - bounds.minX],
    [dx, bounds.maxX - start.x],
    [-dy, start.y - bounds.minY],
    [dy, bounds.maxY - start.y],
  ]) {
    if (p === 0) {
      if (q < 0) return undefined;
    } else {
      const ratio = q / p;
      if (p < 0) entering = Math.max(entering, ratio);
      else leaving = Math.min(leaving, ratio);
      if (entering > leaving) return undefined;
    }
  }
  return [
    { x: start.x + entering * dx, y: start.y + entering * dy },
    { x: start.x + leaving * dx, y: start.y + leaving * dy },
  ];
}
