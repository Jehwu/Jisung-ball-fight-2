export const CHAR_DB = {
  KIM: {
    name: '김민채',
    emoji: '🐽',
    color: '#ff3344',
    hp: 250,
    speed: 1.5,
    coolSpeed: 0.37,
    maxUltCharge: 3,
    stats: { atk: 68, def: 86, spd: 50, cool: 85, ult: 74, utl: 69 },
    desc: 'BL지식을 바탕으로 상대를 매료시키고 강력한 흡입력으로 집어삼킵니다.',
    basic: { name: 'BL을 보라고!', damage: 15, type: 'BL_THROW' },
    ult: { name: '170KG급 먹방', damage: 45, type: 'EAT_ALL' }
  },
  GONG: {
    name: '공병은',
    emoji: '🗣️',
    color: '#00e676',
    hp: 250,
    speed: 1.625,
    coolSpeed: 0.44,
    maxUltCharge: 3,
    stats: { atk: 75, def: 43, spd: 95, cool: 68, ult: 88, utl: 71 },
    desc: '끊임없는 불평과 돌진으로 적을 교란하고 소파를 떨어뜨립니다.',
    basic: { name: '난 불만하지', damage: 20, type: 'DASH_COMPLAINT' },
    ult: { name: '버츄얼 인세니티', damage: 40, type: 'SOFA_DROP' }
  },
  PARK: {
    name: '박지성',
    emoji: '👁️',
    color: '#00d2d3',
    hp: 250,
    speed: 1.375,
    coolSpeed: 0.30,
    maxUltCharge: 2,
    stats: { atk: 95, def: 41, spd: 79, cool: 39, ult: 94, utl: 66 },
    desc: '조준 사격으로 적을 저격하고 궁극기로 레이저 빔을 발사합니다.',
    basic: { name: '저격왕', damage: 23, type: 'SNIPER_BULLET' },
    ult: { name: 'I SEE YOU', damage: 0, type: 'EYE_LASER' }
  },
  TV: {
    name: '김티비',
    emoji: '📺',
    color: '#ff9f43',
    hp: 250,
    speed: 1.5625,
    coolSpeed: 0.40,
    maxUltCharge: 3,
    stats: { atk: 68, def: 53, spd: 64, cool: 83, ult: 86, utl: 100 },
    desc: '똥 트랩을 설치하고 퍼리 버스트로 난사 공격을 퍼붓습니다.',
    basic: { name: '똥먹방', damage: 20, type: 'POOP_THROW' },
    ult: { name: 'SSR급 퍼리 니케샷', damage: 40, type: 'FURRY_BURST' }
  },
  GAEUN: {
    name: '김가은',
    emoji: '🎨',
    color: '#e84393',
    hp: 250,
    speed: 1.5,
    coolSpeed: 0.37,
    maxUltCharge: 3,
    stats: { atk: 65, def: 65, spd: 71, cool: 84, ult: 87, utl: 61 },
    desc: '선 가르기 공간 절단과 웹툰 스크롤 영역으로 적을 압박합니다.',
    basic: { name: '스케치', damage: 15, type: 'CUT_DIVIDE' },
    ult: { name: 'ㄹㅈㄷ 정주행', damage: 45, type: 'WEBTOON_SCROLL' }
  },
  GEONWOO: {
    name: '김건우',
    emoji: '🎧',
    color: '#8c7ae6',
    hp: 250,
    speed: 1.5625,
    coolSpeed: 0.44, // 쿨타임 3.8초
    maxUltCharge: 2,
    stats: { atk: 58, def: 77, spd: 86, cool: 97, ult: 83, utl: 59 },
    desc: '저음 서브우퍼 충격파로 적을 튕겨내고 전술 암전 구역을 생성합니다.',
    basic: { name: '저음 보이스', damage: 18, type: 'SUBWOOFER' },
    ult: { name: '전술 연막 활성화', damage: 40, type: 'NIGHTFALL_ZONE' } // 궁 데미지 40
  }
};
