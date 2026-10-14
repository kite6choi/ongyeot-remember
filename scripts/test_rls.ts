/**
 * 온곁 리멤버 - RLS 테스트
 *
 * AC-01-2 검증: 익명 사용자 A·B 생성 → A 데이터 생성 → B로 조회 시 0건
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// .env 파일 로드
config({ path: resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 환경변수 누락: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

async function testRLS() {
  console.log('🧪 RLS 테스트 시작...\n')

  // 클라이언트 A, B 생성
  const clientA = createClient(supabaseUrl, supabaseAnonKey)
  const clientB = createClient(supabaseUrl, supabaseAnonKey)

  try {
    // 1. 익명 사용자 A, B 생성
    console.log('1️⃣  익명 사용자 A, B 생성 중...')
    const { data: userA, error: errorA } = await clientA.auth.signInAnonymously()
    const { data: userB, error: errorB } = await clientB.auth.signInAnonymously()

    if (errorA || errorB || !userA.user || !userB.user) {
      console.error('   사용자 A 에러:', errorA)
      console.error('   사용자 B 에러:', errorB)
      throw new Error(`익명 사용자 생성 실패: ${errorA?.message || errorB?.message}`)
    }

    console.log(`   ✅ 사용자 A: ${userA.user.id}`)
    console.log(`   ✅ 사용자 B: ${userB.user.id}\n`)

    // 2. 사용자 A로 데이터 생성
    console.log('2️⃣  사용자 A로 데이터 생성 중...')

    const userAId = userA.user.id

    // 반려동물 생성
    const { data: pet, error: petError } = await clientA
      .from('pets')
      .insert({
        user_id: userAId,
        name: '콩이',
        species: '몰티즈',
        age_years: 14,
        passed_on: '2026-09-29',
      })
      .select()
      .single()

    if (petError || !pet) {
      throw new Error(`반려동물 생성 실패: ${petError?.message}`)
    }
    console.log(`   ✅ 반려동물 생성: ${pet.id}`)

    // 추억 생성
    const { error: memoryError } = await clientA
      .from('memories')
      .insert({
        user_id: userAId,
        pet_id: pet.id,
        note: '바닷가에서 꼬리 흔들던 날',
      })

    if (memoryError) {
      throw new Error(`추억 생성 실패: ${memoryError.message}`)
    }
    console.log('   ✅ 추억 생성')

    // 대화 세션 생성
    const { data: conversation, error: convError } = await clientA
      .from('conversations')
      .insert({
        user_id: userAId,
        pet_id: pet.id,
      })
      .select()
      .single()

    if (convError || !conversation) {
      throw new Error(`대화 세션 생성 실패: ${convError?.message}`)
    }
    console.log('   ✅ 대화 세션 생성')

    // 메시지 생성
    const { error: messageError } = await clientA
      .from('messages')
      .insert({
        user_id: userAId,
        conversation_id: conversation.id,
        role: 'user',
        content: '콩이가 너무 보고 싶어요',
      })

    if (messageError) {
      throw new Error(`메시지 생성 실패: ${messageError.message}`)
    }
    console.log('   ✅ 메시지 생성')

    // 저널 생성
    const { error: journalError } = await clientA
      .from('journals')
      .insert({
        user_id: userAId,
        pet_id: pet.id,
        conversation_id: conversation.id,
        headline: '콩이를 떠올리며',
        longing: 8,
        guilt: 5,
        lethargy: 6,
        warmth: 3,
        self_message: '슬퍼해도 괜찮아',
        small_step: '사진 정리하기',
      })

    if (journalError) {
      throw new Error(`저널 생성 실패: ${journalError.message}`)
    }
    console.log('   ✅ 저널 생성\n')

    // 3. 사용자 B로 조회 시 0건 확인
    console.log('3️⃣  사용자 B로 조회 테스트 (0건이어야 함)...')

    const tables = ['pets', 'memories', 'conversations', 'messages', 'journals']
    let allPassed = true

    for (const table of tables) {
      const { data, error } = await clientB.from(table).select('*')

      if (error) {
        console.error(`   ❌ ${table} 조회 오류: ${error.message}`)
        allPassed = false
      } else if (data && data.length > 0) {
        console.error(`   ❌ ${table}: ${data.length}건 조회됨 (0건이어야 함)`)
        allPassed = false
      } else {
        console.log(`   ✅ ${table}: 0건 (정상)`)
      }
    }

    if (!allPassed) {
      throw new Error('RLS 정책이 제대로 작동하지 않습니다')
    }

    console.log('\n4️⃣  테스트 데이터 정리 중...')

    // 4. 테스트 데이터 삭제 (사용자 A로)
    await clientA.from('journals').delete().eq('pet_id', pet.id)
    await clientA.from('messages').delete().eq('conversation_id', conversation.id)
    await clientA.from('conversations').delete().eq('id', conversation.id)
    await clientA.from('memories').delete().eq('pet_id', pet.id)
    await clientA.from('pets').delete().eq('id', pet.id)

    console.log('   ✅ 테스트 데이터 삭제 완료')

    // 5. 익명 사용자 로그아웃
    await clientA.auth.signOut()
    await clientB.auth.signOut()

    console.log('\n✅ RLS 테스트 통과!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ RLS 테스트 실패:', error)
    process.exit(1)
  }
}

testRLS()
