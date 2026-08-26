import { CHAR_DB } from './characters.js';
import { checkBounce } from './physics.js';
import { Ball } from './ball.js';
import { 
  bgm, clickPool, sofaDropPool, parkShootPool, poopTrapPool, poopEatPool, 
  gaeunCutPool, playBounceSfx, playBGM, stopBGM,
  criminalParryPool, criminalBombPool
} from './audio.js';
import { distToSegment, drawHexagonFrame } from './effects.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlayMsg = document.getElementById('overlay-msg');

const ARENA_SIZE = 300;
const dpr = Math.max(window.devicePixelRatio || 1, 2);

canvas.width = ARENA_SIZE * dpr;
canvas.height = ARENA_SIZE * dpr;
canvas.style.width = ARENA_SIZE + 'px';
canvas.style.height = ARENA_SIZE + 'px';
ctx.scale(dpr, dpr);

let gameState = 'IDLE';
let shakeTimer = 0;
let skillEffects = [];
let floatingTexts = [];
let projectiles = [];
let landedPoops = [];

let selectedP1Key = 'KIM';
let selectedP2Key = 'GONG';
let currentDictKey = 'KIM';
let dictAnimFrame = null;
let animFrameId = null;

let lastTime = performance.now();
const fpsInterval = 1000 / 60;
let countdownStartTime = 0;

function isDarkTheme() {
  const container = document.getElementById('game-container');
  return container ? container.classList.contains('dark-theme') : true;
}

function triggerShake(val) { shakeTimer = Math.max(shakeTimer, val); }

const p1 = new Ball(75, 150, 20);
const p2 = new Ball(225, 150, 20);

function triggerDeathExplosion(ball) {
  for (let i = 0; i < 22; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * 5 + 2;
    skillEffects.push({
      type: 'DEATH_POP',
      x: ball.x,
      y: ball.y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      radius: Math.random() * 5 + 3,
      color: ball.color || '#ff3344',
      life: 28,
      maxLife: 28
    });
  }
}

function applyDamage(target, amount) {
  if (gameState !== 'PLAYING') return;

  if (target.counterStanceTimer > 0 && amount > 0) {
    criminalParryPool.play();
    target.counterStanceTimer = 0;
    const enemy = (target === p1) ? p2 : p1;

    const oldX = target.x;
    const oldY = target.y;

    const enemyAngle = Math.atan2(enemy.vy, enemy.vx) || 0;
    const tpAngle = enemyAngle + Math.PI;
    target.x = Math.max(30, Math.min(ARENA_SIZE - 30, enemy.x + Math.cos(tpAngle) * 35));
    target.y = Math.max(30, Math.min(ARENA_SIZE - 30, enemy.y + Math.sin(tpAngle) * 35));

    triggerShake(12);

    skillEffects.push({
      type: 'ROSE_DOLL_BOMB',
      x: oldX,
      y: oldY,
      radius: 115,
      damage: 35,
      target: enemy,
      owner: target,
      life: 120,
      maxLife: 120
    });
    return;
  }

  target.hp = Math.max(0, target.hp - amount);
  updateHUD();

  if (target.hp <= 0) {
    triggerDeathExplosion(target);
    endGame();
  }
}

function addFloatingText(x, y, text, color = '#ff3344') {
  floatingTexts.push({ x, y, text, color, alpha: 1.0 });
}

function updateHUD() {
  document.getElementById('p1-hp-fill').style.width = `${(p1.hp / p1.maxHp) * 100}%`;
  document.getElementById('p1-hp-text').innerText = `${p1.hp}/${p1.maxHp}`;
  document.getElementById('p2-hp-fill').style.width = `${(p2.hp / p2.maxHp) * 100}%`;
  document.getElementById('p2-hp-text').innerText = `${p2.hp}/${p2.maxHp}`;

  document.getElementById('p1-skill-fill').style.width = `${p1.skillCool}%`;
  document.getElementById('p2-skill-fill').style.width = `${p2.skillCool}%`;

  const p1UltPct = p1.data ? Math.min(100, (p1.ultCharge / p1.data.maxUltCharge) * 100) : 0;
  const p2UltPct = p2.data ? Math.min(100, (p2.ultCharge / p2.data.maxUltCharge) * 100) : 0;
  document.getElementById('p1-ult-fill').style.width = `${p1UltPct}%`;
  document.getElementById('p2-ult-fill').style.width = `${p2UltPct}%`;
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  if (screenId === 'screen-game') stopBGM();
  else playBGM();
}

function toggleTheme() {
  const container = document.getElementById('game-container');
  if (container.classList.contains('dark-theme')) {
    container.classList.remove('dark-theme');
    container.classList.add('light-theme');
  } else {
    container.classList.remove('light-theme');
    container.classList.add('dark-theme');
  }
  const dictScreen = document.getElementById('screen-dict');
  if (dictScreen && dictScreen.classList.contains('active')) {
    updateDictionaryUI(currentDictKey);
  }
}

function animateHexagonChart(charData) {
  if (dictAnimFrame) cancelAnimationFrame(dictAnimFrame);
  const hexCanvas = document.getElementById('hexagonCanvas');
  const hCtx = hexCanvas.getContext('2d');
  
  const logicalW = 170;
  const logicalH = 140;
  hexCanvas.width = logicalW * dpr;
  hexCanvas.height = logicalH * dpr;
  hexCanvas.style.width = logicalW + 'px';
  hexCanvas.style.height = logicalH + 'px';

  let frameCount = 0;
  function step() {
    frameCount++;
    const t = Math.min(1, frameCount / 22);
    const easeT = 1 - Math.pow(1 - t, 3);

    hCtx.save();
    hCtx.scale(dpr, dpr);
    hCtx.clearRect(0, 0, logicalW, logicalH);
    drawHexagonFrame(hCtx, logicalW, logicalH, charData, easeT, isDarkTheme());
    hCtx.restore();

    if (frameCount < 22) dictAnimFrame = requestAnimationFrame(step);
  }
  step();
}

function updateDictionaryUI(key) {
  const data = CHAR_DB[key];
  if (!data) return;

  document.getElementById('dict-name').innerText = `${data.emoji} ${data.name}`;
  document.getElementById('dict-desc').innerText = data.desc;
  document.getElementById('dict-basic-skill').innerText = `${data.basic.name} (DMG ${data.basic.damage})`;
  document.getElementById('dict-ult-skill').innerText = `${data.ult.name} (DMG ${data.ult.damage})`;

  const dictCard = document.querySelector('.dict-card');
  if (dictCard) {
    dictCard.style.animation = 'none';
    dictCard.offsetHeight;
    dictCard.style.animation = 'slideInLeft 0.3s ease-out';
  }
  animateHexagonChart(data);
}

function startBattle() {
  const isMirrorMatch = (selectedP1Key === selectedP2Key);
  p1.init(CHAR_DB[selectedP1Key], false, false);
  p2.init(CHAR_DB[selectedP2Key], true, isMirrorMatch);

  document.getElementById('p1-name-display').innerText = `${p1.data.emoji} ${p1.data.name}`;
  document.getElementById('p2-name-display').innerText = `${p2.data.emoji} ${p2.data.name}`;

  showScreen('screen-game');
  startCountdown();
}

function startCountdown() {
  gameState = 'COUNTDOWN';
  countdownStartTime = Date.now();
  p1.reset();
  p2.reset();
  skillEffects = [];
  floatingTexts = [];
  projectiles = [];
  landedPoops = [];
  updateHUD();

  let count = 3;
  showOverlay(count);

  const timer = setInterval(() => {
    count--;
    if (count > 0) showOverlay(count);
    else if (count === 0) showOverlay('START!');
    else {
      clearInterval(timer);
      hideOverlay();
      gameState = 'PLAYING';
    }
  }, 600);
}

function endGame() {
  gameState = 'GAMEOVER';
  const winner = p1.hp > 0 ? p1 : p2;
  winner.isWinner = true;
  showOverlay(`👑 ${winner.data.name} 승리!`);
  setTimeout(() => showScreen('screen-char'), 2500);
}

function showOverlay(msg) { overlayMsg.innerText = msg; overlayMsg.classList.add('active'); }
function hideOverlay() { overlayMsg.classList.remove('active'); }

function loop(now) {
  animFrameId = requestAnimationFrame(loop);

  if (!now) now = performance.now();
  const elapsed = now - lastTime;
  if (elapsed < fpsInterval) return;
  lastTime = now - (elapsed % fpsInterval);

  if (skillEffects.length > 120) {
    skillEffects.splice(0, skillEffects.length - 120);
  }

  ctx.save();
  if (shakeTimer > 0) {
    ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    shakeTimer--;
  }

  ctx.clearRect(0, 0, ARENA_SIZE, ARENA_SIZE);

  const isDark = isDarkTheme();
  ctx.strokeStyle = isDark ? '#121520' : '#e2e8f0';
  ctx.lineWidth = 1;
  for (let x = 0; x < ARENA_SIZE; x += 20) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_SIZE); ctx.stroke();
  }
  for (let y = 0; y < ARENA_SIZE; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA_SIZE, y); ctx.stroke();
  }

  if (gameState === 'PLAYING' || gameState === 'COUNTDOWN' || gameState === 'GAMEOVER') {
    if (p1.isFurryBurst || p2.isFurryBurst) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, ARENA_SIZE, ARENA_SIZE);
    }

    p1.update(p2, gameState, applyDamage, addFloatingText, skillEffects, projectiles, ARENA_SIZE, triggerShake);
    p2.update(p1, gameState, applyDamage, addFloatingText, skillEffects, projectiles, ARENA_SIZE, triggerShake);

    if (gameState === 'PLAYING') {
      if (checkBounce(p1, p2)) playBounceSfx();
      updateHUD();
    }

    for (let i = landedPoops.length - 1; i >= 0; i--) {
      const poop = landedPoops[i];
      ctx.font = 'bold 16px "NeoDunggeunmo", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💩', poop.x, poop.y);

      if (gameState === 'PLAYING') {
        const enemy = poop.owner === p1 ? p2 : p1;
        const owner = poop.owner;

        if (Math.hypot(enemy.x - poop.x, enemy.y - poop.y) < enemy.radius + 8) {
          poopTrapPool.play();
          applyDamage(enemy, poop.damage);
          addFloatingText(enemy.x, enemy.y - 15, `-${poop.damage}`, '#ff3344');
          triggerShake(12);

          skillEffects.push({ type: 'MUSHROOM_CLOUD', x: poop.x, y: poop.y, life: 30, maxLife: 30 });

          for (let p = 0; p < 14; p++) {
            const expAngle = Math.random() * Math.PI * 2;
            const expSpd = Math.random() * 6 + 2;
            skillEffects.push({
              type: 'DEATH_POP',
              x: poop.x,
              y: poop.y,
              vx: Math.cos(expAngle) * expSpd,
              vy: Math.sin(expAngle) * expSpd,
              radius: Math.random() * 5 + 2,
              color: Math.random() < 0.5 ? '#ff3344' : '#ff9f43',
              life: 20,
              maxLife: 20
            });
          }

          landedPoops.splice(i, 1);
          continue;
        }

        if (Math.hypot(owner.x - poop.x, owner.y - poop.y) < owner.radius + 8) {
          poopEatPool.play();
          owner.hp = Math.min(owner.maxHp, owner.hp + 13);
          owner.ultCharge = Math.min(owner.data.maxUltCharge, owner.ultCharge + 1);
          addFloatingText(owner.x, owner.y - 15, '+13 HP', '#55efc4');
          skillEffects.push({ type: 'MUSHROOM_CLOUD', x: poop.x, y: poop.y, life: 30, maxLife: 30 });
          landedPoops.splice(i, 1);
          continue;
        }
      }
    }

    for (let i = skillEffects.length - 1; i >= 0; i--) {
      const ef = skillEffects[i];

      if (ef.type === 'DUST') {
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI * 2);
        ctx.fillStyle = ef.color;
        ctx.fill();
        ef.life -= 1;
      } 
      else if (ef.type === 'COOLDOWN_ORB') {
        ef.x += (ef.owner.x - ef.x) * 0.15;
        ef.y += (ef.owner.y - ef.y) * 0.15;

        ef.trailHistory.push({ x: ef.x, y: ef.y });
        if (ef.trailHistory.length > 10) ef.trailHistory.shift();

        ctx.save();
        ctx.beginPath();
        for (let t = 0; t < ef.trailHistory.length; t++) {
          const pt = ef.trailHistory[t];
          if (t === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ef.x, ef.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();

        if (Math.hypot(ef.owner.x - ef.x, ef.owner.y - ef.y) < 14) {
          ef.owner.skillCool = Math.min(100, ef.owner.skillCool + (0.65 * 60 * ef.owner.data.coolSpeed));
          ef.life = 0;
        }
      }
      else if (ef.type === 'ROSE_DOLL_BOMB') {
        const fuseProgress = 1 - (ef.life / ef.maxLife);
        ctx.save();
        ctx.translate(ef.x, ef.y);

        ctx.beginPath();
        ctx.arc(0, 0, ef.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 52, 80, ${0.35 + fuseProgress * 0.65})`;
        ctx.lineWidth = 2 + fuseProgress * 2.5;
        ctx.shadowColor = '#ff3450';
        ctx.shadowBlur = 10;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, ef.radius * fuseProgress, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 52, 80, ${0.15 + fuseProgress * 0.25})`;
        ctx.fill();

        const shakeOffset = fuseProgress > 0.6 ? (Math.random() - 0.5) * (fuseProgress * 7) : 0;
        const pulseScale = 1 + Math.sin(fuseProgress * Math.PI * 10) * (0.12 * fuseProgress);

        ctx.translate(shakeOffset, shakeOffset);
        ctx.scale(pulseScale, pulseScale);

        ctx.strokeStyle = '#3d2314';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, 20); ctx.lineTo(0, -22);
        ctx.moveTo(-18, -6); ctx.lineTo(18, -6);
        ctx.stroke();

        ctx.fillStyle = '#141419';
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.lineTo(14, -4); ctx.lineTo(11, 18);
        ctx.lineTo(5, 12); ctx.lineTo(0, 19); ctx.lineTo(-5, 12);
        ctx.lineTo(-11, 18); ctx.lineTo(-14, -4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#d63031';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#2d3436';
        ctx.beginPath();
        ctx.moveTo(0, -25); ctx.lineTo(9, -13); ctx.lineTo(0, -7); ctx.lineTo(-9, -13);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ff1744';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(-6, -15); ctx.lineTo(-2, -13); ctx.lineTo(-5, -12); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(6, -15); ctx.lineTo(2, -13); ctx.lineTo(5, -12); ctx.closePath(); ctx.fill();

        ctx.restore();

        ef.life -= 1;
        if (ef.life <= 0) {
          triggerShake(28);
          criminalBombPool.play();

          skillEffects.push({ type: 'GUNPOWDER_EXPLOSION', x: ef.x, y: ef.y, targetRadius: ef.radius, life: 30, maxLife: 30 });

          for (let p = 0; p < 16; p++) {
            const petalAngle = Math.random() * Math.PI * 2;
            const petalSpd = Math.random() * 5 + 2;
            skillEffects.push({
              type: 'ROSE_PETAL',
              x: ef.x,
              y: ef.y,
              vx: Math.cos(petalAngle) * petalSpd,
              vy: Math.sin(petalAngle) * petalSpd,
              angle: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.2,
              size: Math.random() * 5 + 3,
              color: Math.random() < 0.6 ? '#ff3250' : '#ffd600',
              life: 40,
              maxLife: 40
            });
          }

          const enemy = ef.target;
          if (Math.hypot(enemy.x - ef.x, enemy.y - ef.y) <= ef.radius + enemy.radius) {
            applyDamage(enemy, ef.damage);
            addFloatingText(enemy.x, enemy.y - 18, `-${ef.damage}`, '#ff3344');
          }
        }
      }
      else if (ef.type === 'GUNPOWDER_EXPLOSION') {
        // [수정] 김티비 버섯구름 감성: 반투명 빨간색 & 노란색 폭발
        const progress = 1 - ef.life / ef.maxLife;
        const targetR = ef.targetRadius || 115;
        const r = targetR * Math.sin(progress * Math.PI * 0.5);

        ctx.save();
        ctx.translate(ef.x, ef.y);

        // 1. 반투명 빨강 외곽 충격파 링
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 52, 80, ${0.85 * (1 - progress)})`;
        ctx.lineWidth = 6 * (1 - progress);
        ctx.stroke();

        // 2. 반투명 노랑 내각 충격파 링
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 214, 0, ${0.85 * (1 - progress)})`;
        ctx.lineWidth = 4 * (1 - progress);
        ctx.stroke();

        // 3. 반투명 코어 그라데이션 (노랑 -> 빨강)
        const coreR = r * 0.85;
        if (coreR > 0) {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, coreR));
          grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * (1 - progress)})`);
          grad.addColorStop(0.35, `rgba(255, 214, 0, ${0.75 * (1 - progress)})`);
          grad.addColorStop(0.7, `rgba(255, 52, 80, ${0.6 * (1 - progress)})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.beginPath();
          ctx.arc(0, 0, coreR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.restore();
        ef.life -= 1;
      }
      else if (ef.type === 'BIG_EXPLOSION') {
        // [수정] 공병은 대형 폭발: 반투명 빨간색 & 노란색 2중 충격파
        const progress = 1 - ef.life / ef.maxLife;
        const targetR = ef.targetRadius || 110;
        const r = targetR * Math.sin(progress * Math.PI * 0.5);

        ctx.save();
        ctx.translate(ef.x, ef.y);

        // 1. 외곽 반투명 빨간색 링
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 52, 80, ${0.85 * (1 - progress)})`;
        ctx.lineWidth = 6 * (1 - progress);
        ctx.stroke();

        // 2. 내각 반투명 노란색 링
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 214, 0, ${0.85 * (1 - progress)})`;
        ctx.lineWidth = 4 * (1 - progress);
        ctx.stroke();

        // 3. 소프트 폭발 코어
        const coreR = r * 0.85;
        if (coreR > 0) {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, coreR));
          grad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * (1 - progress)})`);
          grad.addColorStop(0.3, `rgba(255, 214, 0, ${0.75 * (1 - progress)})`);
          grad.addColorStop(0.7, `rgba(255, 52, 80, ${0.55 * (1 - progress)})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.beginPath();
          ctx.arc(0, 0, coreR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // 4. 방사형 섬광 파동
        for (let ray = 0; ray < 8; ray++) {
          const rayAngle = (Math.PI / 4) * ray + progress * 0.4;
          const rayLen = r * 1.05;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(rayAngle) * rayLen, Math.sin(rayAngle) * rayLen);
          ctx.strokeStyle = ray % 2 === 0 ? `rgba(255, 214, 0, ${0.8 * (1 - progress)})` : `rgba(255, 52, 80, ${0.8 * (1 - progress)})`;
          ctx.lineWidth = 3 * (1 - progress);
          ctx.stroke();
        }

        ctx.restore();
        ef.life -= 1;
      }
      else if (ef.type === 'ROSE_PETAL') {
        ef.x += ef.vx;
        ef.y += ef.vy;
        ef.vx *= 0.95;
        ef.vy *= 0.95;
        ef.angle += ef.rotSpeed;

        const progress = ef.life / ef.maxLife;

        ctx.save();
        ctx.translate(ef.x, ef.y);
        ctx.rotate(ef.angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, ef.size * progress, ef.size * 0.5 * progress, 0, 0, Math.PI * 2);
        ctx.fillStyle = ef.color;
        ctx.shadowColor = ef.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();

        ef.life -= 1;
      }
      else if (ef.type === 'SUBWOOFER_WAVE') {
        const progress = 1 - ef.life / ef.maxLife;
        const currentR = ef.radius + (ef.maxRadius - ef.radius) * progress;

        ctx.save();
        for (let waveIdx = 0; waveIdx < 3; waveIdx++) {
          const waveR = Math.max(0, currentR - waveIdx * 14);
          const alpha = (1 - progress) * (1 - waveIdx * 0.28);

          ctx.beginPath();
          ctx.arc(ef.x, ef.y, waveR, 0, Math.PI * 2);
          ctx.strokeStyle = ef.color || '#8c7ae6';
          ctx.lineWidth = (6 - waveIdx * 1.5) * (1 - progress);
          ctx.shadowColor = ef.color || '#8c7ae6';
          ctx.shadowBlur = 8 * alpha;
          ctx.stroke();
        }

        for (let r = 0; r < 12; r++) {
          const rayAngle = (Math.PI * 2 / 12) * r + progress * 0.5;
          ctx.beginPath();
          ctx.moveTo(ef.x + Math.cos(rayAngle) * currentR * 0.65, ef.y + Math.sin(rayAngle) * currentR * 0.65);
          ctx.lineTo(ef.x + Math.cos(rayAngle) * currentR, ef.y + Math.sin(rayAngle) * currentR);
          ctx.strokeStyle = ef.color || '#8c7ae6';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();

        if (gameState === 'PLAYING' && !ef.hit) {
          const dist = Math.hypot(ef.target.x - ef.x, ef.target.y - ef.y);
          if (dist <= currentR + ef.target.radius) {
            ef.hit = true;
            applyDamage(ef.target, ef.damage);
            addFloatingText(ef.target.x, ef.target.y - 18, `-${ef.damage}`, '#ff3344');
            triggerShake(14);

            const kbAngle = Math.atan2(ef.target.y - ef.y, ef.target.x - ef.x);
            ef.target.vx = Math.cos(kbAngle) * 9.5;
            ef.target.vy = Math.sin(kbAngle) * 9.5;
          }
        }
        ef.life -= 1;
      }
      else if (ef.type === 'NIGHTFALL_ZONE') {
        ctx.save();

        if (ef.dropTimer < ef.maxDropTime) {
          ef.dropTimer++;
          const dropProg = ef.dropTimer / ef.maxDropTime;
          const currentY = ef.y - (1 - dropProg) * 220;

          ctx.beginPath();
          ctx.arc(ef.x, currentY, 7, 0, Math.PI * 2);
          ctx.fillStyle = ef.color || '#8c7ae6';
          ctx.shadowColor = ef.color || '#8c7ae6';
          ctx.shadowBlur = 8;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(ef.x, currentY);
          ctx.lineTo(ef.x, currentY - 26);
          ctx.strokeStyle = ef.color || '#8c7ae6';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(ef.x, ef.y, ef.radius * dropProg, 0, Math.PI * 2);
          ctx.strokeStyle = ef.color || '#8c7ae6';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();

          ctx.restore();
          ef.life -= 1;
          continue;
        }

        const deployLife = ef.life;
        const totalDeployTime = ef.maxLife - ef.maxDropTime;
        const fadeIn = Math.min(1, (totalDeployTime - deployLife) / 20);
        const fadeOut = Math.min(1, deployLife / 40);
        const alphaScale = fadeIn * fadeOut;
        const activeR = ef.radius * (0.35 + 0.65 * fadeIn);

        const grad = ctx.createRadialGradient(ef.x, ef.y, 0, ef.x, ef.y, activeR);
        grad.addColorStop(0, `rgba(15, 12, 28, ${0.9 * alphaScale})`);
        grad.addColorStop(0.75, `rgba(30, 25, 55, ${0.85 * alphaScale})`);
        grad.addColorStop(1, ef.color ? ef.color + '66' : 'rgba(140, 122, 230, 0.4)');

        ctx.beginPath();
        ctx.arc(ef.x, ef.y, activeR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ef.x, ef.y, activeR, 0, Math.PI * 2);
        ctx.strokeStyle = ef.color || '#8c7ae6';
        ctx.lineWidth = 2;
        ctx.stroke();

        for (let p = 0; p < Math.floor(4 * alphaScale); p++) {
          const pAngle = Math.random() * Math.PI * 2;
          const pDist = Math.random() * activeR * (1 + (1 - fadeOut) * 0.3);
          ctx.beginPath();
          ctx.arc(ef.x + Math.cos(pAngle) * pDist, ef.y + Math.sin(pAngle) * pDist, Math.random() * 7 + 3, 0, Math.PI * 2);
          ctx.fillStyle = ef.color ? ef.color + '44' : 'rgba(140, 122, 230, 0.25)';
          ctx.fill();
        }
        ctx.restore();

        if (gameState === 'PLAYING') {
          const targetEnemy = (ef.owner === p1) ? p2 : p1;
          if (Math.hypot(targetEnemy.x - ef.x, targetEnemy.y - ef.y) <= activeR) {
            targetEnemy.vx *= 0.84;
            targetEnemy.vy *= 0.84;

            ef.tickTimer = (ef.tickTimer || 0) + 1;
            if (ef.tickTimer >= 30) {
              ef.tickTimer = 0;
              const tickDmg = Math.floor((ef.damage || 40) / 8);
              applyDamage(targetEnemy, tickDmg);
              addFloatingText(targetEnemy.x + (Math.random() - 0.5) * 10, targetEnemy.y - 15, `-${tickDmg}`, '#ff3344');
              triggerShake(3);
            }
          }
        }
        ef.life -= 1;
      }
      else if (ef.type === 'CUT_LINE') {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ef.x1, ef.y1); ctx.lineTo(ef.x2, ef.y2);
        ctx.strokeStyle = '#111111'; ctx.lineWidth = 10; ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ef.x1, ef.y1); ctx.lineTo(ef.x2, ef.y2);
        ctx.strokeStyle = ef.color || '#e84393';
        ctx.lineWidth = 4; ctx.shadowColor = ef.color || '#e84393'; ctx.shadowBlur = 8; ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ef.x1, ef.y1); ctx.lineTo(ef.x2, ef.y2);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();

        if (gameState === 'PLAYING' && !ef.triggered) {
          if (distToSegment(ef.target, { x: ef.x1, y: ef.y1 }, { x: ef.x2, y: ef.y2 }) < ef.target.radius + 4) {
            ef.triggered = true;
            gaeunCutPool.play();
            applyDamage(ef.target, ef.damage);
            addFloatingText(ef.target.x, ef.target.y - 18, `-${ef.damage}`, '#ff3344');
            triggerShake(18);

            const tempVx = ef.target.vx;
            ef.target.vx = -ef.target.vy * 1.6;
            ef.target.vy = tempVx * 1.6;
          }
        }
        ef.life -= 1;
      }
      else if (ef.type === 'WEBTOON_SCROLL_UI') {
        const offset = (Date.now() / 2.5) % 40;
        ctx.save();
        ctx.strokeStyle = ef.color ? (ef.color + '44') : 'rgba(232, 67, 147, 0.28)';
        ctx.lineWidth = 2; ctx.setLineDash([14, 8]);
        for (let y = -40 + offset; y < ARENA_SIZE; y += 40) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA_SIZE, y); ctx.stroke();
        }
        ctx.fillStyle = ef.color ? (ef.color + '33') : 'rgba(232, 67, 147, 0.18)';
        ctx.font = 'bold 24px "NeoDunggeunmo", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('▼ SCROLL ▼', ARENA_SIZE / 2, (offset * 3) % ARENA_SIZE);
        ctx.restore();
        ef.life -= 1;
      }
      else if (ef.type === 'MUSHROOM_CLOUD') {
        const progress = 1 - ef.life / ef.maxLife;
        const scaleMult = ef.scale || 1.0;
        ctx.save();
        ctx.translate(ef.x, ef.y);

        ctx.beginPath();
        ctx.ellipse(0, 0, (48 * progress + 8) * scaleMult, (14 * progress + 4) * scaleMult, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 100, 0, ${1 - progress})`; ctx.lineWidth = 4; ctx.stroke();

        const stemH = 42 * progress * scaleMult;
        ctx.fillStyle = `rgba(255, 87, 34, ${0.9 * (1 - progress)})`;
        ctx.beginPath();
        ctx.moveTo(-9 * (1 - progress) * scaleMult, 0); ctx.lineTo(9 * (1 - progress) * scaleMult, 0);
        ctx.lineTo(4 * (1 - progress) * scaleMult, -stemH); ctx.lineTo(-4 * (1 - progress) * scaleMult, -stemH);
        ctx.closePath(); ctx.fill();

        const capY = -stemH;
        const capR = 28 * Math.sin(progress * Math.PI) * scaleMult;
        ctx.fillStyle = `rgba(255, 52, 80, ${1 - progress})`;
        ctx.beginPath(); ctx.arc(0, capY - 4 * scaleMult, capR, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `rgba(255, 214, 0, ${1 - progress})`;
        ctx.beginPath();
        ctx.arc(-capR * 0.45, capY - 7 * scaleMult, capR * 0.55, 0, Math.PI * 2);
        ctx.arc(capR * 0.45, capY - 7 * scaleMult, capR * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ef.life -= 1;
      }
      else if (ef.type === 'DEATH_POP') {
        ef.x += ef.vx; ef.y += ef.vy;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.radius * (ef.life / ef.maxLife), 0, Math.PI * 2);
        ctx.fillStyle = ef.color; ctx.fill();
        ef.life -= 1;
      }
      else if (ef.type === 'AURA') {
        ef.x += (ef.targetX - ef.x) * 0.18; ef.y += (ef.targetY - ef.y) * 0.18;
        ctx.beginPath(); ctx.arc(ef.x, ef.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = ef.color; ctx.fill();
        ef.life -= 1;
      }
      else if (ef.type === 'CHARGE_PULSE') {
        ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ef.color; ctx.lineWidth = 3 * (ef.life / 20);
        ctx.stroke();
        ef.radius += 2.8; ef.life -= 1;
      }
      else if (ef.type === 'LASER_BEAM') {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ef.x1, ef.y1); ctx.lineTo(ef.x2, ef.y2);
        ctx.strokeStyle = ef.color;
        ctx.lineWidth = 18 * (ef.life / 28);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ef.x1, ef.y1); ctx.lineTo(ef.x2, ef.y2);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6 * (ef.life / 28); ctx.stroke();
        ctx.restore();
        ef.life -= 1;
      }
      else if (ef.type === 'INSANITY_WARN') {
        const progress = 1 - ef.life / ef.maxLife;
        ctx.save();
        ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 51, 68, 0.15)'; ctx.fill();
        ctx.strokeStyle = '#ff3344'; ctx.lineWidth = 2.5; ctx.stroke();

        ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.radius * progress, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 51, 68, 0.4)'; ctx.fill();
        ctx.restore();
        ef.life -= 1;

        if (ef.life <= 0) {
          sofaDropPool.play();
          skillEffects.push({
            type: 'SOFA_FALL', x: ef.x, y: ef.y, currentY: -80, targetY: ef.y,
            radius: ef.radius, damage: ef.damage, owner: ef.owner, life: 20, maxLife: 20
          });
        }
      } 
      else if (ef.type === 'SOFA_FALL') {
        const progress = 1 - ef.life / ef.maxLife;
        ef.currentY = -80 + (ef.targetY + 80) * Math.pow(progress, 2.5);

        ctx.save();
        ctx.font = 'bold 58px "NeoDunggeunmo", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff'; ctx.fillText('🛋️', ef.x, ef.currentY);
        ctx.restore();

        ef.life -= 1;
        if (ef.life <= 0) {
          triggerShake(28);

          // 공병은 버섯구름 톤 폭발 스폰
          skillEffects.push({ type: 'BIG_EXPLOSION', x: ef.x, y: ef.y, targetRadius: ef.radius, life: 30, maxLife: 30 });

          [p1, p2].forEach(p => {
            if (p !== ef.owner && Math.hypot(p.x - ef.x, p.y - ef.y) <= ef.radius + p.radius) {
              applyDamage(p, ef.damage);
              p.stunTimer = 60;
              addFloatingText(p.x, p.y - 15, `-40`, '#ff3344');
            }
          });
        }
      }

      if (ef.life <= 0) skillEffects.splice(i, 1);
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];

      if (proj.type === 'POOP_FLYING') {
        proj.progress += 0.035;
        proj.x = proj.startX + (proj.targetX - proj.startX) * proj.progress;
        proj.y = proj.startY + (proj.targetY - proj.startY) * proj.progress - Math.sin(proj.progress * Math.PI) * 35;

        ctx.font = 'bold 16px "NeoDunggeunmo", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💩', proj.x, proj.y);

        if (proj.progress >= 1.0) {
          landedPoops.push({ x: proj.targetX, y: proj.targetY, damage: proj.damage, owner: proj.owner });
          projectiles.splice(i, 1);
        }
        continue;
      }

      proj.x += proj.vx; proj.y += proj.vy; proj.life -= 1;

      if (proj.isDagger) {
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(Math.atan2(proj.vy, proj.vx));

        ctx.shadowColor = '#c23616';
        ctx.shadowBlur = 10;

        ctx.strokeStyle = '#d2dae2';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-13, 0, 2.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#2d3436';
        ctx.fillRect(-11, -2, 7, 4);
        ctx.strokeStyle = '#c23616';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, -2); ctx.lineTo(-8, 2);
        ctx.moveTo(-7, -2); ctx.lineTo(-5, 2);
        ctx.stroke();

        ctx.fillStyle = '#c23616';
        ctx.beginPath();
        ctx.moveTo(-4, -5); ctx.lineTo(-2, -5); ctx.lineTo(-2, 5); ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f1f2f6';
        ctx.beginPath();
        ctx.moveTo(-2, -3.5);
        ctx.lineTo(15, 0);
        ctx.lineTo(-2, 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#a4b0be';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.strokeStyle = '#c23616';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2, 0); ctx.lineTo(13, 0);
        ctx.stroke();

        ctx.restore();

        const dist = Math.hypot(proj.target.x - proj.x, proj.target.y - proj.y);
        if (dist < proj.target.radius + 6) {
          applyDamage(proj.target, proj.damage);
          addFloatingText(proj.target.x, proj.target.y - 15, `-${proj.damage}`, '#ff3344');

          proj.target.skillCool = Math.max(0, proj.target.skillCool - (0.65 * 60 * proj.target.data.coolSpeed));

          skillEffects.push({
            type: 'COOLDOWN_ORB',
            x: proj.target.x,
            y: proj.target.y,
            owner: proj.owner,
            trailHistory: [],
            life: 90,
            maxLife: 90
          });

          projectiles.splice(i, 1);
          continue;
        }
      }
      else if (proj.isBL) {
        ctx.save(); ctx.translate(proj.x, proj.y);
        ctx.rotate(Math.atan2(proj.vy, proj.vx));

        const grad = ctx.createLinearGradient(-45, 0, 20, 0);
        grad.addColorStop(0, 'rgba(255, 118, 117, 0)');
        grad.addColorStop(0.5, proj.color || '#ff4757');
        grad.addColorStop(1, '#ffffff');

        ctx.beginPath(); ctx.moveTo(-45, 0); ctx.lineTo(20, 0);
        ctx.strokeStyle = grad; ctx.lineWidth = 11;
        ctx.shadowColor = proj.color || '#ff4757'; ctx.shadowBlur = 10; ctx.stroke();

        ctx.font = 'bold 26px "NeoDunggeunmo", sans-serif';
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('BL', 0, 0);
        ctx.restore();
      }
      else if (proj.isRainbowLaser) {
        ctx.save();
        ctx.translate(proj.x, proj.y);
        const angle = Math.atan2(proj.vy, proj.vx);
        ctx.rotate(angle);

        const grad = ctx.createLinearGradient(-42, 0, 10, 0);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.4, proj.color);
        grad.addColorStop(1, '#ffffff');

        ctx.beginPath();
        ctx.moveTo(-42, 0);
        ctx.lineTo(12, 0);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 8;
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 8;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(6, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(Date.now() / 40);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
        ctx.moveTo(0, -12); ctx.lineTo(0, 12);
        ctx.stroke();

        ctx.restore();

        skillEffects.push({
          type: 'AURA',
          x: proj.x + (Math.random() - 0.5) * 8,
          y: proj.y + (Math.random() - 0.5) * 8,
          targetX: proj.x,
          targetY: proj.y,
          color: proj.color,
          life: 8
        });
      }
      else if (proj.isBullet) {
        ctx.save(); ctx.translate(proj.x, proj.y);
        ctx.rotate(Math.atan2(proj.vy, proj.vx));
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-4, 0);
        ctx.strokeStyle = proj.color || '#ff3344'; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
      }

      if (!proj.isDagger && Math.hypot(proj.target.x - proj.x, proj.target.y - proj.y) < proj.target.radius + 6) {
        applyDamage(proj.target, proj.damage);
        addFloatingText(proj.target.x, proj.target.y - 15, `-${proj.damage}`, '#ff3344');
        triggerShake(5);
        projectiles.splice(i, 1);
        continue;
      }

      if (proj.life <= 0) projectiles.splice(i, 1);
    }

    p1.draw(ctx, gameState, countdownStartTime);
    p2.draw(ctx, gameState, countdownStartTime);

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 15px "NeoDunggeunmo", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ft.y -= 0.4;
      ft.alpha -= 0.03;
      if (ft.alpha <= 0) floatingTexts.splice(i, 1);
    }
  }

  ctx.restore();
}

document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    clickPool.play();
    const gameScreen = document.getElementById('screen-game');
    if (!gameScreen || !gameScreen.classList.contains('active')) playBGM();
  });
});

document.getElementById('bgm-volume').addEventListener('input', (e) => { bgm.volume = parseFloat(e.target.value); });
document.getElementById('btn-start').addEventListener('click', () => showScreen('screen-mode'));
document.getElementById('btn-dict').addEventListener('click', () => { showScreen('screen-dict'); updateDictionaryUI(currentDictKey); });
document.getElementById('btn-patch').addEventListener('click', () => showScreen('screen-patch'));
document.getElementById('btn-back-patch').addEventListener('click', () => showScreen('screen-main'));
document.getElementById('btn-settings').addEventListener('click', () => showScreen('screen-settings'));
document.getElementById('btn-theme-settings').addEventListener('click', toggleTheme);
document.getElementById('btn-exit').addEventListener('click', () => { gameState = 'IDLE'; showScreen('screen-main'); });
document.getElementById('btn-mode-1v1').addEventListener('click', () => showScreen('screen-char'));
document.getElementById('btn-back-mode').addEventListener('click', () => showScreen('screen-main'));
document.getElementById('btn-back-char').addEventListener('click', () => showScreen('screen-mode'));
document.getElementById('btn-back-dict').addEventListener('click', () => showScreen('screen-main'));
document.getElementById('btn-back-settings').addEventListener('click', () => showScreen('screen-main'));
document.getElementById('btn-battle-start').addEventListener('click', startBattle);

document.querySelectorAll('.dict-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dict-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentDictKey = tab.dataset.key;
    updateDictionaryUI(currentDictKey);
  });
});

document.querySelectorAll('#p1-char-grid .char-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#p1-char-grid .char-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedP1Key = card.dataset.key;
  });
});

document.querySelectorAll('#p2-char-grid .char-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#p2-char-grid .char-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedP2Key = card.dataset.key;
  });
});

if (animFrameId) cancelAnimationFrame(animFrameId);
animFrameId = requestAnimationFrame(loop);
