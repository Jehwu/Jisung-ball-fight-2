export const CHAR_DB = {
  KIM: {
    name: '김민채',
    emoji: '🐽',
    color: '#ff7675',
    speed: 0.6,
    hp: 250,
    coolSpeed: 0.42, // 4.0초 쿨타임
    maxUltCharge: 4,
    stats: { atk: 85, def: 95, spd: 30, cool: 60, ult: 100, utl: 90 },
    desc: '170KG의 먹방으로 상대를 흡수하고 벽으로 내팽개치는 메가 헤비급 스페셜리스트',
    basic: { name: 'BL 투척', type: 'BL_THROW', damage: 18 }, // 데미지 18로 버프
    ult: { name: '170KG의 먹방', type: 'MUKBANG', damage: 12 }
  },
  GONG: {
    name: '공병은',
    emoji: '🗣️',
    color: '#48dbfb',
    speed: 1.0,
    hp: 250,
    coolSpeed: 0.37, // 4.5초 쿨타임
    maxUltCharge: 3,
    stats: { atk: 80, def: 65, spd: 85, cool: 55, ult: 90, utl: 85 },
    desc: '불만 가득한 직진 돌진과 하늘에서 떨어지는 거대 소파로 상대를 기절시키는 밸런서',
    basic: { name: '불만하지', type: 'DASH_COMPLAINT', damage: 20 },
    ult: { name: '버츄얼 인세니티', type: 'VIRTUAL_INSANITY', damage: 40 }
  },
  PARK: {
    name: '박지성',
    emoji: '👁️',
    color: '#10ac84',
    speed: 1.3, // 빠름
    hp: 250,
    coolSpeed: 0.28, // 6.0초 쿨타임
    maxUltCharge: 2, // 기본스킬 2회 사용 후 궁극기
    stats: { atk: 90, def: 60, spd: 90, cool: 50, ult: 95, utl: 85 },
    desc: '2초 정밀 조준 후 고속 저격 탄환 발사 및 눈(👁️) 중첩 부착으로 상대를 압박하는 정밀 저격수',
    basic: { name: '저격 탄환', type: 'SNIPER_BULLET', damage: 25 },
    ult: { name: 'I SEE YOU', type: 'I_SEE_YOU', damage: 0 }
  }
};
