import { NAV_CELL_SIZE, type WorldPoint, WorldManager } from './world';

type Cell = { x: number; y: number };

function key(cell: Cell): string { return `${cell.x},${cell.y}`; }
function distance(a: Cell, b: Cell): number { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function cellCenter(cell: Cell): WorldPoint { return { x: (cell.x + 0.5) * NAV_CELL_SIZE, y: (cell.y + 0.5) * NAV_CELL_SIZE }; }
function toCell(point: WorldPoint): Cell { return { x: Math.floor(point.x / NAV_CELL_SIZE), y: Math.floor(point.y / NAV_CELL_SIZE) }; }

function bounds(world: WorldManager) {
  const chunks = world.loadedChunks;
  const cellsPerChunk = world.config.chunkSize / NAV_CELL_SIZE;
  return {
    minX: Math.min(...chunks.map((chunk) => chunk.coord.x)) * cellsPerChunk,
    minY: Math.min(...chunks.map((chunk) => chunk.coord.y)) * cellsPerChunk,
    maxX: (Math.max(...chunks.map((chunk) => chunk.coord.x)) + 1) * cellsPerChunk - 1,
    maxY: (Math.max(...chunks.map((chunk) => chunk.coord.y)) + 1) * cellsPerChunk - 1,
  };
}

function inBounds(cell: Cell, limit: ReturnType<typeof bounds>): boolean {
  return cell.x >= limit.minX && cell.x <= limit.maxX && cell.y >= limit.minY && cell.y <= limit.maxY;
}

function walkable(cell: Cell, world: WorldManager): boolean {
  const center = cellCenter(cell);
  return world.isWalkable(center) && world.isWalkable({ x: center.x + 7, y: center.y + 7 }) && world.isWalkable({ x: center.x - 7, y: center.y - 7 });
}

function reconstruct(current: string, cameFrom: Map<string, string>, cells: Map<string, Cell>): WorldPoint[] {
  const path: WorldPoint[] = [];
  let cursor: string | undefined = current;
  while (cursor) {
    path.push(cellCenter(cells.get(cursor)!));
    cursor = cameFrom.get(cursor);
  }
  return path.reverse();
}

function findPathToCell(start: Cell, goal: Cell, world: WorldManager, limit: ReturnType<typeof bounds>): WorldPoint[] | undefined {
  if (!inBounds(start, limit) || !inBounds(goal, limit) || !walkable(start, world) || !walkable(goal, world)) return undefined;
  const open = new Set<string>([key(start)]);
  const cells = new Map<string, Cell>([[key(start), start], [key(goal), goal]]);
  const cameFrom = new Map<string, string>();
  const cost = new Map<string, number>([[key(start), 0]]);
  const estimate = new Map<string, number>([[key(start), distance(start, goal)]]);
  const directions = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

  while (open.size > 0) {
    let currentKey = [...open][0];
    for (const candidate of open) if ((estimate.get(candidate) ?? Infinity) < (estimate.get(currentKey) ?? Infinity)) currentKey = candidate;
    const current = cells.get(currentKey)!;
    if (currentKey === key(goal)) return reconstruct(currentKey, cameFrom, cells);
    open.delete(currentKey);
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      if (!inBounds(next, limit) || !walkable(next, world)) continue;
      const nextKey = key(next);
      cells.set(nextKey, next);
      const nextCost = (cost.get(currentKey) ?? Infinity) + 1;
      if (nextCost < (cost.get(nextKey) ?? Infinity)) {
        cameFrom.set(nextKey, currentKey);
        cost.set(nextKey, nextCost);
        estimate.set(nextKey, nextCost + distance(next, goal));
        open.add(nextKey);
      }
    }
  }
  return undefined;
}

/** Finds a four-directional route and falls back to the nearest reachable cell. */
export function findPath(start: WorldPoint, requestedTarget: WorldPoint, world: WorldManager): WorldPoint[] {
  if (world.loadedChunks.length === 0) return [start];
  const limit = bounds(world);
  const startCell = toCell(start);
  const targetCell = toCell(requestedTarget);
  const candidates: Cell[] = [];
  for (let radius = 0; radius <= 12; radius += 1) {
    for (let y = targetCell.y - radius; y <= targetCell.y + radius; y += 1) {
      for (let x = targetCell.x - radius; x <= targetCell.x + radius; x += 1) {
        if (Math.max(Math.abs(x - targetCell.x), Math.abs(y - targetCell.y)) !== radius) continue;
        candidates.push({ x, y });
      }
    }
  }
  candidates.sort((a, b) => distance(a, targetCell) - distance(b, targetCell));
  for (const candidate of candidates) {
    const route = findPathToCell(startCell, candidate, world, limit);
    if (route) return route;
  }
  return [start];
}
