# T24: 배포 가이드

Supabase + Vercel 배포 및 환경 설정 가이드입니다.

## 사전 준비

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com/) 로그인
2. 새 프로젝트 생성
3. 프로젝트 URL 및 anon key 복사

### 2. Vercel 계정 준비

1. [vercel.com](https://vercel.com/) 로그인
2. GitHub 저장소 연결

## 배포 순서

### Step 1: Supabase 마이그레이션

```bash
# Supabase CLI 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref <your-project-ref>

# 마이그레이션 실행
supabase db push

# 확인
supabase db diff
```

**마이그레이션 파일:**
- `supabase/migrations/20250101_schema.sql` - 스키마 및 RLS
- `supabase/migrations/20250102_seed.sql` - 시드 데이터

### Step 2: Edge Functions 배포

```bash
# 환경변수 설정 (Supabase secrets)
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL_MAIN=gpt-4o-2024-08-06
supabase secrets set OPENAI_MODEL_LIGHT=gpt-4o-mini-2024-07-18

# Functions 배포
supabase functions deploy trial-seed
supabase functions deploy chat
supabase functions deploy journal

# 배포 확인
supabase functions list
```

### Step 3: Vercel 배포

#### 3-1. 로컬 빌드 테스트

```bash
cd web
npm run build

# 빌드 성공 확인
ls dist/
```

#### 3-2. Vercel 배포

```bash
# Vercel CLI 설치 (없으면)
npm install -g vercel

# 프로젝트 연결
cd web
vercel link

# 환경변수 설정
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Production 배포
vercel --prod
```

#### 3-3. Vercel Dashboard 설정

1. [vercel.com/dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택
3. Settings → Environment Variables
   - `VITE_SUPABASE_URL`: https://your-project.supabase.co
   - `VITE_SUPABASE_ANON_KEY`: eyJhbGc...

4. Settings → General
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
   - Root Directory: `web`

### Step 4: 배포 검증

#### 4-1. 기본 접속 확인

```bash
# 배포 URL 확인
vercel ls

# 브라우저에서 접속
https://your-app.vercel.app
```

#### 4-2. 체험 진입 확인

```bash
# ?start=demo 파라미터로 접속
https://your-app.vercel.app/?start=demo
```

확인 사항:
- ✅ 익명 로그인 성공
- ✅ trial-seed 호출 성공
- ✅ 홈 화면으로 자동 이동
- ✅ 반려동물 정보 표시

#### 4-3. 기능 테스트

1. **대화 기능**
   - 메시지 전송 → SSE 스트리밍 응답 확인
   - 위기 메시지 → 모달 표시 확인

2. **저널 기능**
   - 저널 목록 조회
   - 저널 상세 확인

3. **대시보드**
   - 감정 그래프 표시 확인

4. **PWA**
   - Chrome DevTools → Application → Manifest 확인
   - Service Worker 등록 확인

#### 4-4. 데이터 분리 확인

휴대폰 2대 (또는 시크릿 창 2개):
1. 각각 `?start=demo`로 진입
2. 대화 메시지 전송
3. 서로의 데이터가 보이지 않는지 확인

### Step 5: QR 코드 생성

배포 URL이 확정되면:

```bash
# QR 코드 생성 (온라인 도구 사용)
# https://www.qr-code-generator.com/

URL: https://your-app.vercel.app/?start=demo
```

생성된 QR 코드:
1. PNG 파일로 저장: `web/public/demo-qr.png`
2. CounselorScreen에서 사용

## 환경변수 전체 목록

### Supabase Secrets

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `OPENAI_API_KEY` | OpenAI API 키 | `sk-proj-...` |
| `OPENAI_MODEL_MAIN` | 대화용 모델 | `gpt-4o-2024-08-06` |
| `OPENAI_MODEL_LIGHT` | 분류·저널용 모델 | `gpt-4o-mini-2024-07-18` |

### Vercel Environment Variables

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGc...` |

## 트러블슈팅

### Edge Function 오류

```bash
# 로그 확인
supabase functions logs chat

# 재배포
supabase functions deploy chat --no-verify-jwt
```

### Vercel 빌드 실패

1. 로그 확인: Vercel Dashboard → Deployments → 실패한 빌드 선택
2. 로컬에서 재현: `npm run build`
3. 환경변수 확인: Settings → Environment Variables

### CORS 오류

Supabase Dashboard:
1. Project Settings → API
2. CORS settings에 Vercel URL 추가

### Service Worker 오류

```bash
# 캐시 클리어
# Chrome DevTools → Application → Storage → Clear site data

# 재배포
vercel --prod
```

## 완료 체크리스트

- [ ] Supabase 마이그레이션 완료
- [ ] Edge Functions 3개 배포 완료
- [ ] Secrets 설정 완료
- [ ] Vercel 배포 성공
- [ ] 환경변수 설정 완료
- [ ] `?start=demo` 정상 작동
- [ ] 대화·저널·대시보드 기능 확인
- [ ] PWA manifest 및 service worker 작동
- [ ] 데이터 분리 확인 (2대 동시 체험)
- [ ] QR 코드 생성 및 반영

## 다음 단계

배포 완료 후:
1. **T21**: 하네스 실행 및 프롬프트 튜닝
2. **T23**: 성능 측정
3. **T25**: 데모 리허설
