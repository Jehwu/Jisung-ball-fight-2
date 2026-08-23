import { CHAR_DB } from './characters.js';
import { checkBounce, handleWallBounce } from './physics.js';

// =========================================================================
// [1] 사운드 시스템
// =========================================================================
const bgm = new Audio('sounds/bgm.mp3');
bgm.loop = true;
bgm.volume = 0.5;

class SoundPool {
  constructor(src, size = 4) {
    this.pool = Array.from({ length: size }, () => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      return audio;
    });
    this.currentIndex = 0;
  }

  play(volume = 0.5) {
    const sound = this.pool[this.currentIndex];
    sound.volume = volume;
    sound.currentTime = 0;
    sound.play().catch(() => {});
    this.currentIndex = (this.currentIndex + 1) % this.pool.length;
  }
}

const clickPool = new SoundPool('sounds/click.mp3', 3);
const gongSkillPool = new SoundPool('sounds/gong_skill.mp3', 3);
const sofaDropPool = new SoundPool('sounds/sofa_drop.mp3', 3);
const kimEatPool = new SoundPool('sounds/kim_eat.mp3', 3);
const kimSpitPool = new SoundPool('sounds/kim_spit.mp3', 3);
const bouncePool = new SoundPool('sounds/bounce.mp3', 6);

const parkShootPool = new SoundPool('sounds/park_shoot.mp3', 3);
const parkUltChargePool = new SoundPool('sounds/park_ult_charge.mp3', 2);
const parkUltShootPool = new SoundPool('sounds/park_ult_shoot.mp3', 2);

const poopTrapPool = new SoundPool('sounds/poop_trap.mp3', 3);
const poopEatPool = new SoundPool('sounds/poop_eat.mp3', 3);

let lastBounceTime = 0;

function playClickSfx() { clickPool.play(bgm.volume); }
function playGongSkillSfx() { gongSkillPool.play(bgm.volume); }
function playSofaDropSfx() { sofaDropPool.play(bgm.volume); }
function playKimEatSfx() { kimEatPool.play(bgm.volume); }
function playKimSpitSfx() { kimSpitPool.play(bgm.volume); }
function playParkShootSfx() { parkShootPool.play(bgm.volume); }
function playParkUltChargeSfx() { parkUltChargePool.play(bgm.volume); }
function playParkUltShootSfx() { parkUltShootPool.play(bgm.volume); }
function playPoopTrapSfx() { poopTrapPool.play(bgm.volume); }
function playPoopEatSfx() { poopEatPool.play(bgm.volume); }

function playBounceSfx() {
  const now = Date.now();
  if (now - lastBounceTime >= 100) {
    lastBounceTime = now;
    bouncePool.play(bgm.volume);
  }
}

function playBGM() {
  if (bgm.paused) {
    bgm.play().catch(() => {});
  }
}

function stopBGM() {
  bgm.pause();
  bgm.currentTime = 0;
}

// =========================================================================
// [2] Canvas 및 기본 변수
// =========================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlayMsg = document.getElementById('overlay-msg');
const btnSpeed = document.getElementById('btn-speed');

const ARENA_SIZE = 300;
const dpr = Math.max(window.devicePixelRatio || 1, 2);

canvas.width = ARENA_SIZE * dpr;
canvas.height = ARENA_SIZE * dpr;
canvas.style.width = ARENA_SIZE + 'px';
canvas.style.height = ARENA_SIZE + 'px';
ctx.scale(dpr, dpr);

let gameState = 'IDLE';
let gameSpeed = 1.0;
let shakeTimer = 0;
let skillEffects = [];
let floatingTexts = [];
let projectiles = [];
let landedPoops = [];

let selectedP1Key = 'KIM';
let selectedP2Key = 'GONG';
let currentDictKey = 'KIM';
let dictAnimFrame = null;

let countdownStartTime = 0;

function isDarkTheme() {
  const container = document.getElementById('game-container');
  return container ? container.classList.contains('dark-theme') : true;
}

// =========================================================================
// [3] Ball 클래스
// =========================================================================
class Ball {
  constructor(x, y, radius) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.maxHp = 250;
    this.hp = 250;
    this.skillCool = 0;
    this.ultCharge = 0;
    this.vx = 0;
    this.vy = 0;
    this.isWinner = false;

    // 김민채
    this.isEatable = false;
    this.eatableTimer = 0;
    this.isEating = false;
    this.isEaten = false;
    this.eatingTimer = 0;
    this.eatingDmgTimer = 0;
    this.wallDebuffTimer = 0;

    // 공병은
    this.isDashing = false;
    this.dashHitTarget = false;
    this.stunTimer = 0;

    // 박지성
    this.isAiming = false;
    this.aimTimer = 0;
    this.aimTarget = null;
    this.isUltAim = false;
    this.eyeStacks = [];
    this.eyeDmgTimer = 0;

    // 김티비
    this.isFurryBurst = false;
    this.furryBurstTimer = 0;
    this.furryBurstTarget = null;
    this.burstShotCount = 0;
  }

  init(charData) {
    this.data = charData;
    this.maxHp = charData.hp || 250;
    this.reset();
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.hp = this.maxHp;
    this.skillCool = 0;
    this.ultCharge = 0;
    
    this.isEatable = false;
    this.eatableTimer = 0;
    this.isEating = false;
    this.isEaten = false;
    this.eatingTimer = 0;
    this.eatingDmgTimer = 0;
    this.wallDebuffTimer = 0;

    this.isDashing = false;
    this.dashHitTarget = false;
    this.stunTimer = 0;

    this.isAiming = false;
    this.aimTimer = 0;
    this.aimTarget = null;
    this.isUltAim = false;
    this.eyeStacks = [];
    this.eyeDmgTimer = 0;

    this.isFurryBurst = false;
    this.furryBurstTimer = 0;
    this.furryBurstTarget = null;
    this.burstShotCount = 0;

    const charSpeed = this.data ? (this.data.speed || 1.0) : 1.0;
    const randomAngle = Math.random() * Math.PI * 2;
    const baseSpeed = 0.9 * charSpeed;
    this.vx = Math.cos(randomAngle) * baseSpeed;
    this.vy = Math.sin(randomAngle) * baseSpeed;
    this.isWinner = false;
  }

  update(target) {
    if (gameState !== 'PLAYING') return;

    if (this.eyeStacks.length > 0 && this.hp > 0) {
      this.eyeDmgTimer += gameSpeed;
      if (this.eyeDmgTimer >= 60) {
        this.eyeDmgTimer = 0;
        const totalDmg = this.eyeStacks.length * 3;
        applyDamage(this, totalDmg);
        addFloatingText(this.x, this.y - 18, `-${totalDmg}`);
      }
    }

    if (this.stunTimer > 0) {
      this.stunTimer -= gameSpeed;
      return;
    }

    if (this.wallDebuffTimer > 0) {
      this.wallDebuffTimer -= gameSpeed;
    }

    if (this.isEatable) {
      this.eatableTimer -= gameSpeed;
      if (this.eatableTimer <= 0) this.isEatable = false;
    }

    if (this.isFurryBurst && this.furryBurstTarget) {
      this.furryBurstTimer -= gameSpeed;
      this.vx = 0;
      this.vy = 0;
      shakeTimer = Math.max(shakeTimer, 4);

      const colors = ['#ff007f', '#00ffff', '#ffff00', '#00ff00', '#ff7675', '#a29bfe'];
      for (let i = 0; i < 2; i++) {
        skillEffects.push({
          type: 'AURA',
          x: this.x + (Math.random() - 0.5) * 50,
          y: this.y + (Math.random() - 0.5) * 50,
          targetX: this.x,
          targetY: this.y,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 15
        });
      }

      if (Math.floor(this.furryBurstTimer) % 11 === 0 && this.burstShotCount < 9) {
        this.burstShotCount++;
        playParkShootSfx();

        const angle = Math.atan2(this.furryBurstTarget.y - this.y, this.furryBurstTarget.x - this.x) + (Math.random() - 0.5) * 0.15;
        const projSpeed = 12.0;

        projectiles.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * projSpeed,
          vy: Math.sin(angle) * projSpeed,
          damage: Math.round(this.data.ult.damage / 9), // ★ 김티비 궁극기 데미지 연동 (총 9발로 나누어 적용)
          target: this.furryBurstTarget,
          color: colors[this.burstShotCount % colors.length],
          isRainbowLaser: true,
          life: 80
        });

        this.furryBurstTarget.vx = Math.cos(angle) * 4.2;
        this.furryBurstTarget.vy = Math.sin(angle) * 4.2;
      }

      if (this.furryBurstTimer <= 0) {
        this.isFurryBurst = false;
        const charSpeed = this.data ? (this.data.speed || 1.0) : 1.0;
        const resumeAngle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(resumeAngle) * 0.9 * charSpeed;
        this.vy = Math.sin(resumeAngle) * 0.9 * charSpeed;
      }
      return;
    }

    if (this.isAiming && this.aimTarget) {
      this.aimTimer -= gameSpeed;
      this.vx = 0;
      this.vy = 0;

      if (this.isUltAim) {
        shakeTimer = Math.max(shakeTimer, 2);

        for (let i = 0; i < 3; i++) {
          const auraAngle = Math.random() * Math.PI * 2;
          const auraDist = Math.random() * 50 + 15;
          skillEffects.push({
            type: 'AURA',
            x: this.x + Math.cos(auraAngle) * auraDist,
            y: this.y + Math.sin(auraAngle) * auraDist,
            targetX: this.x,
            targetY: this.y,
            color: Math.random() < 0.5 ? '#10ac84' : '#55efc4',
            life: 18
          });
        }

        if (Math.floor(this.aimTimer) % 12 === 0) {
          skillEffects.push({
            type: 'CHARGE_PULSE',
            x: this.x,
            y: this.y,
            radius: 8,
            maxRadius: 65,
            color: '#10ac84',
            life: 20
          });
        }
      }

      if (this.aimTimer <= 0) {
        this.isAiming = false;
        
        const charSpeed = this.data ? (this.data.speed || 1.0) : 1.0;
        const resumeAngle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(resumeAngle) * 0.9 * charSpeed;
        this.vy = Math.sin(resumeAngle) * 0.9 * charSpeed;

        if (this.isUltAim) {
          shakeTimer = 20;
          playParkUltShootSfx();

          skillEffects.push({
            type: 'LASER_BEAM',
            x1: this.x,
            y1: this.y,
            x2: this.aimTarget.x,
            y2: this.aimTarget.y,
            color: '#10ac84',
            life: 28
          });

          applyDamage(this.aimTarget, 0);
          addFloatingText(this.aimTarget.x, this.aimTarget.y - 20, '-0');
          
          const hitAngle = Math.atan2(this.y - this.aimTarget.y, this.x - this.aimTarget.x);
          this.aimTarget.eyeStacks.push({ angle: hitAngle });
        } else {
          shakeTimer = 8;
          playParkShootSfx();

          const angle = Math.atan2(this.aimTarget.y - this.y, this.aimTarget.x - this.x);
          const projSpeed = 10.0;

          projectiles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * projSpeed,
            vy: Math.sin(angle) * projSpeed,
            damage: this.data.basic.damage, // ★ 박지성 기본 스킬 데미지 연동
            target: this.aimTarget,
            color: this.data.color,
            isBullet: true,
            life: 100
          });
        }
      }
      return;
    }

    if (this.isEating) {
      this.eatingTimer -= gameSpeed;
      this.eatingDmgTimer += gameSpeed;

      target.x = this.x;
      target.y = this.y;
      target.vx = 0;
      target.vy = 0;

      if (this.eatingDmgTimer >= 60) {
        this.eatingDmgTimer = 0;
        const eatDmg = this.data.ult.damage; // ★ 김민채 궁극기(먹방) 데미지 연동
        applyDamage(target, eatDmg);
        addFloatingText(this.x, this.y - 20, `-${eatDmg}`);
        shakeTimer = 8;
      }

      if (this.eatingTimer <= 0) {
        this.isEating = false;
        target.isEaten = false;

        playKimSpitSfx();

        const angle = Math.random() * Math.PI * 2;
        const launchSpeed = 32.0;
        target.vx = Math.cos(angle) * launchSpeed;
        target.vy = Math.sin(angle) * launchSpeed;

        const mySpeed = (this.data ? this.data.speed : 1.0) * 0.9;
        this.vx = (Math.random() < 0.5 ? 1 : -1) * mySpeed;
        this.vy = (Math.random() < 0.5 ? 1 : -1) * mySpeed;

        target.wallDebuffTimer = 120;
        shakeTimer = 16;
      }
      return;
    }

    if (this.isEaten) return;

    if (this.isDashing) {
      let currentAngle = Math.atan2(this.vy, this.vx);
      let targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
      let diff = targetAngle - currentAngle;
      
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      currentAngle += diff * 0.003;

      const dashSpd = 3.6;
      this.vx = Math.cos(currentAngle) * dashSpd;
      this.vy = Math.sin(currentAngle) * dashSpd;

      if (Math.random() < 0.5) {
        skillEffects.push({
          type: 'DUST',
          x: this.x - (this.vx / dashSpd) * this.radius,
          y: this.y - (this.vy / dashSpd) * this.radius,
          radius: Math.random() * 3 + 2,
          color: isDarkTheme() ? '#8a8f9d' : '#94a3b8',
          life: 14
        });
      }
    }

    this.x += this.vx * gameSpeed;
    this.y += this.vy * gameSpeed;

    if (this.isDashing && !this.dashHitTarget) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist < this.radius + target.radius + 4) {
        this.dashHitTarget = true;
        const dashDmg = this.data.basic.damage; // ★ 공병은 기본 스킬(돌진) 데미지 연동
        applyDamage(target, dashDmg);
        addFloatingText(target.x, target.y - 15, `-${dashDmg}`);
        shakeTimer = 8;

        const knockAngle = Math.atan2(target.y - this.y, target.x - this.x);
        const knockSpeed = 7.5;
        target.vx = Math.cos(knockAngle) * knockSpeed;
        target.vy = Math.sin(knockAngle) * knockSpeed;
      }
    }

    const hitWall = handleWallBounce(this, ARENA_SIZE);
    if (hitWall) {
      playBounceSfx();
    }

    if (hitWall && this.isDashing) {
      this.isDashing = false;
      const normalSpd = (this.data ? this.data.speed : 1.0) * 0.9;
      const curSpd = Math.hypot(this.vx, this.vy) || 1;
      this.vx = (this.vx / curSpd) * normalSpd;
      this.vy = (this.vy / curSpd) * normalSpd;
    }

    if (hitWall && this.wallDebuffTimer > 0) {
      applyDamage(this, 5);
      addFloatingText(this.x, this.y - 15, '-5');
      shakeTimer = 4;
    }

    if (this.isEatable && !this.isEating && !target.isEaten) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist < this.radius + target.radius + 6) {
        this.isEating = true;
        this.isEatable = false;
        target.isEaten = true;
        this.eatingTimer = 210;
        this.eatingDmgTimer = 0;

        playKimEatSfx();
      }
    }

    if (!p1.isEating && !p2.isEating && this.stunTimer <= 0 && !this.isAiming && !this.isFurryBurst && this.skillCool < 100) {
      this.skillCool += this.data.coolSpeed * gameSpeed;
      if (this.skillCool >= 100) {
        this.skillCool = 100;
        this.castSkill(target);
      }
    }
  }

  castSkill(target) {
    this.skillCool = 0;

    const isUltReady = this.ultCharge >= this.data.maxUltCharge;

    if (this.data.basic.type === 'BL_THROW') {
      if (isUltReady) {
        this.ultCharge = 0;
        this.isEatable = true;
        this.eatableTimer = 600;
        shakeTimer = 12;
      } else {
        this.ultCharge++;
        shakeTimer = 6;

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const angle = Math.atan2(dy, dx);
        const projSpeed = 6.5;

        projectiles.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * projSpeed,
          vy: Math.sin(angle) * projSpeed,
          damage: this.data.basic.damage, // ★ 김민채 기본 스킬 데미지 연동
          target: target,
          color: '#ff7675',
          isBL: true,
          life: 140
        });
      }
    } else if (this.data.basic.type === 'DASH_COMPLAINT') {
      if (isUltReady) {
        this.ultCharge = 0;
        shakeTimer = 10;
        skillEffects.push({
          type: 'INSANITY_WARN',
          x: ARENA_SIZE / 2,
          y: ARENA_SIZE / 2,
          radius: 101,
          life: 120,
          maxLife: 120,
          owner: this,
          damage: this.data.ult.damage // ★ 공병은 궁극기(소파) 데미지 연동
        });
      } else {
        playGongSkillSfx();

        this.ultCharge++;
        shakeTimer = 5;
        this.isDashing = true;
        this.dashHitTarget = false;

        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const dashSpd = 3.6;
        this.vx = Math.cos(angle) * dashSpd;
        this.vy = Math.sin(angle) * dashSpd;
      }
    } else if (this.data.basic.type === 'SNIPER_BULLET') {
      this.isAiming = true;
      this.aimTimer = 120;
      this.aimTarget = target;

      if (isUltReady) {
        this.ultCharge = 0;
        this.isUltAim = true;
        playParkUltChargeSfx();
      } else {
        this.ultCharge++;
        this.isUltAim = false;
      }
    } else if (this.data.basic.type === 'POOP_THROW') {
      if (isUltReady) {
        this.ultCharge = 0;
        this.isFurryBurst = true;
        this.furryBurstTimer = 110;
        this.furryBurstTarget = target;
        this.burstShotCount = 0;
        shakeTimer = 18;
      } else {
        shakeTimer = 4;

        const targetX = Math.random() * (ARENA_SIZE - 80) + 40;
        const targetY = Math.random() * (ARENA_SIZE - 80) + 40;

        projectiles.push({
          type: 'POOP_FLYING',
          startX: this.x,
          startY: this.y,
          x: this.x,
          y: this.y,
          targetX: targetX,
          targetY: targetY,
          progress: 0,
          damage: this.data.basic.damage, // ★ 김티비 기본 스킬(똥) 데미지 연동
          owner: this,
          life: 100
        });
      }
    }
  }

  drawLaunchDirection() {
    ctx.save();
    const targetAngle = Math.atan2(this.vy, this.vx);

    const elapsedTime = Date.now() - countdownStartTime;
    const duration = 1300;
    const progress = Math.min(1, elapsedTime / duration); 

    const easeOut = 1 - Math.pow(1 - progress, 3);
    const totalRotation = Math.PI * 4;
    const displayAngle = targetAngle - totalRotation * (1 - easeOut);

    const isLocked = progress >= 1;
    const startDist = this.radius + 3;
    const arrowLength = isLocked ? 20 : 16;

    const x1 = this.x + Math.cos(displayAngle) * startDist;
    const y1 = this.y + Math.sin(displayAngle) * startDist;
    const x2 = this.x + Math.cos(displayAngle) * (startDist + arrowLength);
    const y2 = this.y + Math.sin(displayAngle) * (startDist + arrowLength);

    const isDark = isDarkTheme();
    const defaultColor = isDark ? '#ffffff' : '#0f172a';
    const defaultDimColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 23, 42, 0.6)';

    ctx.beginPath();
    if (!isLocked) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = defaultDimColor;
      ctx.lineWidth = 1.5;
    } else {
      ctx.setLineDash([]);
      ctx.strokeStyle = this.data ? this.data.color : defaultColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = this.data ? this.data.color : defaultColor;
      ctx.shadowBlur = 6;
    }
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.setLineDash([]);
    const headLength = isLocked ? 6 : 5;
    const pulseScale = isLocked ? (1 + Math.sin(Date.now() / 90) * 0.2) : 1;

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLength * pulseScale * Math.cos(displayAngle - Math.PI / 6),
      y2 - headLength * pulseScale * Math.sin(displayAngle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headLength * pulseScale * Math.cos(displayAngle + Math.PI / 6),
      y2 - headLength * pulseScale * Math.sin(displayAngle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = isLocked ? (this.data ? this.data.color : defaultColor) : defaultDimColor;
    ctx.fill();

    ctx.restore();
  }

  draw() {
    if (!this.data) return;

    if (gameState === 'COUNTDOWN') {
      this.drawLaunchDirection();
    }

    ctx.save();
    
    if (this.isEatable) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff3344';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (this.ultCharge >= this.data.maxUltCharge) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffc107';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (!this.isEaten && this.hp > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#12141d';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = this.data.color;
      ctx.stroke();

      const displayEmoji = this.isEating ? '🍽️' : (this.isFurryBurst ? '🦊' : this.data.emoji);

      ctx.font = 'bold 22px "NeoDunggeunmo", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const shakeX = (this.stunTimer > 0 || this.isFurryBurst) ? (Math.random() - 0.5) * 4 : 0;
      const shakeY = (this.stunTimer > 0 || this.isFurryBurst) ? (Math.random() - 0.5) * 4 : 0;
      ctx.fillText(displayEmoji, this.x + shakeX, this.y + 1 + shakeY);
    }

    if (this.isFurryBurst) {
      ctx.font = 'bold 12px "NeoDunggeunmo", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffc107';
      ctx.fillText('✨SSR✨', this.x, this.y - this.radius - 8);
    }

    if (this.eyeStacks.length > 0 && this.hp > 0) {
      this.eyeStacks.forEach(stack => {
        const eyeX = this.x + Math.cos(stack.angle) * (this.radius + 2);
        const eyeY = this.y + Math.sin(stack.angle) * (this.radius + 2);
        ctx.font = 'bold 12px "NeoDunggeunmo", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👁️', eyeX, eyeY);
      });
    }

    if (this.isAiming && this.aimTarget) {
      const aimAngle = Math.atan2(this.aimTarget.y - this.y, this.aimTarget.x - this.x);
      
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(aimAngle);

      ctx.fillStyle = '#2f3542';
      ctx.fillRect(10, -4, 26, 8);
      ctx.fillStyle = this.isUltAim ? '#10ac84' : '#ff3344';
      ctx.fillRect(16, -8, 10, 4);
      ctx.fillStyle = '#ff4757';
      ctx.fillRect(36, -3, 5, 6);

      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.aimTarget.x, this.aimTarget.y);
      ctx.strokeStyle = this.isUltAim ? 'rgba(16, 172, 132, 0.6)' : 'rgba(255, 51, 68, 0.5)';
      ctx.lineWidth = this.isUltAim ? 2 : 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(this.aimTarget.x, this.aimTarget.y);
      
      const pulse = 1 + Math.sin(Date.now() / 50) * 0.15;
      const crossRadius = (this.aimTarget.radius + 12) * pulse;
      const color = this.isUltAim ? '#10ac84' : '#ff3344';

      ctx.strokeStyle = color;
      ctx.lineWidth = this.isUltAim ? 3 : 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.arc(0, 0, crossRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.rotate(Date.now() / 150);
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, crossRadius - 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const lineStart = crossRadius - 6;
      const lineEnd = crossRadius + 12;

      ctx.beginPath();
      ctx.moveTo(-lineEnd, 0); ctx.lineTo(-lineStart, 0);
      ctx.moveTo(lineStart, 0); ctx.lineTo(lineEnd, 0);
      ctx.moveTo(0, -lineEnd); ctx.lineTo(0, -lineStart);
      ctx.moveTo(0, lineStart); ctx.lineTo(0, lineEnd);
      ctx.stroke();

      ctx.restore();
    }

    if (this.stunTimer > 0 && this.hp > 0) {
      const time = Date.now() / 90;
      const starRadius = this.radius + 5;
      for (let i = 0; i < 3; i++) {
        const starAngle = time + (Math.PI * 2 / 3) * i;
        const sx = this.x + Math.cos(starAngle) * starRadius;
        const sy = this.y - 10 + Math.sin(starAngle) * 5;
        ctx.font = 'bold 12px "NeoDunggeunmo", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💫', sx, sy);
      }
    }

    ctx.restore();

    if (this.isWinner) {
      ctx.font = 'bold 20px "NeoDunggeunmo", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', this.x, this.y - this.radius - 6);
    }
  }
}

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
      color: ball.data ? ball.data.color : '#ff3344',
      life: 28,
      maxLife: 28
    });
  }
}

// =========================================================================
// [4] 게임 상태 및 투사체/이펙트 제어
// =========================================================================
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

  if (screenId === 'screen-game') {
    stopBGM();
  } else {
    playBGM();
  }
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

function toggleGameSpeed() {
  if (gameSpeed === 1.0) gameSpeed = 1.5;
  else if (gameSpeed === 1.5) gameSpeed = 0.5;
  else gameSpeed = 1.0;
  btnSpeed.innerText = `⚡ ${gameSpeed.toFixed(1)}x`;
}

// =========================================================================
// [5] 캐릭터 사전 육각형 차트
// =========================================================================
function drawHexagonFrame(hCtx, logicalW, logicalH, charData, scaleProgress) {
  const centerX = logicalW / 2;
  const centerY = logicalH / 2 + 2;
  const radius = 45;

  const labels = ['공격', '방어', '속도', '공격속도', '궁극', '유틸'];
  const keys = ['atk', 'def', 'spd', 'cool', 'ult', 'utl'];
  const stats = charData.stats;

  const isDark = isDarkTheme();
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
  const maxFrames = 22;

  function step() {
    frameCount++;
    const t = Math.min(1, frameCount / maxFrames);
    const easeT = 1 - Math.pow(1 - t, 3);

    hCtx.save();
    hCtx.scale(dpr, dpr);
    hCtx.clearRect(0, 0, logicalW, logicalH);

    drawHexagonFrame(hCtx, logicalW, logicalH, charData, easeT);
    hCtx.restore();

    if (frameCount < maxFrames) {
      dictAnimFrame = requestAnimationFrame(step);
    }
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
  p1.init(CHAR_DB[selectedP1Key]);
  p2.init(CHAR_DB[selectedP2Key]);

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
    if (count > 0) {
      showOverlay(count);
    } else if (count === 0) {
      showOverlay('START!');
    } else {
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

  setTimeout(() => {
    showScreen('screen-char');
  }, 2500);
}

function showOverlay(msg) {
  overlayMsg.innerText = msg;
  overlayMsg.classList.add('active');
}

function hideOverlay() {
  overlayMsg.classList.remove('active');
}

// =========================================================================
// [6] 메인 루프
// =========================================================================
function loop() {
  ctx.save();

  if (shakeTimer > 0) {
    ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
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

    p1.update(p2);
    p2.update(p1);

    if (gameState === 'PLAYING') {
      if (checkBounce(p1, p2)) {
        playBounceSfx();
      }
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

        const distEnemy = Math.hypot(enemy.x - poop.x, enemy.y - poop.y);
        if (distEnemy < enemy.radius + 8) {
          playPoopTrapSfx();
          applyDamage(enemy, poop.damage);
          addFloatingText(enemy.x, enemy.y - 15, `-${poop.damage}`);
          shakeTimer = 10;

          skillEffects.push({
            type: 'MUSHROOM_CLOUD',
            x: poop.x,
            y: poop.y,
            life: 30,
            maxLife: 30
          });

          landedPoops.splice(i, 1);
          continue;
        }

        const distOwner = Math.hypot(owner.x - poop.x, owner.y - poop.y);
        if (distOwner < owner.radius + 8) {
          playPoopEatSfx();
          owner.hp = Math.min(owner.maxHp, owner.hp + 13);
          owner.ultCharge = Math.min(owner.data.maxUltCharge, owner.ultCharge + 1);
          addFloatingText(owner.x, owner.y - 15, '+13 HP', '#55efc4');

          skillEffects.push({
            type: 'MUSHROOM_CLOUD',
            x: poop.x,
            y: poop.y,
            life: 30,
            maxLife: 30
          });

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
        ef.life -= gameSpeed;
      } 
      else if (ef.type === 'MUSHROOM_CLOUD') {
        const progress = 1 - ef.life / ef.maxLife;
        ctx.save();
        ctx.translate(ef.x, ef.y);

        ctx.beginPath();
        ctx.ellipse(0, 0, 48 * progress + 8, 14 * progress + 4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 100, 0, ${1 - progress})`;
        ctx.lineWidth = 4;
        ctx.stroke();

        const stemH = 42 * progress;
        ctx.fillStyle = `rgba(255, 87, 34, ${0.9 * (1 - progress)})`;
        ctx.beginPath();
        ctx.moveTo(-9 * (1 - progress), 0);
        ctx.lineTo(9 * (1 - progress), 0);
        ctx.lineTo(4 * (1 - progress), -stemH);
        ctx.lineTo(-4 * (1 - progress), -stemH);
        ctx.closePath();
        ctx.fill();

        const capY = -stemH;
        const capR = 28 * Math.sin(progress * Math.PI);

        ctx.fillStyle = `rgba(255, 52, 80, ${1 - progress})`;
        ctx.beginPath();
        ctx.arc(0, capY - 4, capR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 214, 0, ${1 - progress})`;
        ctx.beginPath();
        ctx.arc(-capR * 0.45, capY - 7, capR * 0.55, 0, Math.PI * 2);
        ctx.arc(capR * 0.45, capY - 7, capR * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ef.life -= gameSpeed;
      }
      else if (ef.type === 'DEATH_POP') {
        ef.x += ef.vx * gameSpeed;
        ef.y += ef.vy * gameSpeed;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.radius * (ef.life / ef.maxLife), 0, Math.PI * 2);
        ctx.fillStyle = ef.color;
        ctx.fill();
        ef.life -= gameSpeed;
      }
      else if (ef.type === 'AURA') {
        ef.x += (ef.targetX - ef.x) * 0.18;
        ef.y += (ef.targetY - ef.y) * 0.18;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = ef.color;
        ctx.shadowColor = ef.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ef.life -= gameSpeed;
      }
      else if (ef.type === 'CHARGE_PULSE') {
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ef.color;
        ctx.lineWidth = 3 * (ef.life / 20);
        ctx.shadowColor = ef.color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ef.radius += 2.8 * gameSpeed;
        ef.life -= gameSpeed;
      }
      else if (ef.type === 'LASER_BEAM') {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ef.x1, ef.y1);
        ctx.lineTo(ef.x2, ef.y2);
        ctx.strokeStyle = ef.color;
        ctx.lineWidth = 18 * (ef.life / 28);
        ctx.shadowColor = ef.color;
        ctx.shadowBlur = 16;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ef.x1, ef.y1);
        ctx.lineTo(ef.x2, ef.y2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6 * (ef.life / 28);
        ctx.stroke();
        ctx.restore();

        ef.life -= gameSpeed;
      }
      else if (ef.type === 'INSANITY_WARN') {
        const progress = 1 - ef.life / ef.maxLife;

        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 51, 68, 0.15)';
        ctx.fill();
        ctx.strokeStyle = '#ff3344';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.radius * progress, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 51, 68, 0.35)';
        ctx.fill();

        ef.life -= gameSpeed;

        if (ef.life <= 0) {
          playSofaDropSfx();

          skillEffects.push({
            type: 'SOFA_FALL',
            x: ef.x,
            y: ef.y,
            currentY: -60,
            targetY: ef.y,
            radius: ef.radius,
            damage: ef.damage,
            owner: ef.owner,
            life: 18,
            maxLife: 18
          });
        }
      } 
      else if (ef.type === 'SOFA_FALL') {
        const progress = 1 - ef.life / ef.maxLife;
        ef.currentY = -60 + (ef.targetY + 60) * Math.pow(progress, 2);

        ctx.font = 'bold 55px "NeoDunggeunmo", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛋️', ef.x, ef.currentY);

        ef.life -= gameSpeed;

        if (ef.life <= 0) {
          shakeTimer = 18;
          skillEffects.push({ type: 'DUST', x: ef.x, y: ef.y, radius: 105, color: 'rgba(72, 219, 251, 0.3)', life: 10 });

          [p1, p2].forEach(p => {
            if (p !== ef.owner) {
              const dist = Math.hypot(p.x - ef.x, p.y - ef.y);
              if (dist <= ef.radius + p.radius) {
                applyDamage(p, ef.damage);
                p.stunTimer = 60;
                addFloatingText(p.x, p.y - 15, `-${ef.damage}`);
              }
            }
          });
        }
      }

      if (ef.life <= 0) skillEffects.splice(i, 1);
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];

      if (proj.type === 'POOP_FLYING') {
        proj.progress += 0.035 * gameSpeed;
        proj.x = proj.startX + (proj.targetX - proj.startX) * proj.progress;
        proj.y = proj.startY + (proj.targetY - proj.startY) * proj.progress - Math.sin(proj.progress * Math.PI) * 35;

        ctx.font = 'bold 16px "NeoDunggeunmo", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💩', proj.x, proj.y);

        if (proj.progress >= 1.0) {
          landedPoops.push({
            x: proj.targetX,
            y: proj.targetY,
            damage: proj.damage,
            owner: proj.owner
          });
          projectiles.splice(i, 1);
        }
        continue;
      }

      proj.x += proj.vx * gameSpeed;
      proj.y += proj.vy * gameSpeed;
      proj.life -= gameSpeed;

      if (proj.isBL) {
        ctx.save();
        ctx.translate(proj.x, proj.y);
        const blAngle = Math.atan2(proj.vy, proj.vx);
        ctx.rotate(blAngle);

        const grad = ctx.createLinearGradient(-38, 0, 15, 0);
        grad.addColorStop(0, 'rgba(255, 118, 117, 0)');
        grad.addColorStop(0.6, '#ff4757');
        grad.addColorStop(1, '#ffffff');

        ctx.beginPath();
        ctx.moveTo(-38, 0);
        ctx.lineTo(15, 0);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 9;
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 14;
        ctx.stroke();

        ctx.save();
        ctx.rotate(Date.now() / 80);
        ctx.font = 'bold 18px "NeoDunggeunmo", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💖', 0, 0);
        ctx.restore();

        ctx.font = 'bold 24px "NeoDunggeunmo", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 12;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BL', 0, 0);

        ctx.restore();
      }
      else if (proj.isRainbowLaser) {
        ctx.save();
        ctx.translate(proj.x, proj.y);
        const projAngle = Math.atan2(proj.vy, proj.vx);
        ctx.rotate(projAngle);

        const tailGrad = ctx.createLinearGradient(-30, 0, 8, 0);
        tailGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        tailGrad.addColorStop(0.4, proj.color);
        tailGrad.addColorStop(0.85, '#ffffff');
        tailGrad.addColorStop(1, proj.color);

        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.quadraticCurveTo(-12, -4, 8, 0);
        ctx.quadraticCurveTo(-12, 4, -30, 0);
        ctx.fillStyle = tailGrad;
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 14;
        ctx.fill();

        ctx.save();
        ctx.rotate(Date.now() / 45);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 5);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = proj.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      } else if (proj.isBullet) {
        ctx.save();
        ctx.translate(proj.x, proj.y);
        const bulletAngle = Math.atan2(proj.vy, proj.vx);
        ctx.rotate(bulletAngle);

        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(-4, 0);
        ctx.strokeStyle = proj.color || '#ff3344';
        ctx.lineWidth = 3;
        ctx.shadowColor = proj.color || '#ff3344';
        ctx.shadowBlur = 8;
        ctx.stroke();

        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-6, -2.5, 8, 5);

        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(2, -2.5);
        ctx.lineTo(8, 0);
        ctx.lineTo(2, 2.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      const hitMargin = proj.isBL ? 12 : 6;
      const dist = Math.hypot(proj.target.x - proj.x, proj.target.y - proj.y);
      if (dist < proj.target.radius + hitMargin) {
        applyDamage(proj.target, proj.damage);
        addFloatingText(proj.target.x, proj.target.y - 15, `-${proj.damage}`);
        shakeTimer = 5;
        projectiles.splice(i, 1);
        continue;
      }

      if (proj.life <= 0) projectiles.splice(i, 1);
    }

    p1.draw();
    p2.draw();

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 15px "NeoDunggeunmo", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ft.y -= 0.4 * gameSpeed;
      ft.alpha -= 0.03 * gameSpeed;
      if (ft.alpha <= 0) floatingTexts.splice(i, 1);
    }
  }

  ctx.restore();
  requestAnimationFrame(loop);
}

// =========================================================================
// [7] 이벤트 바인딩
// =========================================================================
document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    playClickSfx();
    const gameScreen = document.getElementById('screen-game');
    if (!gameScreen || !gameScreen.classList.contains('active')) {
      playBGM();
    }
  });
});

document.getElementById('bgm-volume').addEventListener('input', (e) => {
  bgm.volume = parseFloat(e.target.value);
});

document.getElementById('btn-start').addEventListener('click', () => showScreen('screen-mode'));
document.getElementById('btn-dict').addEventListener('click', () => {
  showScreen('screen-dict');
  updateDictionaryUI(currentDictKey);
});
document.getElementById('btn-settings').addEventListener('click', () => showScreen('screen-settings'));
document.getElementById('btn-theme-settings').addEventListener('click', toggleTheme);
document.getElementById('btn-speed').addEventListener('click', toggleGameSpeed);
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

requestAnimationFrame(loop);
