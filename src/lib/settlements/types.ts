import type { ChunkCoord, WorldPoint } from '../coordinates';

export type SettlementType = 'waypost' | 'hamlet' | 'village' | 'city' | 'capital';
export type RoadType = 'path' | 'dirt' | 'stone-paved' | 'highway';
export type Settlement = Readonly<{ id: string; type: SettlementType; center: WorldPoint; size: number; chunks: ReadonlyArray<ChunkCoord> }>;
export type SettlementEdge = Readonly<{ id: string; type: RoadType; from: Settlement; to: Settlement }>;
export type Road = Readonly<{ id: string; type: RoadType; from: string; to: string; points: ReadonlyArray<WorldPoint> }>;
export type SettlementFeatureKind = 'ground' | 'building' | 'street' | 'wall' | 'gate' | 'landmark' | 'farm' | 'fence';
export type SettlementFeature = Readonly<{
  id: string;
  settlementId: string;
  kind: SettlementFeatureKind;
  bounds: Readonly<{ minX: number; minY: number; maxX: number; maxY: number }>;
  points?: ReadonlyArray<WorldPoint>;
  position?: WorldPoint;
  width?: number;
  height?: number;
  rotation?: number;
  style?: string;
  roadType?: RoadType;
  blocked?: boolean;
}>;
export type SettlementFeatures = Readonly<{ settlements: ReadonlyArray<Settlement>; roads: ReadonlyArray<Road>; layout: ReadonlyArray<SettlementFeature> }>;
