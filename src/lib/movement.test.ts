import { describe, expect, it } from 'vitest';
import { advanceTowards } from './movement';

describe('advanceTowards', () => {
  it('moves the character toward a map destination at the requested speed', () => {
    expect(advanceTowards({ x: 0, y: 0 }, { x: 100, y: 0 }, 50, 1)).toEqual({
      position: { x: 50, y: 0 },
      arrived: false,
    });
  });

  it('stops exactly at the destination instead of overshooting it', () => {
    expect(advanceTowards({ x: 0, y: 0 }, { x: 30, y: 40 }, 100, 1)).toEqual({
      position: { x: 30, y: 40 },
      arrived: true,
    });
  });

  it('reports arrival when the character is already at the tapped position', () => {
    expect(advanceTowards({ x: 12, y: 8 }, { x: 12, y: 8 }, 150, 1)).toEqual({
      position: { x: 12, y: 8 },
      arrived: true,
    });
  });
});
