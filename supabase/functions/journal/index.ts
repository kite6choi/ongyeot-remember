/**
 * 온곁 리멤버 - 저널 생성 Edge Function
 *
 * plan.md 8-5, tasks.md T11 기준
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { callOpenAIWithSchema, logUsage } from '../_shared/openai.ts'
import { buildJournalPrompt, JOURNAL_SCHEMA } from '../_shared/prompts.ts'
import { validateJournal, type Journal } from '../_shared/journal.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JournalRequest {
  conversationId: string
}

interface JournalResponse {
  ok: boolean
  journal?: Journal
  error?: string
  errors?: string[]
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[journal] 함수 시작')

    // 1. JWT 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: '인증이 필요합니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: '사용자 인증 실패' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[journal] 사용자: ${user.id}`)

    // 2. 요청 본문 파싱
    let body: JournalRequest
    try {
      const text = await req.text()
      body = text.trim() ? JSON.parse(text) : {}
    } catch (e) {
      return new Response(
        JSON.stringify({ ok: false, error: '잘못된 요청 형식입니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { conversationId } = body

    if (!conversationId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'conversationId가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. 대화 소유권 확인
    const { data: conversation, error: convError } = await supabaseClient
      .from('conversations')
      .select('pet_id, user_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ ok: false, error: '대화를 찾을 수 없습니다' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 타인의 대화인지 확인
    if (conversation.user_id !== user.id) {
      console.log(`[journal] 권한 없음: 요청 사용자 ${user.id}, 대화 소유자 ${conversation.user_id}`)
      return new Response(
        JSON.stringify({ ok: false, error: '접근 권한이 없습니다' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. 반려동물 정보 조회
    const { data: pet } = await supabaseClient
      .from('pets')
      .select('name, passed_on')
      .eq('id', conversation.pet_id)
      .single()

    if (!pet) {
      return new Response(
        JSON.stringify({ ok: false, error: '반려동물 정보를 찾을 수 없습니다' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 떠난 지 N일째 계산
    const passedDate = new Date(pet.passed_on)
    const today = new Date()
    const daysSince = Math.floor((today.getTime() - passedDate.getTime()) / (1000 * 60 * 60 * 24))

    // 5. 대화 메시지 조회
    const { data: messages } = await supabaseClient
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: '대화 내용이 없습니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. 저널 생성 (최대 2회 시도)
    const model = Deno.env.get('OPENAI_MODEL_LIGHT') || 'gpt-4o-mini'
    const systemPrompt = buildJournalPrompt(pet.name, daysSince)

    const promptMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    let journal: Journal | undefined
    let lastError: string[] | undefined

    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`[journal] 저널 생성 시도 ${attempt}/2`)

      try {
        const rawJournal = await callOpenAIWithSchema<Journal>({
          model,
          messages: promptMessages,
          maxTokens: 400,
          schema: JOURNAL_SCHEMA,
        })

        // 검증
        const validation = validateJournal(rawJournal)

        if (validation.ok && validation.journal) {
          journal = validation.journal
          console.log('[journal] 저널 생성 성공')

          // usage 로깅
          await logUsage({
            userId: user.id,
            purpose: 'journal',
            model,
            inputTokens: 0, // 정확한 값은 OpenAI 응답에서 가져와야 함
            cachedTokens: 0,
            outputTokens: Math.ceil(JSON.stringify(journal).length / 4),
          })

          break // 성공하면 루프 종료
        } else {
          console.log(`[journal] 검증 실패 (시도 ${attempt}):`, validation.errors)
          lastError = validation.errors
        }
      } catch (error) {
        console.error(`[journal] OpenAI 호출 실패 (시도 ${attempt}):`, error)
        lastError = [(error as Error).message]
      }
    }

    // 7. 결과 반환
    if (journal) {
      return new Response(
        JSON.stringify({ ok: true, journal } as JournalResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({
          ok: false,
          error: '저널 생성에 실패했습니다',
          errors: lastError,
        } as JournalResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('[journal] 오류:', error)
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
