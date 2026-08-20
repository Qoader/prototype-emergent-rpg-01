import type { RoadType, SettlementType } from './types';

export type SettlementTemplate = Readonly<{ roadType: RoadType; streetWidth: number; buildingCount: number; spokeCount: number; hasWalls: boolean; hasLandmark: boolean; hasFarm: boolean }>;
export const SETTLEMENT_TEMPLATES: Readonly<Record<SettlementType, SettlementTemplate>> = {
  waypost: { roadType: 'path', streetWidth: 5, buildingCount: 1, spokeCount: 0, hasWalls: false, hasLandmark: false, hasFarm: false },
  hamlet: { roadType: 'dirt', streetWidth: 8, buildingCount: 6, spokeCount: 2, hasWalls: false, hasLandmark: true, hasFarm: true },
  village: { roadType: 'stone-paved', streetWidth: 11, buildingCount: 16, spokeCount: 3, hasWalls: false, hasLandmark: true, hasFarm: true },
  city: { roadType: 'stone-paved', streetWidth: 16, buildingCount: 40, spokeCount: 4, hasWalls: true, hasLandmark: false, hasFarm: false },
  capital: { roadType: 'stone-paved', streetWidth: 20, buildingCount: 72, spokeCount: 8, hasWalls: true, hasLandmark: true, hasFarm: false }
};

export function settlementTemplate(type: SettlementType): SettlementTemplate { return SETTLEMENT_TEMPLATES[type]; }
