export type Point = { x: number; y: number };

export type MovementResult = {
  position: Point;
  arrived: boolean;
};

/** Advances a character toward a map destination without overshooting it. */
export function advanceTowards(
  current: Point,
  target: Point,
  speed: number,
  deltaSeconds: number,
): MovementResult {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.hypot(dx, dy);
  const step = Math.max(0, speed * deltaSeconds);

  if (distance === 0 || distance <= step) {
    return { position: { x: target.x, y: target.y }, arrived: true };
  }

  return {
    position: {
      x: current.x + (dx / distance) * step,
      y: current.y + (dy / distance) * step,
    },
    arrived: false,
  };
}
