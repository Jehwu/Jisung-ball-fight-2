export function checkBounce(b1, b2) {
  if (b1.isEaten || b2.isEaten) return false;

  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const dist = Math.hypot(dx, dy);
  const minDist = b1.radius + b2.radius;

  if (dist < minDist) {
    const overlap = minDist - dist;
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);

    b1.x -= nx * overlap * 0.5;
    b1.y -= ny * overlap * 0.5;
    b2.x += nx * overlap * 0.5;
    b2.y += ny * overlap * 0.5;

    if (b1.isDashing || b2.isDashing) return true;

    const kx = b1.vx - b2.vx;
    const ky = b1.vy - b2.vy;
    const p = 2 * (nx * kx + ny * ky) / 2;

    b1.vx -= p * nx;
    b1.vy -= p * ny;
    b2.vx += p * nx;
    b2.vy += p * ny;

    return true;
  }
  return false;
}

export function handleWallBounce(ball, arenaSize) {
  let hit = false;

  if (ball.x - ball.radius < 0) { ball.x = ball.radius; ball.vx *= -1; hit = true; }
  if (ball.x + ball.radius > arenaSize) { ball.x = arenaSize - ball.radius; ball.vx *= -1; hit = true; }
  if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.vy *= -1; hit = true; }
  if (ball.y + ball.radius > arenaSize) { ball.y = arenaSize - ball.radius; ball.vy *= -1; hit = true; }

  const maxSpd = ball.wallDebuffTimer > 0 ? 10.0 : 1.8;
  const currentSpeed = Math.hypot(ball.vx, ball.vy);

  if (currentSpeed > maxSpd && !ball.isDashing) {
    ball.vx = (ball.vx / currentSpeed) * maxSpd;
    ball.vy = (ball.vy / currentSpeed) * maxSpd;
  }

  return hit;
}
