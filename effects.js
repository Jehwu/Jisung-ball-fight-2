export function invertColor(hex) {
  if (!hex || hex[0] !== '#') return '#ffffff';
  let r = 255 - parseInt(hex.slice(1, 3), 16);
  let g = 255 - parseInt(hex.slice(3, 5), 16);
  let b = 255 - parseInt(hex.slice(5, 7), 16);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function distToSegment(p, v, w) {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

export function drawHexagonFrame(hCtx, logicalW, logicalH, charData, scaleProgress, isDark) {
  const centerX = logicalW / 2;
  const centerY = logicalH / 2 + 2;
  const radius = 45;

  const labels = ['공격', '방어', '속도', '공격속도', '궁극', '유틸'];
  const keys = ['atk', 'def', 'spd', 'cool', 'ult', 'utl'];
  const stats = charData.stats;

  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)';
  const axisColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.2)';
  const labelTextColor = isDark ? '#8a8f9d' : '#475569';

  for (let level = 1; level <= 4; level++) {
    const r = (radius / 4) * level;
    hCtx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      if (i === 0) hCtx.moveTo(x, y);
      else hCtx.lineTo(x, y);
    }
    hCtx.closePath();
    hCtx.strokeStyle = gridColor;
    hCtx.stroke();
  }

  hCtx.font = 'bold 8px "NeoDunggeunmo", sans-serif';
  hCtx.textAlign = 'center';
  hCtx.textBaseline = 'middle';
  hCtx.fillStyle = labelTextColor;

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const lx = centerX + (radius + 14) * Math.cos(angle);
    const ly = centerY + (radius + 14) * Math.sin(angle);
    hCtx.fillText(labels[i], lx, ly);

    hCtx.beginPath();
    hCtx.moveTo(centerX, centerY);
    hCtx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
    hCtx.strokeStyle = axisColor;
    hCtx.stroke();
  }

  hCtx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const val = ((stats[keys[i]] || 50) / 100) * scaleProgress;
    const px = centerX + radius * val * Math.cos(angle);
    const py = centerY + radius * val * Math.sin(angle);
    if (i === 0) hCtx.moveTo(px, py);
    else hCtx.lineTo(px, py);
  }
  hCtx.closePath();

  hCtx.fillStyle = charData.color + '44';
  hCtx.fill();
  hCtx.strokeStyle = charData.color;
  hCtx.lineWidth = 2;
  hCtx.stroke();
}