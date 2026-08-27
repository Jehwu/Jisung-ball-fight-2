import { handleWallBounce } from './physics.js';
import { invertColor } from './effects.js';
import { 
  parkShootPool, parkUltChargePool, parkUltShootPool, 
  gongSkillPool, kimEatPool, kimSpitPool, gaeunLinePool, gaeunUltPool,
  geonwooWavePool, geonwooSmokePool,
  criminalDaggerPool,
  kimThrowPool, gongUltPool, parkAimPool, poopThrowPool
} from './audio.js';

export class Ball {
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
    this.color = '#ffffff';
    this.isMirrorP2 = false;

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

    this.scrollEffectTimer = 0;
    this.scrollDmgTimer = 0;
    this.scrollUltDmg = 45;

    this.counterStanceTimer = 0;
  }

  init(charData, isP2 = false, isMirror = false) {
    this.data = charData;
    this.isMirrorP2 = (isP2 && isMirror);
    this.color = this.isMirrorP2 ? invertColor(charData.color) : charData.color;
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

    this.scrollEffectTimer = 0;
    this.scrollDmgTimer = 0;
    this.scrollUltDmg = 45;

    this.counterStanceTimer = 0;

    const charSpeed = this.data ? (this.data.speed || 1.5) : 1.5;
    const randomAngle = Math.random() * Math.PI * 2;
    const baseSpeed = 0.9 * charSpeed;
    this.vx = Math.cos(randomAngle) * baseSpeed;
    this.vy = Math.sin(randomAngle) * baseSpeed;
    this.isWinner = false;
  }

  update(target, gameState, applyDamage, addFloatingText, skillEffects, projectiles, ARENA_SIZE, triggerShake) {
    if (gameState !== 'PLAYING') return;

    if (this.counterStanceTimer > 0) {
      this.counterStanceTimer -= 1;
    }

    if (this.eyeStacks.length > 0 && this.hp > 0) {
      this.eyeDmgTimer += 1;
      if (this.eyeDmgTimer >= 60) {
        this.eyeDmgTimer = 0;
        const totalDmg = this.eyeStacks.length * 3;
        applyDamage(this, totalDmg);
        addFloatingText(this.x, this.y - 18, `-${totalDmg}`, '#ff3344');
      }
    }

    if (this.stunTimer > 0) {
      this.stunTimer -= 1;
      return;
    }

    if (this.wallDebuffTimer > 0) {
      this.wallDebuffTimer -= 1;
    }

    if (this.isEatable) {
      this.eatableTimer -= 1;
      if (this.eatableTimer <= 0) this.isEatable = false;
    }

    if (this.scrollEffectTimer > 0) {
      this.scrollEffectTimer -= 1;
      this.vy += 0.55;

      if (this.y + this.radius >= ARENA_SIZE - 3) {
        this.scrollDmgTimer += 1;
        if (this.scrollDmgTimer >= 20) {
          this.scrollDmgTimer = 0;
          const tickDmg = Math.floor((this.scrollUltDmg || 45) / 15);
          applyDamage(this, tickDmg);
          addFloatingText(this.x + (Math.random() - 0.5) * 12, this.y - 18, `-${tickDmg}`, '#ff3344');
          triggerShake(3);

          for (let k = 0; k < 5; k++) {
            skillEffects.push({
              type: 'DUST',
              x: this.x + (Math.random() - 0.5) * 24,
              y: ARENA_SIZE - 2,
              radius: Math.random() * 4 + 2,
              color: '#e84393',
              life: 14
            });
          }
        }
      }

      if (this.scrollEffectTimer === 0) {
        const charSpeed = this.data ? (this.data.speed || 1.5) : 1.5;
        const randAngle = Math.random() * Math.PI * 2;
        const baseSpd = 0.9 * charSpeed;
        this.vx = Math.cos(randAngle) * baseSpd;
        this.vy = Math.sin(randAngle) * baseSpd;
      }
    }

    if (this.isFurryBurst && this.furryBurstTarget) {
      this.furryBurstTimer -= 1;
      this.vx = 0;
      this.vy = 0;
      triggerShake(4);

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

      if (Math.floor(this.furryBurstTimer) % 12 === 0 && this.burstShotCount < 8) {
        this.burstShotCount++;
        parkShootPool.play();

        const angle = Math.atan2(this.furryBurstTarget.y - this.y, this.furryBurstTarget.x - this.x) + (Math.random() - 0.5) * 0.15;
        const shotDmg = Math.floor((this.data.ult.damage || 40) / 8);

        projectiles.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * 12.0,
          vy: Math.sin(angle) * 12.0,
          damage: shotDmg,
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
        const charSpeed = this.data ? (this.data.speed || 1.5) : 1.5;
        const resumeAngle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(resumeAngle) * 0.9 * charSpeed;
        this.vy = Math.sin(resumeAngle) * 0.9 * charSpeed;
      }
      return;
    }

    if (this.isAiming && this.aimTarget) {
      this.aimTimer -= 1;
      this.vx = 0;
      this.vy = 0;

      if (this.isUltAim) {
        triggerShake(2);

        for (let i = 0; i < 3; i++) {
          const auraAngle = Math.random() * Math.PI * 2;
          const auraDist = Math.random() * 50 + 15;
          skillEffects.push({
            type: 'AURA',
            x: this.x + Math.cos(auraAngle) * auraDist,
            y: this.y + Math.sin(auraAngle) * auraDist,
            targetX: this.x,
            targetY: this.y,
            color: Math.random() < 0.5 ? this.color : '#ffffff',
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
            color: this.color,
            life: 20
          });
        }
      }

      if (this.aimTimer <= 0) {
        this.isAiming = false;
        
        const charSpeed = this.data ? (this.data.speed || 1.5) : 1.5;
        const resumeAngle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(resumeAngle) * 0.9 * charSpeed;
        this.vy = Math.sin(resumeAngle) * 0.9 * charSpeed;

        if (this.isUltAim) {
          triggerShake(20);
          parkUltShootPool.play();

          skillEffects.push({
            type: 'LASER_BEAM',
            x1: this.x,
            y1: this.y,
            x2: this.aimTarget.x,
            y2: this.aimTarget.y,
            color: this.color,
            life: 28
          });

          applyDamage(this.aimTarget, 0);
          addFloatingText(this.aimTarget.x, this.aimTarget.y - 20, '-0', '#ff3344');
          
          const hitAngle = Math.atan2(this.y - this.aimTarget.y, this.x - this.aimTarget.x);
          this.aimTarget.eyeStacks.push({ angle: hitAngle });
        } else {
          triggerShake(8);
          parkShootPool.play();

          const angle = Math.atan2(this.aimTarget.y - this.y, this.aimTarget.x - this.x);
          projectiles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * 13.0,
            vy: Math.sin(angle) * 13.0,
            damage: 23,
            target: this.aimTarget,
            color: this.color,
            isBullet: true,
            life: 100
          });
        }
      }
      return;
    }

    if (this.isEating) {
      this.eatingTimer -= 1;
      this.eatingDmgTimer += 1;

      target.x = this.x;
      target.y = this.y;
      target.vx = 0;
      target.vy = 0;

      for (let k = 0; k < 3; k++) {
        const spiralAngle = Math.random() * Math.PI * 2;
        const spiralDist = Math.random() * 45 + 15;
        skillEffects.push({
          type: 'AURA',
          x: this.x + Math.cos(spiralAngle) * spiralDist,
          y: this.y + Math.sin(spiralAngle) * spiralDist,
          targetX: this.x,
          targetY: this.y,
          color: Math.random() < 0.5 ? this.color : '#e84393',
          life: 16
        });
      }

      if (this.eatingDmgTimer >= 60) {
        this.eatingDmgTimer = 0;
        applyDamage(target, 15);
        addFloatingText(this.x, this.y - 20, '-15', '#ff3344');
        triggerShake(8);
      }

      if (this.eatingTimer <= 0) {
        this.isEating = false;
        target.isEaten = false;

        kimSpitPool.play();

        const angle = Math.random() * Math.PI * 2;
        target.vx = Math.cos(angle) * 32.0;
        target.vy = Math.sin(angle) * 32.0;

        const mySpeed = (this.data ? this.data.speed : 1.5) * 0.9;
        this.vx = (Math.random() < 0.5 ? 1 : -1) * mySpeed;
        this.vy = (Math.random() < 0.5 ? 1 : -1) * mySpeed;

        target.wallDebuffTimer = 120;
        triggerShake(20);

        for (let k = 0; k < 16; k++) {
          const pAngle = Math.random() * Math.PI * 2;
          const pSpd = Math.random() * 8 + 3;
          skillEffects.push({
            type: 'DEATH_POP',
            x: this.x,
            y: this.y,
            vx: Math.cos(pAngle) * pSpd,
            vy: Math.sin(pAngle) * pSpd,
            radius: Math.random() * 5 + 2,
            color: this.color,
            life: 20,
            maxLife: 20
          });
        }
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

      const dashSpd = 5.25;
      this.vx = Math.cos(currentAngle) * dashSpd;
      this.vy = Math.sin(currentAngle) * dashSpd;

      for (let d = 0; d < 2; d++) {
        skillEffects.push({
          type: 'DUST',
          x: this.x - Math.cos(currentAngle) * (this.radius - 2),
          y: this.y - Math.sin(currentAngle) * (this.radius - 2),
          radius: Math.random() * 4 + 2,
          color: Math.random() < 0.6 ? '#8a8f9d' : '#a4b0be',
          life: 18
        });
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    if (!this.isEaten && !this.isEating && !this.isAiming && !this.isFurryBurst && this.stunTimer <= 0) {
      const charSpeed = this.data ? this.data.speed : 1.5;
      const baseSpd = 0.9 * charSpeed;
      const minSpd = baseSpd * 0.5;
      const maxSpd = baseSpd * 1.5;

      let currentSpd = Math.hypot(this.vx, this.vy);

      if (currentSpd < 0.001) {
        const randA = Math.random() * Math.PI * 2;
        this.vx = Math.cos(randA) * minSpd;
        this.vy = Math.sin(randA) * minSpd;
        currentSpd = minSpd;
      }

      if (currentSpd < minSpd) {
        const scale = minSpd / currentSpd;
        this.vx *= scale;
        this.vy *= scale;
      } else if (currentSpd > maxSpd && !this.isDashing && this.wallDebuffTimer <= 0) {
        const scale = maxSpd / currentSpd;
        this.vx *= scale;
        this.vy *= scale;
      }
    }

    if (this.isDashing && !this.dashHitTarget) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist < this.radius + target.radius + 4) {
        this.dashHitTarget = true;
        applyDamage(target, 20);
        addFloatingText(target.x, target.y - 15, '-20', '#ff3344');
        triggerShake(10);

        const knockAngle = Math.atan2(target.y - this.y, target.x - this.x);
        target.vx = Math.cos(knockAngle) * 8.5;
        target.vy = Math.sin(knockAngle) * 8.5;
      }
    }

    const hitWall = handleWallBounce(this, ARENA_SIZE);

    if (hitWall && this.isDashing) {
      this.isDashing = false;
      const normalSpd = (this.data ? this.data.speed : 1.5) * 0.9;
      const curSpd = Math.hypot(this.vx, this.vy) || 1;
      this.vx = (this.vx / curSpd) * normalSpd;
      this.vy = (this.vy / curSpd) * normalSpd;
    }

    if (hitWall && this.wallDebuffTimer > 0) {
      applyDamage(this, 5);
      addFloatingText(this.x, this.y - 15, '-5', '#ff3344');
      triggerShake(4);
    }

    if (this.isEatable && !this.isEating && !target.isEaten) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist < this.radius + target.radius + 6) {
        this.isEating = true;
        this.isEatable = false;
        target.isEaten = true;
        this.eatingTimer = 210;
        this.eatingDmgTimer = 0;
        kimEatPool.play();
      }
    }

    // 쿨타임 충전 (0.65 배율 제거 후 coolSpeed 정수치대로 프레임마다 누적)
    if (!this.isEating && !target.isEating && this.stunTimer <= 0 && !this.isAiming && !this.isFurryBurst) {
      if (this.skillCool < 100) {
        this.skillCool += this.data.coolSpeed;
      }
      if (this.skillCool >= 100) {
        this.skillCool = 100;
        this.castSkill(target, skillEffects, projectiles, ARENA_SIZE, triggerShake, addFloatingText);
      }
    }
  }

  castSkill(target, skillEffects, projectiles, ARENA_SIZE, triggerShake, addFloatingText) {
    this.skillCool = 0;
    const isUltReady = this.ultCharge >= this.data.maxUltCharge;
    const skillType = this.data.basic.type;

    if (skillType === 'BL_THROW') {
      if (isUltReady) {
        this.ultCharge = 0;
        this.isEatable = true;
        this.eatableTimer = 600;
        triggerShake(12);
      } else {
        this.ultCharge++;
        triggerShake(5);
        kimThrowPool.play();

        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        projectiles.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * 5.5,
          vy: Math.sin(angle) * 5.5,
          damage: 15,
          target: target,
          color: this.color,
          isBL: true,
          life: 140
        });
      }
    } else if (skillType === 'DASH_COMPLAINT') {
      if (isUltReady) {
        this.ultCharge = 0;
        triggerShake(10);
        gongUltPool.play();
        skillEffects.push({
          type: 'INSANITY_WARN',
          x: ARENA_SIZE / 2,
          y: ARENA_SIZE / 2,
          radius: 110,
          life: 120,
          maxLife: 120,
          owner: this,
          damage: 40
        });
      } else {
        gongSkillPool.play();
        this.ultCharge++;
        triggerShake(5);
        this.isDashing = true;
        this.dashHitTarget = false;

        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.vx = Math.cos(angle) * 5.25;
        this.vy = Math.sin(angle) * 5.25;
      }
    } else if (skillType === 'SNIPER_SHOT' || skillType === 'SNIPER_BULLET') {
      this.isAiming = true;
      this.aimTimer = 120;
      this.aimTarget = target;

      if (isUltReady) {
        this.ultCharge = 0;
        this.isUltAim = true;
        parkUltChargePool.play();
      } else {
        this.ultCharge++;
        this.isUltAim = false;
        parkAimPool.play();
      }
    } else if (skillType === 'POOP_BOMB' || skillType === 'POOP_THROW') {
      if (isUltReady) {
        this.ultCharge = 0;
        this.isFurryBurst = true;
        this.furryBurstTimer = 110;
        this.furryBurstTarget = target;
        this.burstShotCount = 0;
        triggerShake(18);
      } else {
        triggerShake(4);
        poopThrowPool.play();
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
          damage: 20,
          owner: this,
          life: 100
        });
      }
    } else if (skillType === 'SKETCH_CUT' || skillType === 'CUT_DIVIDE') {
      if (isUltReady) {
        this.ultCharge = 0;
        triggerShake(20);
        gaeunUltPool.play();

        target.scrollEffectTimer = 300;
        target.scrollDmgTimer = 0;
        target.scrollUltDmg = this.data.ult.damage;

        skillEffects.push({
          type: 'WEBTOON_SCROLL_UI',
          color: this.color,
          life: 300,
          maxLife: 300
        });
      } else {
        this.ultCharge++;
        triggerShake(12);
        gaeunLinePool.play();

        const idx = skillEffects.findIndex(ef => ef.type === 'CUT_LINE' && ef.owner === this);
        if (idx !== -1) skillEffects.splice(idx, 1);

        const randX = Math.random() * (ARENA_SIZE - 60) + 30;
        const randY = Math.random() * (ARENA_SIZE - 60) + 30;
        const randAngle = Math.random() * Math.PI * 2;
        const len = 500;

        skillEffects.push({
          type: 'CUT_LINE',
          x1: randX - Math.cos(randAngle) * len,
          y1: randY - Math.sin(randAngle) * len,
          x2: randX + Math.cos(randAngle) * len,
          y2: randY + Math.sin(randAngle) * len,
          owner: this,
          target: target,
          color: this.color,
          damage: 15,
          life: 240,
          maxLife: 240,
          triggered: false
        });
      }
    } else if (skillType === 'LOW_VOICE' || skillType === 'SUBWOOFER') {
      if (isUltReady) {
        this.ultCharge = 0;
        triggerShake(22);
        geonwooSmokePool.play();

        for (let k = 0; k < 2; k++) {
          let rx, ry;

          if (k === 0) {
            rx = target.x;
            ry = target.y;
          } else {
            rx = Math.random() * (ARENA_SIZE - 100) + 50;
            ry = Math.random() * (ARENA_SIZE - 100) + 50;
          }

          rx = Math.max(40, Math.min(ARENA_SIZE - 40, rx));
          ry = Math.max(40, Math.min(ARENA_SIZE - 40, ry));

          skillEffects.push({
            type: 'NIGHTFALL_ZONE',
            x: rx,
            y: ry,
            radius: 72,
            owner: this,
            target: target,
            color: this.color,
            damage: this.data.ult.damage,
            life: 270,
            maxLife: 270,
            dropTimer: 0,
            maxDropTime: 25,
            tickTimer: 0
          });
        }
      } else {
        this.ultCharge++;
        triggerShake(12);
        geonwooWavePool.play();

        skillEffects.push({
          type: 'SUBWOOFER_WAVE',
          x: this.x,
          y: this.y,
          radius: 10,
          maxRadius: 111.32,
          owner: this,
          target: target,
          color: this.color,
          damage: 18,
          life: 22,
          maxLife: 22,
          hit: false
        });
      }
    } else if (skillType === 'PICKPOCKET_DAGGER' || skillType === 'CRIMINAL_DAGGER') {
      if (isUltReady) {
        this.ultCharge = 0;
        this.counterStanceTimer = 180;
        triggerShake(8);
      } else {
        this.ultCharge++;
        triggerShake(4);

        const baseAngle = Math.atan2(target.y - this.y, target.x - this.x);
        [-0.08, 0.08].forEach((offsetAngle, idx) => {
          setTimeout(() => {
            criminalDaggerPool.play();
            projectiles.push({
              x: this.x,
              y: this.y,
              vx: Math.cos(baseAngle + offsetAngle) * 9.5,
              vy: Math.sin(baseAngle + offsetAngle) * 9.5,
              damage: 7,
              target: target,
              owner: this,
              color: this.color,
              isDagger: true,
              life: 90
            });
          }, idx * 80);
        });
      }
    }
  }

  drawLaunchDirection(ctx, countdownStartTime) {
    ctx.save();
    const targetAngle = Math.atan2(this.vy, this.vx);
    const elapsedTime = Date.now() - countdownStartTime;
    const progress = Math.min(1, elapsedTime / 1300); 

    const easeOut = 1 - Math.pow(1 - progress, 3);
    const displayAngle = targetAngle - (Math.PI * 4) * (1 - easeOut);

    const isLocked = progress >= 1;
    const startDist = this.radius + 3;
    const arrowLength = isLocked ? 20 : 16;

    const x1 = this.x + Math.cos(displayAngle) * startDist;
    const y1 = this.y + Math.sin(displayAngle) * startDist;
    const x2 = this.x + Math.cos(displayAngle) * (startDist + arrowLength);
    const y2 = this.y + Math.sin(displayAngle) * (startDist + arrowLength);

    ctx.beginPath();
    if (!isLocked) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
    } else {
      ctx.setLineDash([]);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = this.color;
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
    ctx.fillStyle = isLocked ? this.color : 'rgba(255, 255, 255, 0.6)';
    ctx.fill();

    ctx.restore();
  }

  draw(ctx, gameState, countdownStartTime) {
    if (!this.data) return;

    if (gameState === 'COUNTDOWN') {
      this.drawLaunchDirection(ctx, countdownStartTime);
    }

    ctx.save();
    
    if (this.isEatable) {
      ctx.save();
      const rotAngle = (Date.now() / 150) % (Math.PI * 2);
      
      const grad = ctx.createRadialGradient(this.x, this.y, this.radius * 0.5, this.x, this.y, this.radius + 18);
      grad.addColorStop(0, 'rgba(255, 51, 68, 0.55)');
      grad.addColorStop(0.6, 'rgba(120, 10, 25, 0.38)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 18, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.translate(this.x, this.y);
      ctx.rotate(rotAngle);
      
      ctx.fillStyle = '#ff1744';
      const spikes = 8;
      for (let i = 0; i < spikes; i++) {
        const a = (Math.PI * 2 / spikes) * i;
        const outerR = this.radius + 14 + Math.sin(Date.now() / 80 + i) * 2;
        const innerR = this.radius + 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
        ctx.lineTo(Math.cos(a + 0.22) * innerR, Math.sin(a + 0.22) * innerR);
        ctx.lineTo(Math.cos(a - 0.22) * innerR, Math.sin(a - 0.22) * innerR);
        ctx.closePath();
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#d50000';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 10;
      ctx.stroke();

      ctx.restore();
    }

    if (this.counterStanceTimer > 0) {
      ctx.save();
      const rotAngle = (Date.now() / 700) % (Math.PI * 2);
      ctx.translate(this.x, this.y);
      ctx.rotate(rotAngle);

      ctx.strokeStyle = '#c23616';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#c23616';
      ctx.shadowBlur = 12;

      const ringR = this.radius + 8;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k;
        const outerR = ringR + 6;
        const innerR = ringR - 2;
        ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
        ctx.lineTo(Math.cos(a + Math.PI / 6) * innerR, Math.sin(a + Math.PI / 6) * innerR);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 71, 87, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
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
      
      if (this.isMirrorP2) {
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#12141d';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#12141d';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.color;
        ctx.stroke();
      }

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
      ctx.fillStyle = this.isUltAim ? this.color : '#ff3344';
      ctx.fillRect(16, -8, 10, 4);
      ctx.fillStyle = '#ff4757';
      ctx.fillRect(36, -3, 5, 6);

      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.aimTarget.x, this.aimTarget.y);
      ctx.strokeStyle = this.isUltAim ? this.color : 'rgba(255, 51, 68, 0.5)';
      ctx.lineWidth = this.isUltAim ? 2 : 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(this.aimTarget.x, this.aimTarget.y);
      
      const pulse = 1 + Math.sin(Date.now() / 50) * 0.15;
      const crossRadius = (this.aimTarget.radius + 12) * pulse;
      const color = this.isUltAim ? this.color : '#ff3344';

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
