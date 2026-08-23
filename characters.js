export const CHAR_DB = {
  KIM: {
    name: '김민채',
    emoji: '🐽',
    color: '#ff7675',
    speed: 0.6,
    hp: 250,
    coolSpeed: 0.42,
    maxUltCharge: 4,
    stats: { atk: 75, def: 95, spd: 30, cool: 60, ult: 90, utl: 85 },
    desc: '170KG의 먹방으로 상대를 흡수하고 초고속으로 벽에 내팽개치는 메가 헤비급 스페셜리스트',
    basic: { name: 'BL 투척', type: 'BL_THROW', damage: 17 }, // ★ 앞으로 이 숫만 바꾸면 됩니다!
    ult: { name: '170KG의 먹방', type: 'MUKBANG', damage: 13 }   // ★ 먹방 초당 데미지
  },
  GONG: {
    name: '공병은',
    emoji: '🗣️',
    color: '#48dbfb',
    speed: 1.0,
    hp: 250,
    coolSpeed: 0.37,
    maxUltCharge: 3,
    stats: { atk: 85, def: 53, spd: 88, cool: 72, ult: 87, utl: 67 },
    desc: '불만 가득한 직진 돌진과 하늘에서 떨어지는 거대 소파로 상대를 기절시키는 밸런서',
    basic: { name: '불만하지', type: 'DASH_COMPLAINT', damage: 20 },
    ult: { name: '버츄얼 인세니티', type: 'VIRTUAL_INSANITY', damage: 40 }
  },
  PARK: {
    name: '박지성',
    emoji: '👁️',
    color: '#10ac84',
    speed: 1.3,
    hp: 250,
    coolSpeed: 0.28,
    maxUltCharge: 2,
    stats: { atk: 88, def: 35, spd: 95, cool: 37, ult: 85, utl: 80 },
    desc: '2초 정밀 조준 후 고속 저격 탄환 발사 및 눈(👁️) 중첩 부착으로 상대를 압박하는 정밀 저격수',
    basic: { name: '저격 탄환', type: 'SNIPER_BULLET', damage: 25 },
    ult: { name: 'I SEE YOU', type: 'I_SEE_YOU', damage: 0 }
  },
  TV: {
    name: '김티비',
    emoji: '📺',
    color: '#e056fd',
    speed: 1.0,
    hp: 250,
    coolSpeed: 0.48,
    maxUltCharge: 3,
    stats: { atk: 72, def: 76, spd: 66, cool: 93, ult: 95, utl: 64 },
    desc: '모든 분야에 우수한 육각형 올라운더 및 똥 파밍 치유와 SSR 무지개 퍼리 버스트를 난사하는 스페셜리스트',
    basic: { name: '속보: 똥 투척', type: 'POOP_THROW', damage: 20 },
    ult: { name: 'SSR 퍼리 버스트!', type: 'FURRY_BURST', damage: 45 } // 총 9발 발사 (발당 궁극기 딜 / 9)
  }
};
