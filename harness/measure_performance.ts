/**
 * T23: 응답 속도 측정
 *
 * - 대화 첫 글자 시간: 중앙값 ≤ 2초 (AC-03-1)
 * - 저널 생성 시간: 중앙값 ≤ 5초 (AC-04-1)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('환경변수 SUPABASE_URL, SUPABASE_ANON_KEY가 필요합니다.')
  Deno.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 테스트 메시지들
const TEST_MESSAGES = [
  '보고 싶어요.',
  '오늘은 조금 덜 슬픈 것 같아요.',
  '그 아이와 함께했던 시간들이 그리워요.',
  '처음 만난 날이 기억나요.',
  '힘들지만 버텨보려고 해요.',
  '오늘 산책을 나갔어요.',
  '마음이 너무 아파요.',
  '그 아이 덕분에 행복했어요.',
  '이렇게 이야기 들어주셔서 고마워요.',
  '조금씩 나아지고 있는 것 같아요.'
]

interface PerformanceResult {
  chatLatencies: number[]
  journalLatencies: number[]
  chatMedian: number
  journalMedian: number
  chatPass: boolean
  journalPass: boolean
}

// 중앙값 계산
function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

// 테스트 사용자 생성
async function setupTestUser() {
  console.log('📝 테스트 사용자 생성 중...')

  const { data: authData, error: authError } = await supabase.auth.signInAnonymously()

  if (authError || !authData.user) {
    throw new Error(`사용자 생성 실패: ${authError?.message}`)
  }

  // 반려동물 생성
  const { data: petData, error: petError } = await supabase
    .from('pets')
    .insert({
      user_id: authData.user.id,
      name: '성능테스트',
      species: 'dog',
      passed_on: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
    .select('id')
    .single()

  if (petError || !petData) {
    throw new Error(`반려동물 생성 실패: ${petError?.message}`)
  }

  // 대화 세션 생성
  const { data: convData, error: convError } = await supabase
    .from('conversations')
    .insert({
      user_id: authData.user.id,
      pet_id: petData.id
    })
    .select('id')
    .single()

  if (convError || !convData) {
    throw new Error(`대화 생성 실패: ${convError?.message}`)
  }

  console.log(`✅ 테스트 사용자: ${authData.user.id}`)

  return {
    userId: authData.user.id,
    conversationId: convData.id,
    accessToken: authData.session!.access_token
  }
}

// 대화 첫 글자 시간 측정
async function measureChatLatency(
  conversationId: string,
  accessToken: string,
  message: string
): Promise<number> {
  const startTime = performance.now()

  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      conversationId,
      message
    })
  })

  const contentType = response.headers.get('Content-Type')

  if (contentType?.includes('text/event-stream')) {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.content && parsed.content.length > 0) {
              // 첫 글자 수신 시간
              const latency = (performance.now() - startTime) / 1000

              // 나머지 스트림 소비
              while (true) {
                const { done } = await reader.read()
                if (done) break
              }

              return latency
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    }
  } else if (contentType?.includes('application/json')) {
    // crisis 또는 limit 응답
    const latency = (performance.now() - startTime) / 1000
    return latency
  }

  throw new Error('응답 형식 오류')
}

// 저널 생성 시간 측정
async function measureJournalLatency(accessToken: string): Promise<number> {
  const startTime = performance.now()

  const response = await fetch(`${SUPABASE_URL}/functions/v1/journal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({})
  })

  await response.json()

  const latency = (performance.now() - startTime) / 1000
  return latency
}

// 정리
async function cleanup(userId: string) {
  console.log('\n🧹 테스트 데이터 정리 중...')
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) {
    console.error(`⚠️ 정리 실패: ${error.message}`)
  } else {
    console.log('✅ 정리 완료')
  }
}

// 메인 실행
async function main() {
  console.log('⚡ 응답 속도 측정 시작\n')

  let testUser: any = null

  try {
    testUser = await setupTestUser()

    // 대화 속도 측정 (10회)
    console.log('\n💬 대화 첫 글자 시간 측정 (10회)...')
    const chatLatencies: number[] = []

    for (let i = 0; i < 10; i++) {
      const message = TEST_MESSAGES[i]
      console.log(`  ${i + 1}/10: "${message}"`)

      try {
        const latency = await measureChatLatency(
          testUser.conversationId,
          testUser.accessToken,
          message
        )
        chatLatencies.push(latency)
        console.log(`    → ${latency.toFixed(3)}초`)
      } catch (error) {
        console.error(`    ❌ 오류: ${error.message}`)
      }

      // Rate limit 방지
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // 저널 속도 측정 (10회)
    console.log('\n📔 저널 생성 시간 측정 (10회)...')
    const journalLatencies: number[] = []

    for (let i = 0; i < 10; i++) {
      console.log(`  ${i + 1}/10`)

      try {
        const latency = await measureJournalLatency(testUser.accessToken)
        journalLatencies.push(latency)
        console.log(`    → ${latency.toFixed(3)}초`)
      } catch (error) {
        console.error(`    ❌ 오류: ${error.message}`)
      }

      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    // 결과 분석
    const chatMedian = median(chatLatencies)
    const journalMedian = median(journalLatencies)

    const chatPass = chatMedian <= 2.0
    const journalPass = journalMedian <= 5.0

    console.log('\n📊 결과 요약')
    console.log('━'.repeat(50))
    console.log(`\n💬 대화 첫 글자 시간:`)
    console.log(`  - 측정값: ${chatLatencies.map(l => l.toFixed(2)).join(', ')} (초)`)
    console.log(`  - 중앙값: ${chatMedian.toFixed(3)}초`)
    console.log(`  - 목표: ≤ 2.0초`)
    console.log(`  - 결과: ${chatPass ? '✅ PASS' : '❌ FAIL'}`)

    console.log(`\n📔 저널 생성 시간:`)
    console.log(`  - 측정값: ${journalLatencies.map(l => l.toFixed(2)).join(', ')} (초)`)
    console.log(`  - 중앙값: ${journalMedian.toFixed(3)}초`)
    console.log(`  - 목표: ≤ 5.0초`)
    console.log(`  - 결과: ${journalPass ? '✅ PASS' : '❌ FAIL'}`)

    console.log('\n━'.repeat(50))

    if (!chatPass || !journalPass) {
      console.log('\n⚠️ 권장 조치:')
      if (!chatPass) {
        console.log('  - 대화: 분류 타임아웃 조정 또는 병렬 처리 도입 (plan.md 12장)')
      }
      if (!journalPass) {
        console.log('  - 저널: 생성 타임아웃 조정 또는 모델 변경 검토')
      }
    } else {
      console.log('\n✅ 모든 성능 목표 달성!')
    }

    // 리포트 저장
    const report = `# 응답 속도 측정 리포트

**실행 시각:** ${new Date().toISOString()}

## 결과 요약

| 항목 | 중앙값 | 목표 | 결과 |
|------|--------|------|------|
| 대화 첫 글자 | ${chatMedian.toFixed(3)}초 | ≤ 2.0초 | ${chatPass ? '✅ PASS' : '❌ FAIL'} |
| 저널 생성 | ${journalMedian.toFixed(3)}초 | ≤ 5.0초 | ${journalPass ? '✅ PASS' : '❌ FAIL'} |

## 대화 첫 글자 시간 (10회)

${chatLatencies.map((l, i) => `${i + 1}. ${l.toFixed(3)}초`).join('\n')}

## 저널 생성 시간 (10회)

${journalLatencies.map((l, i) => `${i + 1}. ${l.toFixed(3)}초`).join('\n')}

## 권장 조치

${!chatPass ? '- **대화:** 분류 타임아웃 조정 또는 병렬 처리 도입 (plan.md 12장)\n' : ''}${!journalPass ? '- **저널:** 생성 타임아웃 조정 또는 모델 변경 검토\n' : ''}${chatPass && journalPass ? '- 모든 성능 목표 달성. 추가 조치 불필요.\n' : ''}

---

*자동 생성된 리포트*
`

    const filename = `harness/reports/performance-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.md`
    await Deno.writeTextFile(filename, report)
    console.log(`\n📄 리포트 저장: ${filename}`)

  } catch (error) {
    console.error(`\n❌ 측정 실패: ${error.message}`)
    console.error(error.stack)
  } finally {
    if (testUser) {
      await cleanup(testUser.userId)
    }
  }
}

if (import.meta.main) {
  main()
}
