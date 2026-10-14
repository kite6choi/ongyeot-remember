# 온곁 리멤버 (OnGyeot Remember)

반려동물을 떠나보낸 보호자를 위한 AI 케어 PWA (v0.6 데모)

## 시작하기

### 필수 요구사항

- Node.js 18 이상
- npm

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 테스트 실행
npm test

# 프로덕션 빌드
npm run build
```

### 환경 변수 설정

1. `.env.example`을 복사해 `.env` 파일 생성
2. Supabase URL과 Anon Key 입력
3. Edge Function secrets는 Supabase CLI로 등록

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL_CHAT=gpt-5.4-mini
supabase secrets set OPENAI_MODEL_LIGHT=gpt-5.4-nano
```

### 프로젝트 구조

```
PetLoss/
├─ CLAUDE.md          # 작업 규칙
├─ spec.md            # 요구사항 정의
├─ plan.md            # 시스템 설계
├─ tasks.md           # 작업 목록
├─ shared/            # 공용 순수 TS 모듈
├─ web/               # Vite + React PWA
├─ harness/           # AI 평가 하네스
├─ supabase/          # DB 마이그레이션, Edge Functions
├─ scripts/           # 유틸리티 스크립트
└─ docs/              # 개발 문서
```

## 테스트

```bash
# 단위 테스트 (LLM mock)
npm test

# Edge Function 테스트
deno test supabase/functions

# RLS 검증 (클라우드 프로젝트)
npm run test:rls

# AI 평가 하네스 (실제 API 호출, 비용 발생)
npm run eval
```

## 배포

- 프론트엔드: Vercel
- 백엔드: Supabase Cloud

## 문서

- 요구사항: [spec.md](spec.md)
- 설계: [plan.md](plan.md)
- 작업 목록: [tasks.md](tasks.md)
- 작업 규칙: [CLAUDE.md](CLAUDE.md)

## 라이선스

이 프로젝트는 창업 데모용입니다.
