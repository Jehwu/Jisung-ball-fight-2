export function checkBounce(b1, b2) {
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const dist = Math.hypot(dx, dy);
  const minDist = b1.radius + b2.radius;

  if (dist < minDist) {
    const overlap = minDist - dist;
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);

    b1.x -= nx * (overlap / 2);
    b1.y -= ny * (overlap / 2);
    b2.x += nx * (overlap / 2);
    b2.y += ny * (overlap / 2);

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
  let bounced = false;

  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx *= -1;
    bounced = true;
  } else if (ball.x + ball.radius > arenaSize) {
    ball.x = arenaSize - ball.radius;
    ball.vx *= -1;
    bounced = true;
  }

  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy *= -1;
    bounced = true;
  } else if (ball.y + ball.radius > arenaSize) {
    ball.y = arenaSize - ball.radius;
    ball.vy *= -1;
    bounced = true;
  }

  return bounced;
}
