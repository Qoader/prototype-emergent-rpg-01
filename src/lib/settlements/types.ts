import type { ChunkCoord, WorldPoint } from '../coordinates';

export type SettlementType = 'waypost' | 'hamlet' | 'village' | 'city' | 'capital';
export type RoadType = 'path' | 'dirt' | 'stone-paved' | 'highway';
export type Settlement = Readonly<{ id: string; type: SettlementType; center: WorldPoint; size: number; chunks: ReadonlyArray<ChunkCoord> }>;
export type SettlementEdge = Readonly<{ id: string; type: RoadType; from: Settlement; to: Settlement }>;
export type Road = Readonly<{ id: string; type: RoadType; from: string; to: string; points: ReadonlyArray<WorldPoint> }>;
export type SettlementFeatures = Readonly<{ settlements: ReadonlyArray<Settlement>; roads: ReadonlyArray<Road> }>;
