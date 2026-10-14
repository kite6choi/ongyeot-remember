// 온곁 리멤버 - 테스트용 Edge Function
// T02 연결 확인용

Deno.serve(async (req) => {
  // CORS 헤더 설정
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 환경변수 확인
    const modelChat = Deno.env.get('OPENAI_MODEL_CHAT')
    const modelLight = Deno.env.get('OPENAI_MODEL_LIGHT')
    const hasApiKey = !!Deno.env.get('OPENAI_API_KEY')

    const response = {
      message: '온곁 리멤버 테스트 함수',
      status: 'ok',
      timestamp: new Date().toISOString(),
      secrets_check: {
        OPENAI_API_KEY: hasApiKey ? '등록됨 ✅' : '없음 ❌',
        OPENAI_MODEL_CHAT: modelChat || '없음 ❌',
        OPENAI_MODEL_LIGHT: modelLight || '없음 ❌',
      }
    }

    return new Response(
      JSON.stringify(response, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
