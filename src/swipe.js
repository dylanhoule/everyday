// Pure gesture decision — no DOM, so it's testable in plain node.
// ponytail: naive pointer heuristic; swap for a gesture lib if edge cases pile up.

export const TAP_SLOP = 8; // px of movement below which it's still a tap
export const DELETE_DX = 80; // leftward px past which a swipe deletes

// dx, dy = total movement from pointer start.
export function classifyGesture(dx, dy, tapSlop = TAP_SLOP) {
  if (Math.abs(dx) < tapSlop && Math.abs(dy) < tapSlop) return 'tap';
  return Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'scroll';
}

export function shouldDelete(dx, threshold = DELETE_DX) {
  return dx <= -threshold; // leftward only
}
