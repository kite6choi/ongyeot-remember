/**
 * 온곁 리멤버 - 체험 시드 데이터
 *
 * plan.md 10장 기준
 * 시드 생성일 기준 상대 날짜로 생성하여 언제 시연해도 일관된 경험 제공
 */

import { Journal } from './journal'

/**
 * 시드 데이터 세트
 */
export interface SeedData {
  pet: {
    name: string
    species: string
    age_years: number
    passed_on: string  // ISO date
  }
  memories: Array<{
    note: string
  }>
  journals: Journal[]
}

/**
 * 체험용 시드 데이터를 생성합니다.
 *
 * @param baseDate 기준 날짜 (기본값: 오늘)
 * @returns 시드 데이터
 */
export function generateSeedData(baseDate: Date = new Date()): SeedData {
  // 떠난 날: 기준일 15일 전
  const passedOn = new Date(baseDate)
  passedOn.setDate(passedOn.getDate() - 15)

  // 반려동물
  const pet = {
    name: '콩이',
    species: '몰티즈',
    age_years: 14,
    passed_on: passedOn.toISOString().split('T')[0], // YYYY-MM-DD
  }

  // 추억 3개
  const memories = [
    { note: '바닷가에서 꼬리 흔들던 날' },
    { note: '비 오는 날 내 무릎에서 자던 콩이' },
    { note: '산책 끝나면 꼭 물 한 그릇' },
  ]

  // 저널 7일치 (최근 7일)
  // 죄책감 8→4 하락, 따뜻함 3→6 상승, 무기력 6→4 하락
  const journalTemplates = [
    // 7일 전 (가장 오래됨)
    {
      daysAgo: 7,
      headline: '콩이가 없는 집이 너무 조용해요',
      longing: 9,
      guilt: 8,
      lethargy: 6,
      warmth: 3,
      moments: ['빈 밥그릇을 보며 눈물이 났어요'],
      self_message: '괜찮아질 수 있을까요',
      small_step: '콩이 사진을 한 장 보기',
    },
    // 6일 전
    {
      daysAgo: 6,
      headline: '병원에 더 일찍 갔어야 했는데',
      longing: 8,
      guilt: 8,
      lethargy: 7,
      warmth: 2,
      moments: ['마지막 날 콩이가 날 바라보던 눈빛'],
      self_message: '미안해 콩아',
      small_step: '산책로를 피해 다른 길로 가기',
    },
    // 5일 전
    {
      daysAgo: 5,
      headline: '친구가 콩이 이야기를 물어봤어요',
      longing: 7,
      guilt: 7,
      lethargy: 6,
      warmth: 4,
      moments: ['콩이와 함께한 좋은 기억들을 말했어요'],
      self_message: '조금씩 이야기할 수 있게 되었어',
      small_step: '콩이가 좋아하던 간식 치우기',
    },
    // 4일 전
    {
      daysAgo: 4,
      headline: '오늘은 조금 덜 슬펐어요',
      longing: 7,
      guilt: 6,
      lethargy: 5,
      warmth: 5,
      moments: ['콩이 사진을 보며 웃을 수 있었어요'],
      self_message: '천천히 나아가고 있어',
      small_step: '콩이 산책 가방 정리하기',
    },
    // 3일 전
    {
      daysAgo: 3,
      headline: '콩이가 꿈에 나왔어요',
      longing: 6,
      guilt: 5,
      lethargy: 4,
      warmth: 6,
      moments: ['건강하게 뛰어놀던 콩이', '꼬리 흔들며 웃던 모습'],
      self_message: '좋은 꿈이었어',
      small_step: '콩이 앨범 만들기 시작',
    },
    // 2일 전
    {
      daysAgo: 2,
      headline: '공원을 다시 산책했어요',
      longing: 6,
      guilt: 4,
      lethargy: 4,
      warmth: 6,
      moments: ['콩이랑 함께 뛰놀던 잔디밭', '좋아하던 벤치 앞에 앉았어요'],
      self_message: '많이 사랑했고, 잘 키웠어',
      small_step: '내일 공원에 다시 가보기',
    },
    // 1일 전 (어제)
    {
      daysAgo: 1,
      headline: '콩이를 웃으며 떠올렸어요',
      longing: 5,
      guilt: 4,
      lethargy: 4,
      warmth: 6,
      moments: ['장난감을 물고 오던 콩이', '소파에서 코 골던 모습', '산책 가자고 조르던 아침'],
      self_message: '함께한 시간이 정말 소중했어',
      small_step: '콩이 이야기를 일기에 쓰기',
    },
  ]

  const journals: Journal[] = journalTemplates.map(template => {
    const journalDate = new Date(baseDate)
    journalDate.setDate(journalDate.getDate() - template.daysAgo)

    return {
      headline: template.headline,
      scores: {
        longing: template.longing,
        guilt: template.guilt,
        lethargy: template.lethargy,
        warmth: template.warmth,
      },
      moments: template.moments,
      self_message: template.self_message,
      small_step: template.small_step || '',
    }
  })

  return {
    pet,
    memories,
    journals,
  }
}

/**
 * 시드 생성일 기준으로 경과 일수를 계산합니다.
 *
 * @param passedOn 떠난 날 (ISO date string)
 * @param baseDate 기준 날짜
 * @returns 경과 일수
 */
export function calculateDaysSince(passedOn: string, baseDate: Date = new Date()): number {
  const passed = new Date(passedOn)
  const diffMs = baseDate.getTime() - passed.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}
