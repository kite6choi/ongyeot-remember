/**
 * 온곁 리멤버 - 체험 시드 Edge Function
 *
 * 익명 체험 계정에 시드 데이터를 생성합니다.
 * plan.md 10장, tasks.md T08 기준
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { generateSeedData } from '../_shared/seed.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[trial-seed] 함수 시작')

    // 1. JWT 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[trial-seed] Authorization 헤더 없음')
      return new Response(
        JSON.stringify({ error: '인증이 필요합니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[trial-seed] Supabase 클라이언트 생성')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    console.log('[trial-seed] 사용자 인증 확인')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('[trial-seed] 사용자 인증 실패:', userError?.message)
      return new Response(
        JSON.stringify({ error: '사용자 인증 실패', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[trial-seed] 사용자 인증 성공: ${user.id}`)

    // 2. 요청 본문 파싱
    let body = {}
    try {
      const text = await req.text()
      if (text.trim()) {
        body = JSON.parse(text)
      }
    } catch (e) {
      console.log('[trial-seed] 요청 본문 파싱 실패, 빈 객체 사용:', e.message)
    }
    const reset = body.reset === true
    console.log(`[trial-seed] reset 파라미터: ${reset}`)

    // 3. reset이면 기존 데이터 삭제
    if (reset) {
      console.log(`[trial-seed] 사용자 ${user.id} 데이터 삭제 중...`)

      // 외래 키 제약으로 인해 순서대로 삭제
      await supabaseClient.from('journals').delete().eq('user_id', user.id)
      await supabaseClient.from('messages').delete().eq('user_id', user.id)
      await supabaseClient.from('conversations').delete().eq('user_id', user.id)
      await supabaseClient.from('memories').delete().eq('user_id', user.id)
      await supabaseClient.from('pets').delete().eq('user_id', user.id)

      console.log('[trial-seed] 기존 데이터 삭제 완료')
    }

    // 4. 이미 시드가 있는지 확인 (reset이 아닌 경우)
    if (!reset) {
      const { data: existingPets } = await supabaseClient
        .from('pets')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (existingPets && existingPets.length > 0) {
        console.log(`[trial-seed] 사용자 ${user.id}는 이미 시드가 있음`)
        return new Response(
          JSON.stringify({ ok: true, message: '이미 시드 데이터가 있습니다' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 5. 시드 데이터 생성
    console.log(`[trial-seed] 사용자 ${user.id} 시드 생성 중...`)
    console.log('[trial-seed] generateSeedData 호출')
    const seedData = generateSeedData()
    console.log('[trial-seed] 시드 데이터 생성 완료:', {
      petName: seedData.pet.name,
      memoriesCount: seedData.memories.length,
      journalsCount: seedData.journals.length,
    })

    // 6. 반려동물 생성
    console.log('[trial-seed] 반려동물 insert 시작')
    const { data: pet, error: petError } = await supabaseClient
      .from('pets')
      .insert({
        user_id: user.id,
        ...seedData.pet,
      })
      .select()
      .single()

    if (petError || !pet) {
      console.error('[trial-seed] 반려동물 생성 실패:', petError?.message)
      throw new Error(`반려동물 생성 실패: ${petError?.message}`)
    }
    console.log(`[trial-seed] 반려동물 생성 완료: ${pet.id}`)

    // 7. 추억 생성
    const memories = seedData.memories.map(m => ({
      user_id: user.id,
      pet_id: pet.id,
      note: m.note,
    }))

    const { error: memoriesError } = await supabaseClient
      .from('memories')
      .insert(memories)

    if (memoriesError) {
      throw new Error(`추억 생성 실패: ${memoriesError.message}`)
    }

    // 8. 저널 생성 (날짜 계산 필요)
    const baseDate = new Date()
    const journalsData = seedData.journals.map((journal, index) => {
      const daysAgo = 7 - index // 7일 전부터 어제까지
      const journalDate = new Date(baseDate)
      journalDate.setDate(journalDate.getDate() - daysAgo)

      return {
        user_id: user.id,
        pet_id: pet.id,
        journal_date: journalDate.toISOString().split('T')[0],
        headline: journal.headline,
        longing: journal.scores.longing,
        guilt: journal.scores.guilt,
        lethargy: journal.scores.lethargy,
        warmth: journal.scores.warmth,
        moments: journal.moments,
        self_message: journal.self_message,
        small_step: journal.small_step || '',
      }
    })

    const { error: journalsError } = await supabaseClient
      .from('journals')
      .insert(journalsData)

    if (journalsError) {
      throw new Error(`저널 생성 실패: ${journalsError.message}`)
    }

    console.log(`[trial-seed] 사용자 ${user.id} 시드 생성 완료`)

    return new Response(
      JSON.stringify({
        ok: true,
        message: reset ? '시드 데이터를 재생성했습니다' : '시드 데이터를 생성했습니다',
        data: {
          pet_id: pet.id,
          memories_count: memories.length,
          journals_count: journalsData.length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[trial-seed] 오류:', error)
    console.error('[trial-seed] 오류 스택:', error.stack)
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
        type: error.constructor.name,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
