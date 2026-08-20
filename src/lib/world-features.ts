import type { RiverSegment } from './rivers';
import type { TreeObstacle, HouseObstacle } from './obstacles';
import type { Road, Settlement, SettlementFeature } from './settlements';

/** Immutable features contributed by world generators to one chunk. */
export type ChunkFeatures = Readonly<{
  trees: ReadonlyArray<TreeObstacle>;
  settlements: ReadonlyArray<Settlement>;
  roads: ReadonlyArray<Road>;
  layout: ReadonlyArray<SettlementFeature>;
  rivers: ReadonlyArray<RiverSegment>;
  /** @deprecated Houses are retained only for compatibility and are always empty. */
  houses: ReadonlyArray<HouseObstacle>;
}>;
