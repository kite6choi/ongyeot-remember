# 배포 상태 보고서

**배포 일시:** 2026-10-14 20:06

---

## ✅ 완료된 배포 단계

### 1. Supabase 배포 (완료)

**프로젝트 정보:**
- 프로젝트명: ongyeot
- Project Ref: lcuovdsvejnkzhsdvelx
- 리전: ap-northeast-2 (서울)
- 상태: ACTIVE_HEALTHY
- URL: https://lcuovdsvejnkzhsdvelx.supabase.co

**데이터베이스:**
- ✅ 마이그레이션 완료 (최신 상태)
- ✅ RLS 정책 적용됨
- ✅ 시드 데이터 준비됨

**Edge Functions:**
- ✅ trial-seed (v3) - 체험 시드 데이터 생성
- ✅ chat (v1) - 대화 기능 (SSE 스트리밍, 위기 감지)
- ✅ journal (v1) - 저널 생성

**Secrets (환경변수):**
- ✅ OPENAI_API_KEY
- ✅ OPENAI_MODEL_CHAT
- ✅ OPENAI_MODEL_LIGHT
- ✅ GLOBAL_DAILY_USD_LIMIT
- ✅ TRIAL_DAILY_TURN_LIMIT
- ✅ RISK_CLASSIFY_TIMEOUT_MS
- ✅ ADMIN_VIEW_KEY

**대시보드:**
- Functions: https://supabase.com/dashboard/project/lcuovdsvejnkzhsdvelx/functions
- Database: https://supabase.com/dashboard/project/lcuovdsvejnkzhsdvelx/editor
- Settings: https://supabase.com/dashboard/project/lcuovdsvejnkzhsdvelx/settings/api

### 2. 프론트엔드 빌드 (완료)

**빌드 결과:**
- ✅ TypeScript 컴파일 성공
- ✅ Vite 프로덕션 빌드 완료
- ✅ PWA manifest 생성 (manifest.webmanifest)
- ✅ Service Worker 생성 (sw.js)
- ✅ 빌드 출력: web/dist/

**PWA 구성:**
- 이름: 온곁 리멤버
- 테마 색상: #C98B6B
- 백그라운드: #FAF7F2
- Service Worker: Workbox 사용
- 캐시 전략: NetworkFirst (API 조회)

---

## 🚀 다음 단계: Vercel 배포

### Vercel 수동 배포 가이드

#### 방법 1: Vercel CLI (권장)

```bash
cd web

# Vercel 로그인 (브라우저에서 인증)
vercel login

# 프로젝트 연결 및 배포
vercel --prod

# 또는 처음 배포 시
vercel
# 질문에 답변:
# - Set up and deploy? Yes
# - Which scope? [your-team]
# - Link to existing project? No
# - What's your project's name? ongyeot-remember
# - In which directory is your code located? ./
# - Want to override settings? Yes
#   - Build Command: npm run build
#   - Output Directory: dist
#   - Install Command: npm install
```

#### 방법 2: Vercel Dashboard (더 간단)

1. https://vercel.com/new 접속
2. GitHub 저장소 연결
3. 프로젝트 설정:
   - **Framework Preset:** Vite
   - **Root Directory:** web
   - **Build Command:** npm run build
   - **Output Directory:** dist
   - **Install Command:** npm install

4. **Environment Variables 설정:**
   ```
   VITE_SUPABASE_URL = https://lcuovdsvejnkzhsdvelx.supabase.co
   VITE_SUPABASE_ANON_KEY = [Supabase Dashboard에서 확인]
   ```

5. **Deploy** 클릭

#### Supabase Anon Key 확인:

```bash
# Supabase Dashboard → Settings → API
# 또는
https://supabase.com/dashboard/project/lcuovdsvejnkzhsdvelx/settings/api
```

**Anon/Public Key를** 복사하여 Vercel 환경변수에 설정

---

## 📋 배포 후 검증 체크리스트

배포 완료 후 다음 항목을 확인하세요:

### 기본 접속
- [ ] Vercel URL 접속 확인
- [ ] HTTPS 작동 확인
- [ ] PWA manifest 로드 확인

### 체험 진입 (시나리오 1)
- [ ] `?start=demo` 파라미터로 접속
- [ ] 3초 이내 홈 화면 표시
- [ ] 반려동물 정보 표시 (이름: 몽이)

### 대화 기능 (시나리오 2)
- [ ] 메시지 전송
- [ ] 2초 이내 첫 글자 표시
- [ ] SSE 스트리밍 응답 확인

### 위기 감지 (시나리오 3)
- [ ] 위기 메시지 입력 시 모달 표시
- [ ] 3개 위기 전화 링크 확인

### 저널 기능 (시나리오 4)
- [ ] 저널 목록 조회
- [ ] 저널 상세 확인
- [ ] 감정 점수 4개 표시

### 대시보드 (시나리오 5)
- [ ] 감정 그래프 표시
- [ ] 7일/14일 토글 작동

### 데이터 격리 (시나리오 6)
- [ ] 휴대폰 2대로 동시 진입
- [ ] 각자 다른 데이터 확인

### PWA
- [ ] Chrome DevTools → Application → Manifest 확인
- [ ] Service Worker 등록 확인
- [ ] 오프라인 안내 메시지 표시

---

## 🔧 배포 후 설정

### QR 코드 생성

배포 URL이 확정되면:

1. https://www.qr-code-generator.com/ 접속
2. URL 입력: `https://your-app.vercel.app/?start=demo`
3. PNG 다운로드
4. `web/public/demo-qr.png` 저장
5. CounselorScreen 업데이트

### 환경변수 최종 확인

**Vercel (프론트엔드):**
```
VITE_SUPABASE_URL=https://lcuovdsvejnkzhsdvelx.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

**Supabase (백엔드):**
- ✅ 모두 설정 완료

---

## 📞 문제 발생 시

### Edge Function 오류

```bash
# 로그 확인
supabase functions logs chat --project-ref lcuovdsvejnkzhsdvelx

# 재배포
supabase functions deploy chat --project-ref lcuovdsvejnkzhsdvelx
```

### Vercel 빌드 실패

1. Vercel Dashboard → Deployments → 실패한 빌드 선택
2. 로그 확인
3. 로컬에서 재현: `npm run build`
4. 환경변수 확인

### CORS 오류

Supabase Dashboard:
1. Settings → API
2. CORS settings에 Vercel URL 추가

---

## 📊 현재 상태

- ✅ **백엔드:** 완전 배포 완료
- ⏳ **프론트엔드:** 빌드 완료, Vercel 배포 대기 중
- ⏳ **QR 코드:** Vercel URL 확정 후 생성

---

## 다음 실행 작업

1. **Vercel 배포** (위 가이드 참조)
2. **배포 검증** (체크리스트 실행)
3. **T21: 하네스 실행** (`harness/run_eval.ts`)
4. **T23: 성능 측정** (`harness/measure_performance.ts`)
5. **T25: 데모 리허설** (3회 연속 성공)

---

**배포 담당:** Claude Sonnet 4.5
**프로젝트:** 온곁 리멤버 v0.6
**목표:** 창업 심사 데모
