import { CHAR_DB } from './characters.js';
import { checkBounce } from './physics.js';
import { Ball } from './ball.js';
import { 
  bgm, clickPool, sofaDropPool, parkShootPool, poopTrapPool, poopEatPool, 
  gaeunCutPool, playBounceSfx, playBGM, stopBGM 
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

// =========================================================================
// 메인 프레임 루프 (최적화 반영)
// =========================================================================
function loop(now) {
  animFrameId = requestAnimationFrame(loop);

  if (!now) now = performance.now();
  const elapsed = now - lastTime;
  if (elapsed < fpsInterval) return;
  lastTime = now - (elapsed % fpsInterval);

  // 파티클 메모리 과부하 방지 (최대 120개 제한)
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

    // 김티비 똥 트랩 처리 및 복구된 원본 폭발 비주얼
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

          // 화려한 버섯구름 폭발 이펙트 생성
          skillEffects.push({ type: 'MUSHROOM_CLOUD', x: poop.x, y: poop.y, life: 30, maxLife: 30 });

          // 파티클 파편 폭발(DEATH_POP) 복구
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
      // ★ 원본 화려한 버섯구름 폭발 비주얼 완벽 복원 ★
      else if (ef.type === 'MUSHROOM_CLOUD') {
        const progress = 1 - ef.life / ef.maxLife;
        ctx.save(); ctx.translate(ef.x, ef.y);

        // 하단 충격파 링
        ctx.beginPath();
        ctx.ellipse(0, 0, 48 * progress + 8, 14 * progress + 4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 100, 0, ${1 - progress})`; ctx.lineWidth = 4; ctx.stroke();

        // 버섯 기둥
        const stemH = 42 * progress;
        ctx.fillStyle = `rgba(255, 87, 34, ${0.9 * (1 - progress)})`;
        ctx.beginPath();
        ctx.moveTo(-9 * (1 - progress), 0); ctx.lineTo(9 * (1 - progress), 0);
        ctx.lineTo(4 * (1 - progress), -stemH); ctx.lineTo(-4 * (1 - progress), -stemH);
        ctx.closePath(); ctx.fill();

        // 붉은 외곽 화염 캡
        const capY = -stemH;
        const capR = 28 * Math.sin(progress * Math.PI);
        ctx.fillStyle = `rgba(255, 52, 80, ${1 - progress})`;
        ctx.beginPath(); ctx.arc(0, capY - 4, capR, 0, Math.PI * 2); ctx.fill();

        // 노란 내부 핵심 화염 캡 (복구 완료)
        ctx.fillStyle = `rgba(255, 214, 0, ${1 - progress})`;
        ctx.beginPath();
        ctx.arc(-capR * 0.45, capY - 7, capR * 0.55, 0, Math.PI * 2);
        ctx.arc(capR * 0.45, capY - 7, capR * 0.55, 0, Math.PI * 2);
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

    // 투사체 처리 및 복구된 김티비 궁극기 레이저 투사체(isRainbowLaser) 렌더링
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

      if (proj.isBL) {
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
      // ★ 김티비 궁극기 무지개 난사 레이저 빔 복구 ★
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

      if (Math.hypot(proj.target.x - proj.x, proj.target.y - proj.y) < proj.target.radius + 6) {
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
