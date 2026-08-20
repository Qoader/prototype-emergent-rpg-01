import type { Biome } from './terrain';
import type { WorldPoint } from './coordinates';
import type { HouseObstacle, TreeObstacle } from './obstacles';
import type { RiverSegment } from './rivers';
import type { SettlementFeature } from './settlements';
import type { WorldConfig } from './world-config';

export type CollisionSource = Readonly<{
  biome: Biome;
  trees: ReadonlyArray<TreeObstacle>;
  houses: ReadonlyArray<HouseObstacle>;
  layout?: ReadonlyArray<SettlementFeature>;
  rivers: ReadonlyArray<RiverSegment>;
}>;

export interface CollisionService {
  isBlocked(
    point: WorldPoint,
    source: CollisionSource,
    config: Partial<WorldConfig> & Pick<WorldConfig, 'seed'>,
  ): boolean;
}
