import { NAV_CELL_SIZE, type WorldPoint } from './coordinates';
import type { WorldChunk } from './chunk-generator';

export interface WalkabilityMap {
  getLoadedChunks(): ReadonlyArray<WorldChunk>;
  isWalkable(point: WorldPoint): boolean;
}
export interface Navigator {
  findPath(start: WorldPoint, target: WorldPoint, world: WalkabilityMap): WorldPoint[];
}
type Cell = { x: number; y: number };
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
type WalkabilityCache = Map<string, boolean>;
const key = (cell: Cell) => `${cell.x},${cell.y}`;
const pointKey = (point: WorldPoint) => `${point.x.toFixed(4)},${point.y.toFixed(4)}`;
const distance = (a: Cell, b: Cell) => Math.hypot(a.x - b.x, a.y - b.y);
const octileDistance = (a: Cell, b: Cell) => {
  const dx = Math.abs(a.x - b.x),
    dy = Math.abs(a.y - b.y),
    diagonal = Math.min(dx, dy);
  return diagonal * Math.SQRT2 + Math.max(dx, dy) - diagonal;
};
const cellCenter = (cell: Cell): WorldPoint => ({
  x: (cell.x + 0.5) * NAV_CELL_SIZE,
  y: (cell.y + 0.5) * NAV_CELL_SIZE,
});
const toCell = (point: WorldPoint): Cell => ({
  x: Math.floor(point.x / NAV_CELL_SIZE),
  y: Math.floor(point.y / NAV_CELL_SIZE),
});
function loadedChunks(world: WalkabilityMap): ReadonlyArray<WorldChunk> {
  return world.getLoadedChunks
    ? world.getLoadedChunks()
    : ((world as WalkabilityMap & { loadedChunks?: ReadonlyArray<WorldChunk> }).loadedChunks ?? []);
}
function bounds(world: WalkabilityMap): Bounds {
  const chunks = loadedChunks(world),
    cellsPerChunk = 128 / NAV_CELL_SIZE;
  return {
    minX: Math.min(...chunks.map((chunk) => chunk.coord.x)) * cellsPerChunk,
    minY: Math.min(...chunks.map((chunk) => chunk.coord.y)) * cellsPerChunk,
    maxX: (Math.max(...chunks.map((chunk) => chunk.coord.x)) + 1) * cellsPerChunk - 1,
    maxY: (Math.max(...chunks.map((chunk) => chunk.coord.y)) + 1) * cellsPerChunk - 1,
  };
}
function inBounds(cell: Cell, limit: Bounds): boolean {
  return (
    cell.x >= limit.minX && cell.x <= limit.maxX && cell.y >= limit.minY && cell.y <= limit.maxY
  );
}
function walkablePoint(
  point: WorldPoint,
  world: WalkabilityMap,
  cache: WalkabilityCache,
): boolean {
  const cached = cache.get(pointKey(point));
  if (cached !== undefined) return cached;
  const result =
    world.isWalkable(point) &&
    world.isWalkable({ x: point.x + 7, y: point.y + 7 }) &&
    world.isWalkable({ x: point.x - 7, y: point.y - 7 });
  cache.set(pointKey(point), result);
  return result;
}
function walkable(cell: Cell, world: WalkabilityMap, cache: WalkabilityCache): boolean {
  const center = cellCenter(cell);
  return walkablePoint(center, world, cache);
}
function hasLineOfSight(
  a: Cell,
  b: Cell,
  world: WalkabilityMap,
  cache: WalkabilityCache,
): boolean {
  const start = cellCenter(a), end = cellCenter(b), length = distance(a, b) * NAV_CELL_SIZE;
  const samples = Math.ceil(length / 4);
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    if (
      !walkablePoint(
        { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t },
        world,
        cache,
      )
    )
      return false;
  }
  return true;
}
function reconstruct(
  current: string,
  cameFrom: Map<string, string | undefined>,
  cells: Map<string, Cell>,
): WorldPoint[] {
  const path: WorldPoint[] = [];
  let cursor: string | undefined = current;
  while (cursor) {
    path.push(cellCenter(cells.get(cursor)!));
    cursor = cameFrom.get(cursor);
  }
  return path.reverse();
}
function findPathToCandidates(
  start: Cell,
  candidates: ReadonlyArray<Cell>,
  world: WalkabilityMap,
  limit: Bounds,
): WorldPoint[] | undefined {
  const walkabilityCache: WalkabilityCache = new Map();
  if (!inBounds(start, limit) || !walkable(start, world, walkabilityCache)) return undefined;
  const open = new Set<string>([key(start)]),
    cells = new Map<string, Cell>([[key(start), start]]),
    cameFrom = new Map<string, string | undefined>([[key(start), undefined]]),
    cost = new Map<string, number>([[key(start), 0]]),
    estimate = new Map<string, number>([[key(start), octileDistance(start, candidates[0])]]),
    expanded = new Set<string>();
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
  ];
  const maxExpansions = (limit.maxX - limit.minX + 1) * (limit.maxY - limit.minY + 1);
  while (open.size > 0 && expanded.size < maxExpansions) {
    let currentKey = [...open][0];
    for (const candidate of open)
      if (
        (estimate.get(candidate) ?? Infinity) < (estimate.get(currentKey) ?? Infinity) ||
        ((estimate.get(candidate) ?? Infinity) === (estimate.get(currentKey) ?? Infinity) &&
          (cost.get(candidate) ?? Infinity) > (cost.get(currentKey) ?? Infinity))
      )
        currentKey = candidate;
    const current = cells.get(currentKey)!;
    open.delete(currentKey);
    expanded.add(currentKey);
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      if (!inBounds(next, limit) || !walkable(next, world, walkabilityCache)) continue;
      const nextKey = key(next);
      if (expanded.has(nextKey)) continue;
      cells.set(nextKey, next);
      const parentKey = cameFrom.get(currentKey);
      const throughParent =
        parentKey !== undefined &&
        hasLineOfSight(cells.get(parentKey)!, next, world, walkabilityCache)
          ? parentKey
          : currentKey;
      const stepCost = distance(cells.get(throughParent)!, next);
      const nextCost = (cost.get(throughParent) ?? Infinity) + stepCost;
      if (nextCost < (cost.get(nextKey) ?? Infinity)) {
        cameFrom.set(nextKey, throughParent);
        cost.set(nextKey, nextCost);
        estimate.set(nextKey, nextCost + octileDistance(next, candidates[0]));
        open.add(nextKey);
      }
    }
  }
  const reachable = candidates
    .filter((candidate) => cost.has(key(candidate)))
    .sort((a, b) => {
      const targetDistance = distance(a, candidates[0]) - distance(b, candidates[0]);
      return targetDistance || cost.get(key(a))! - cost.get(key(b))!;
    });
  return reachable.length > 0 ? reconstruct(key(reachable[0]), cameFrom, cells) : undefined;
}

export class AStarNavigator implements Navigator {
  findPath(start: WorldPoint, requestedTarget: WorldPoint, world: WalkabilityMap): WorldPoint[] {
    const chunks = loadedChunks(world);
    if (chunks.length === 0) return [start];
    const limit = bounds(world),
      startCell = toCell(start),
      targetCell = toCell(requestedTarget),
      candidates: Cell[] = [];
    for (let radius = 0; radius <= 12; radius += 1)
      for (let y = targetCell.y - radius; y <= targetCell.y + radius; y += 1)
        for (let x = targetCell.x - radius; x <= targetCell.x + radius; x += 1)
          if (Math.max(Math.abs(x - targetCell.x), Math.abs(y - targetCell.y)) === radius)
            candidates.push({ x, y });
    candidates.sort((a, b) => distance(a, targetCell) - distance(b, targetCell));
    return findPathToCandidates(startCell, candidates, world, limit) ?? [start];
  }
}
export function findPath(
  start: WorldPoint,
  target: WorldPoint,
  world: WalkabilityMap,
): WorldPoint[] {
  return new AStarNavigator().findPath(start, target, world);
}
