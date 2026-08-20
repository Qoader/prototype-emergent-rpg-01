import type { RiverSegment } from './rivers';
import type { TreeObstacle, HouseObstacle } from './obstacles';
import type { Road, Settlement } from './settlements';

/** Immutable features contributed by world generators to one chunk. */
export type ChunkFeatures = Readonly<{
  trees: ReadonlyArray<TreeObstacle>;
  settlements: ReadonlyArray<Settlement>;
  roads: ReadonlyArray<Road>;
  rivers: ReadonlyArray<RiverSegment>;
  /** @deprecated Houses are retained only for compatibility and are always empty. */
  houses: ReadonlyArray<HouseObstacle>;
}>;
