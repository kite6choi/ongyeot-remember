/**
 * trial-seed 함수 테스트
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

async function testTrialSeed() {
  console.log('🧪 trial-seed 함수 테스트...\n')

  const client = createClient(supabaseUrl, supabaseAnonKey)

  // 익명 로그인
  const { data: userData, error: authError } = await client.auth.signInAnonymously()
  if (authError || !userData.user) {
    console.error('❌ 익명 로그인 실패:', authError)
    process.exit(1)
  }

  console.log(`✅ 익명 사용자: ${userData.user.id}\n`)

  try {
    // 1. 첫 호출 (시드 생성)
    console.log('1️⃣  첫 호출 (시드 생성)...')
    const response1 = await client.functions.invoke('trial-seed')

    if (response1.error) {
      console.error('❌ 함수 호출 실패:', response1.error)
      console.error('   응답 데이터:', JSON.stringify(response1.data, null, 2))

      // 에러 응답 body를 읽어보기
      if (response1.error.context?.body) {
        try {
          const reader = response1.error.context.body.getReader()
          const { value } = await reader.read()
          const text = new TextDecoder().decode(value)
          console.error('   응답 body:', text)
        } catch (e) {
          console.error('   body 읽기 실패:', e)
        }
      }

      process.exit(1)
    }

    const data1 = response1.data

    console.log('   응답:', JSON.stringify(data1, null, 2))

    // 2. 데이터 확인
    console.log('\n2️⃣  생성된 데이터 확인...')

    const { data: pets } = await client.from('pets').select('*')
    const { data: memories } = await client.from('memories').select('*')
    const { data: journals } = await client.from('journals').select('*').order('journal_date')

    console.log(`   반려동물: ${pets?.length}개`)
    console.log(`   추억: ${memories?.length}개`)
    console.log(`   저널: ${journals?.length}개`)

    if (pets && pets.length > 0) {
      console.log(`   반려동물 이름: ${pets[0].name}`)
      console.log(`   떠난 날: ${pets[0].passed_on}`)
    }

    // 3. 중복 호출 테스트
    console.log('\n3️⃣  중복 호출 테스트 (건너뛰기)...')
    const { data: data2 } = await client.functions.invoke('trial-seed')
    console.log('   응답:', JSON.stringify(data2, null, 2))

    // 4. reset 테스트
    console.log('\n4️⃣  reset 테스트...')
    const { data: data3 } = await client.functions.invoke('trial-seed', {
      body: { reset: true },
    })
    console.log('   응답:', JSON.stringify(data3, null, 2))

    // 5. 정리
    console.log('\n5️⃣  테스트 데이터 정리...')
    await client.from('journals').delete().eq('user_id', userData.user.id)
    await client.from('memories').delete().eq('user_id', userData.user.id)
    await client.from('pets').delete().eq('user_id', userData.user.id)
    await client.auth.signOut()

    console.log('\n✅ trial-seed 함수 테스트 통과!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error)
    process.exit(1)
  }
}

testTrialSeed()
