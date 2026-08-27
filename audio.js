export const bgm = new Audio('sounds/bgm.mp3');
bgm.loop = true;
bgm.volume = 0.5;

export class SoundPool {
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

export const clickPool = new SoundPool('sounds/click.mp3', 3);
export const gongSkillPool = new SoundPool('sounds/gong_skill.mp3', 3);
export const sofaDropPool = new SoundPool('sounds/sofa_drop.mp3', 3);
export const kimEatPool = new SoundPool('sounds/kim_eat.mp3', 3);
export const kimSpitPool = new SoundPool('sounds/kim_spit.mp3', 3);
export const bouncePool = new SoundPool('sounds/bounce.mp3', 6);
export const parkShootPool = new SoundPool('sounds/park_shoot.mp3', 3);
export const parkUltChargePool = new SoundPool('sounds/park_ult_charge.mp3', 2);
export const parkUltShootPool = new SoundPool('sounds/park_ult_shoot.mp3', 2);
export const poopTrapPool = new SoundPool('sounds/poop_trap.mp3', 3);
export const poopEatPool = new SoundPool('sounds/poop_eat.mp3', 3);
export const gaeunLinePool = new SoundPool('sounds/gaeun_line.mp3', 3);
export const gaeunCutPool = new SoundPool('sounds/gaeun_cut.mp3', 3);
export const gaeunUltPool = new SoundPool('sounds/gaeun_ult.mp3', 2);

// 김건우 스킬 사운드 풀
export const geonwooWavePool = new SoundPool('sounds/geonwoo_wave.mp3', 3);
export const geonwooSmokePool = new SoundPool('sounds/geonwoo_smoke.mp3', 3);

// 흉악범 전용 사운드 풀
export const criminalDaggerPool = new SoundPool('sounds/criminal_dagger.mp3', 3); // 단검 던지기
export const criminalParryPool = new SoundPool('sounds/criminal_parry.mp3', 3);   // 반격 순간이동
export const criminalBombPool = new SoundPool('sounds/criminal_bomb.mp3', 3);     // 허수아비 폭탄 폭발

// 대거 추가된 사운드 풀
export const kimThrowPool = new SoundPool('sounds/kim_throw.mp3', 3);  // 김민채 기본스킬 투사체
export const gongUltPool = new SoundPool('sounds/gong_ult.mp3', 2);    // 공병은 궁 발동시
export const parkAimPool = new SoundPool('sounds/park_aim.mp3', 3);    // 박지성 기본스킬 조준
export const poopThrowPool = new SoundPool('sounds/poop_throw.mp3', 3); // 김티비 똥 던질때
export const hitPool = new SoundPool('sounds/hit.mp3', 5);             // 전체 공 피해 피격음

// 쿠죠 박타로 신규 사운드 풀 (경로 통일)
export const kujoPunchPool = new SoundPool('sounds/kujo_punch.mp3', 6);
export const timeStopChargePool = new SoundPool('sounds/timestop_charge.mp3', 2);
export const arrowThrowPool = new SoundPool('sounds/arrow_throw.mp3', 2);

let lastBounceTime = 0;
export function playBounceSfx() {
  const now = Date.now();
  if (now - lastBounceTime >= 100) {
    lastBounceTime = now;
    bouncePool.play(bgm.volume);
  }
}

export function playBGM() { if (bgm.paused) bgm.play().catch(() => {}); }
export function stopBGM() { bgm.pause(); bgm.currentTime = 0; }

// 기존 main.js와의 호환을 위한 더미 함수 추가 (오류 방지)
export function unlockAudioContext() {
  playBGM();
}
