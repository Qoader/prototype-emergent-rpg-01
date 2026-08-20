export type ObstacleConfig = {
  treeMargin: number;
  forestTreeCount: number;
  plainsTreeBase: number;
  plainsTreeVariance: number;
  forestTreeRadius: number;
  plainsTreeRadius: number;
  houseChance: number;
  houseX: number;
  houseY: number;
  houseWidth: number;
  houseHeight: number;
  riverCollisionWidth: number;
};

export const DEFAULT_OBSTACLE_CONFIG: ObstacleConfig = {
  treeMargin: 16,
  forestTreeCount: 7,
  plainsTreeBase: 2,
  plainsTreeVariance: 3,
  forestTreeRadius: 13,
  plainsTreeRadius: 11,
  houseChance: 0.65,
  houseX: 38,
  houseY: 42,
  houseWidth: 52,
  houseHeight: 38,
  riverCollisionWidth: 12,
};
