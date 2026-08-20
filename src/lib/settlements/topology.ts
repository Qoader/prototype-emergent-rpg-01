import { ROAD_FOR } from './config';
import type { RoadType, Settlement, SettlementEdge, SettlementType } from './types';

const distance = (a: Settlement, b: Settlement) => Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y);
export class SettlementTopologyService {
  private readonly cache = new Map<string, ReadonlyArray<SettlementEdge>>();
  buildEdges(sources: ReadonlyArray<Settlement>, universe: ReadonlyArray<Settlement>): ReadonlyArray<SettlementEdge> {
    const cacheKey = sources.map((source) => source.id).sort().join('|'), cached = this.cache.get(cacheKey); if (cached) return cached;
    const byType = new Map<SettlementType, Settlement[]>();
    for (const node of universe) { const list = byType.get(node.type) ?? []; list.push(node); byType.set(node.type, list); }
    const edges: SettlementEdge[] = [], ids = new Set<string>();
    const connect = (from: Settlement, to: Settlement, type: RoadType | undefined) => { if (!type) return; const id = [from.id, to.id].sort().join('~'); if (!ids.has(id)) { ids.add(id); edges.push({ id, type, from, to }); } };
    for (const node of sources) {
      const parentType: SettlementType | undefined = node.type === 'city' ? 'capital' : node.type === 'village' ? 'city' : node.type === 'hamlet' ? 'village' : node.type === 'waypost' ? 'village' : undefined;
      const parents = parentType ? byType.get(parentType) ?? [] : [];
      if (parents.length) connect(node, parents.reduce((nearest, item) => distance(node, item) < distance(node, nearest) ? item : nearest), ROAD_FOR[node.type]);
      const peers = (byType.get(node.type) ?? []).filter((peer) => peer.id !== node.id).sort((a, b) => distance(node, a) - distance(node, b)).slice(0, 2);
      for (const peer of peers) connect(node, peer, ROAD_FOR[node.type]);
    }
    this.cache.set(cacheKey, edges); return edges;
  }
}
