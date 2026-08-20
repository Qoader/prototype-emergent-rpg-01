import type { SettlementType, RoadType } from './types';

export type SettlementDefinition = Readonly<{
  type: SettlementType;
  count: number;
  size: number;
  gridSide: number;
  salt: number;
}>;
export type SettlementConfig = Readonly<{
  regionChunkSpan: number;
  placementAttempts: number;
  queryRadius: number;
  definitions: ReadonlyArray<SettlementDefinition>;
}>;
export const DEFAULT_SETTLEMENT_CONFIG: SettlementConfig = {
  regionChunkSpan: 200,
  placementAttempts: 24,
  queryRadius: 4096,
  definitions: [
    { type: 'capital', count: 1, size: 16, gridSide: 1, salt: 1100 },
    { type: 'city', count: 10, size: 8, gridSide: 5, salt: 1200 },
    { type: 'village', count: 50, size: 4, gridSide: 10, salt: 1300 },
    { type: 'hamlet', count: 200, size: 2, gridSide: 20, salt: 1400 },
    { type: 'waypost', count: 400, size: 1, gridSide: 20, salt: 1500 },
  ],
};
export const ROAD_FOR: Readonly<Record<SettlementType, RoadType | undefined>> = {
  capital: undefined,
  city: 'highway',
  village: 'stone-paved',
  hamlet: 'dirt',
  waypost: 'path',
};
