export const CHAR_DB = {
  KIM: {
    name: '김민채',
    emoji: '🐽',
    color: '#ff7675',
    speed: 0.6,
    hp: 250,
    coolSpeed: 0.416, // 정확히 4.0초 쿨타임
    maxUltCharge: 4,
    stats: { atk: 75, def: 90, spd: 35, cool: 60, ult: 85, utl: 80 },
    desc: '170KG의 먹방으로 상대를 흡수하고 초고속으로 벽에 내팽개치는 메가 헤비급 스페셜리스트',
    basic: { name: 'BL 투척', type: 'BL_THROW', damage: 15 },
    ult: { name: '170KG의 먹방', type: 'MUKBANG', damage: 15 }
  },
  GONG: {
    name: '공병은',
    emoji: '🗣️',
    color: '#48dbfb',
    speed: 1.0,
    hp: 250,
    coolSpeed: 0.37, // 정확히 4.5초 쿨타임
    maxUltCharge: 3,
    stats: { atk: 86, def: 70, spd: 99, cool: 62, ult: 82, utl: 75 },
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
    stats: { atk: 85, def: 45, spd: 90, cool: 41, ult: 88, utl: 79 },
    desc: '2초 정밀 조준 후 고속 저격 탄환 발사 및 눈(👁️) 중첩 부착으로 상대를 압박하는 정밀 저격수',
    basic: { name: '저격 탄환', type: 'SNIPER_BULLET', damage: 23 },
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
    stats: { atk: 78, def: 75, spd: 70, cool: 70, ult: 88, utl: 85 },
    desc: '똥 파밍으로 체력 회복 및 궁극기를 충전하고 SSR 무지개 레이저를 난사하는 스페셜리스트',
    basic: { name: '속보: 똥 투척', type: 'POOP_THROW', damage: 20 },
    ult: { name: 'SSR 퍼리 버스트!', type: 'FURRY_BURST', damage: 45 }
  },
  GAEUN: {
    name: '김가은',
    emoji: '🎨',
    color: '#e84393',
    speed: 1.0,
    hp: 250,
    coolSpeed: 0.416, // 정확히 4.0초 쿨타임
    maxUltCharge: 3,
    stats: { atk: 82, def: 65, spd: 68, cool: 65, ult: 85, utl: 88 },
    desc: '아레나를 관통하는 대형 웹툰 먹선으로 궤적을 끊고 5초간 전장을 하향 스크롤시키는 컨트롤러',
    basic: { name: '컷 가르기', type: 'CUT_DIVIDE', damage: 15 },
    ult: { name: '폭풍 스크롤', type: 'WEBTOON_SCROLL', damage: 40 }
  }
};
