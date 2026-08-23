export const CHAR_DB = {
  KIM: {
    name: '김민채',
    emoji: '🐽',
    color: '#ff7675',
    speed: 0.6,
    hp: 300,
    coolSpeed: 0.42, // 4.0초 쿨타임
    maxUltCharge: 4,
    stats: { atk: 85, def: 95, spd: 30, cool: 60, ult: 100, utl: 90 },
    desc: '170KG의 먹방으로 상대를 흡수하고 벽으로 내팽개치는 메가 헤비급 스페셜리스트',
    basic: { name: 'BL 투척', type: 'BL_THROW', damage: 13 },
    ult: { name: '170KG의 먹방', type: 'MUKBANG', damage: 12 }
  },
  GONG: {
    name: '공병은',
    emoji: '🗣️',
    color: '#48dbfb',
    speed: 1.0,
    hp: 250,
    coolSpeed: 0.33, // 5.0초 쿨타임
    maxUltCharge: 3,
    stats: { atk: 80, def: 65, spd: 85, cool: 55, ult: 90, utl: 85 },
    desc: '불만 가득한 직진 돌진과 하늘에서 떨어지는 거대 소파로 상대를 기절시키는 밸런서',
    basic: { name: '불만하지', type: 'DASH_COMPLAINT', damage: 20 },
    ult: { name: '버츄얼 인세니티', type: 'VIRTUAL_INSANITY', damage: 40 }
  }
};
