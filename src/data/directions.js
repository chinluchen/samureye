export const directions = [
  { id: 'right', deg: 0 },
  { id: 'down-right', deg: 45 },
  { id: 'down', deg: 90 },
  { id: 'down-left', deg: 135 },
  { id: 'left', deg: 180 },
  { id: 'up-left', deg: 225 },
  { id: 'up', deg: 270 },
  { id: 'up-right', deg: 315 }
];

export function directionFromSwipe(dx, dy) {
  let angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle < 0) angle += 360;

  return directions[Math.round(angle / 45) % directions.length];
}
