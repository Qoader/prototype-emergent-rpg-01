import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTLEMENT_CONFIG } from './settlements/config';
import { SettlementPlacementService } from './settlements/placement';
import { SettlementTopologyService } from './settlements/topology';
import { TerrainAwareRoadRouter } from './settlements/routing';
import { SettlementLayoutService } from './settlements/layout';
import type { Settlement } from './settlements/types';
import { DEFAULT_TERRAIN_CONFIG } from './terrain';

describe('settlement placement, topology, and routing', () => {
  it('deterministically produces regional quotas', () => {
    const first = new SettlementPlacementService(42, DEFAULT_TERRAIN_CONFIG, DEFAULT_SETTLEMENT_CONFIG).settlementsForRegion({ x: 0, y: 0 });
    const second = new SettlementPlacementService(42, DEFAULT_TERRAIN_CONFIG, DEFAULT_SETTLEMENT_CONFIG).settlementsForRegion({ x: 0, y: 0 });
    expect(first).toEqual(second);
    expect(first).toHaveLength(661);
  });

  it('changes placement when the world seed changes', () => {
    const first = new SettlementPlacementService(1, DEFAULT_TERRAIN_CONFIG, DEFAULT_SETTLEMENT_CONFIG).settlementsForRegion({ x: 0, y: 0 });
    const second = new SettlementPlacementService(2, DEFAULT_TERRAIN_CONFIG, DEFAULT_SETTLEMENT_CONFIG).settlementsForRegion({ x: 0, y: 0 });
    expect(first).not.toEqual(second);
  });

  it('creates parent and peer edges without duplicates', () => {
    const make = (id: string, type: Settlement['type'], x: number, y: number): Settlement => ({ id, type, center: { x, y }, size: 1, chunks: [] });
    const capital = make('capital', 'capital', 0, 0), city = make('city', 'city', 100, 0), village = make('village', 'village', 200, 0), peer = make('village-peer', 'village', 200, 100);
    const edges = new SettlementTopologyService().buildEdges([city, village, peer], [capital, city, village, peer]);
    expect(edges.map((edge) => edge.type)).toEqual(expect.arrayContaining(['highway', 'stone-paved']));
    expect(new Set(edges.map((edge) => edge.id)).size).toBe(edges.length);
  });

  it('produces deterministic non-linear road geometry', () => {
    const make = (id: string, x: number, y: number): Settlement => ({ id, type: 'village', center: { x, y }, size: 1, chunks: [] });
    const from = make('from', 0, 0), to = make('to', 1000, 300), edge = { id: 'from~to', type: 'stone-paved' as const, from, to };
    const road = new TerrainAwareRoadRouter(42, DEFAULT_TERRAIN_CONFIG).route(edge);
    expect(road.points).toHaveLength(9);
    const middle = road.points[4], start = road.points[0], end = road.points.at(-1)!;
    expect((middle.x - start.x) * (end.y - start.y)).not.toBe((middle.y - start.y) * (end.x - start.x));
  });

  it('produces deterministic full layouts with walkable streets', () => {
    const settlement: Settlement = { id: 'city:test', type: 'city', center: { x: 256, y: 256 }, size: 8, chunks: [] };
    const service = new SettlementLayoutService(42, DEFAULT_TERRAIN_CONFIG);
    const first = service.layoutFor(settlement), second = service.layoutFor(settlement);
    expect(first).toEqual(second);
    expect(first.some((feature) => feature.kind === 'building' && feature.blocked)).toBe(true);
    expect(first.some((feature) => feature.kind === 'street' && feature.blocked === false)).toBe(true);
    expect(first.some((feature) => feature.kind === 'wall')).toBe(true);
    expect(first.some((feature) => feature.kind === 'gate' && feature.blocked === false)).toBe(true);
  });

});
