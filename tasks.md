# tasks.md — 온곁 리멤버 v0.6 작업 목록

- 문서 버전: 0.1 (2026-10-14) · 기준: `spec.md`(F·AC), `plan.md`(설계)
- 규칙: `CLAUDE.md` 2장 — **위에서부터 하나씩**, **테스트 통과 전 체크 금지**, 작업 단위 커밋(`T05: ...`)
- 표기: `[사람]` = Steve가 직접 해야 하는 작업(계정·키·최종 확인), 나머지는 AI 코딩 도구가 진행
- 의사결정: 범위·문구·디자인·프롬프트의 최종 결정은 Steve가 한다. 다른 사람의 검토를 완료 조건으로 두지 않는다.

---

## 0. 테스트 명령

| 명령 | 내용 |
|---|---|
| `npm test` (루트) | `shared/` + `web/` 단위·UI 테스트 (Vitest, LLM mock) |
| `deno test supabase/functions` | Edge Function 로직 테스트 (OpenAI mock) |
| `npm run test:rls` | RLS 검증 스크립트 (클라우드 프로젝트, 익명 사용자 2명, 실행 후 테스트 데이터 삭제) |
| `npm run eval` | AI 평가 하네스 (실제 OpenAI 호출, 수동 실행, 비용 발생) |

## 1. 하네스 3층 구조

| 층 | 무엇을 | 언제 | 합격 기준 |
|---|---|---|---|
| ① 단위·함수 테스트 | 순수 로직, Edge Function 분기, UI 흐름 (LLM mock) | 매 작업, 매 커밋 | 전부 통과 |
| ② AI 평가 하네스 | 실제 모델의 대화·위기 분류·저널 품질 | 프롬프트·모델 변경 시 | 위기 감지 100%, 오탐 ≤ 2/10, 금지 표현 0건, 저널 JSON 유효율 100% |
| ③ 데모 하네스 | 시드 데이터, 체험 진입, 배포 환경 시연 | 배포 후, 시연 전 | 시나리오 1~6 3회 연속 성공 |

평가 케이스 파일(`harness/cases/*.json`)은 ①의 위기 규칙 테스트와 ②가 **같은 파일을 공유**한다. 케이스를 줄이거나 기대값을 바꾸려면 Steve 승인이 필요하다.

---

## P0. 준비

- [x] **T01 프로젝트 골격**
  - 내용: 루트 `package.json`(workspaces: `web`, `shared`, `harness`), `web/`에 Vite + React + TS, Vitest·RTL 설정, `shared/` 빈 모듈, `.gitignore`(`.env` 포함), `.env.example`(plan.md 4장 키 전부), README에 실행 방법
  - 완료 조건: `npm install` → `npm test`(샘플 테스트 1개) 통과, `npm run build` 성공, `git init` 후 첫 커밋

- [x] **T02 [사람] 외부 서비스 준비**
  - Supabase 프로젝트 생성, Authentication → Anonymous Sign-ins 켜기
  - 클라우드 프로젝트 1개 생성: `ongyeot`(개발·테스트·시연 공용). 로컬 Supabase·Docker는 사용하지 않는다.
  - Supabase CLI 설치, `supabase init`, `supabase login`, `supabase link --project-ref <project ref>`
  - OpenAI API 키 발급, 사용 한도(월 상한) 설정, 모델 ID 확인(`OPENAI_MODEL_CHAT`, `OPENAI_MODEL_LIGHT`)
  - `.env` 작성, Edge Function secrets 등록(`supabase secrets set ...`)
  - 완료 조건: `supabase link` 성공, `supabase functions deploy`로 빈 테스트 함수 배포·호출 성공, `.env` 값 채움(커밋 안 됨 확인)

## P1. 안전 로직 (순수 TS, 인프라 없이 먼저)

- [x] **T03 위기 키워드 규칙 `shared/risk.ts`**
  - 내용: `checkRiskKeywords(text) → 'none'|'medium'|'high'`, 공백 제거 문장 검사, 관용 표현 예외(plan.md 8-4)
  - 케이스: `harness/cases/risk_positive.json`(10개, 직접·간접·띄어쓰기 변형), `risk_negative.json`(10개, "보고 싶어 죽겠어" 등 관용·일반 슬픔)
  - 테스트: 양성 케이스 중 키워드로 잡혀야 하는 항목(`expect_keyword: true`) 100% 감지, 음성 케이스 high 판정 0건
  - 관련: AC-05-1, AC-05-2

- [x] **T04 금지 표현 검사 `shared/forbidden.ts`**
  - 내용: plan.md 8-3 패턴 목록, `findForbidden(text) → string[]`
  - 테스트: 분류별 위반 문장 각 2개 감지, 정상 공감 문장 10개 오탐 0건
  - 관련: AC-03-2, AC-03-3

- [x] **T05 저널 검증 `shared/journal.ts`**
  - 내용: `validateJournal(raw) → {ok, journal, errors}` — 필수 필드, 점수 0~10 정수 보정, headline 30자, moments 최대 3개, 금지 표현 검사
  - 테스트: 정상 JSON 통과, 필드 누락·점수 범위 초과·문자열 점수·긴 headline 각각 처리 확인
  - 관련: AC-04-2

- [x] **T06 회복 규칙 `shared/recovery.ts`**
  - 내용: plan.md 8-6 규칙 4개, `buildRecoveryCards(journals, petName) → Card[]`
  - 테스트: 무기력 3일 연속 ≥7 → 상담 제안 카드가 첫 번째, 따뜻함 상승 문구, 죄책감 하락 문구, 저널 3개 미만 문구
  - 관련: AC-06-2

## P2. 데이터베이스

- [x] **T07 스키마·RLS 마이그레이션 `supabase/migrations/001_init.sql`**
  - 내용: plan.md 6장 테이블 7개, 인덱스, RLS 정책, `risk_events`·`ai_usage` 클라이언트 insert 금지, Storage 버킷 `memories` 정책
  - 테스트: `supabase db push`로 클라우드 프로젝트에 적용 성공, `npm run test:rls` — 익명 사용자 A·B 생성 → A 데이터 생성 → B로 6개 테이블 조회 시 0건, B가 A의 `memories` 파일 접근 불가
  - 관련: AC-01-2

- [x] **T08 체험 시드 `shared/seed.ts` + `functions/trial-seed`**
  - 내용: 시드 생성일 기준 상대 날짜(떠난 날 15일 전, 저널 최근 7일), 지은·콩이·추억 3개·저널 7일치(plan.md 10장 수치), 이미 있으면 건너뜀, `reset:true`면 본인 데이터만 삭제 후 재생성
  - 테스트: (Vitest) 오늘 날짜를 바꿔도 "15일째"·최근 7일 유지, 시드 저널이 `validateJournal` 통과, 시드로 `buildRecoveryCards`가 회복 문구를 만듦 / (Deno) 중복 호출 시 1세트만 존재, reset 시 다른 사용자 데이터 유지
  - 관련: AC-01-1

## P3. Edge Functions

- [x] **T09 OpenAI 호출 모듈 `functions/_shared/openai.ts`, `prompts.ts`**
  - 내용: fetch 기반 얇은 래퍼(일반·스트리밍·JSON Schema), 모델명은 환경변수, 응답의 usage를 `ai_usage`에 기록, 대화 시스템 프롬프트·분류 프롬프트·저널 프롬프트(plan.md 8장)
  - 테스트: mock fetch로 요청 본문에 환경변수 모델명 사용 확인, 스트림 조각 결합, usage 기록 호출 확인, 코드에 모델명 문자열 하드코딩 없음(grep 테스트)

- [x] **T10 대화 함수 `functions/chat`**
  - 내용: JWT 확인 → 사용량 상한 확인 → 위기 1차(키워드)·2차(nano, 타임아웃) → 위기면 `{type:"crisis"}` + `risk_events` 기록(원문 없음) → 아니면 컨텍스트 구성 후 mini 스트리밍(SSE) → 메시지 저장
  - 테스트 (Deno, OpenAI mock):
    - 키워드 위기 → 대화 모델 **호출 0회**, crisis 응답, `risk_events` 1건(내용 컬럼 없음)
    - 키워드 정상 + 분류 high → crisis
    - 분류 타임아웃·오류 + 키워드 위기 → crisis / 키워드 정상 → 정상 대화 진행
    - 하루 30턴 초과 → `{type:"limit", scope:"user"}`, OpenAI 호출 0회
    - 전체 비용 상한 초과 → `{type:"limit", scope:"global"}`
    - 컨텍스트에 추억 메모·최근 저널 3개·최근 12턴만 포함
  - 관련: AC-01-3, AC-05-1, AC-05-3

- [x] **T11 저널 함수 `functions/journal`**
  - 내용: 대화 조회 → nano JSON Schema 호출 → `validateJournal` → 실패 시 1회 재시도 → 초안 반환(저장은 프론트)
  - 테스트 (Deno, mock): 정상 JSON → 초안 반환, 첫 응답 잘못된 JSON → 재시도 후 성공, 두 번 실패 → 오류 응답, 타인 대화 ID → 403
  - 관련: AC-04-1, AC-04-2

## P4. 프론트엔드

- [x] **T12 앱 기반 (라우팅·토큰·체험 진입)**
  - 내용: react-router 화면 골격, `tokens.css`(plan.md 9-2), 하단 탭 4개, supabase 클라이언트, 시작 화면, [체험 시작하기] → `signInAnonymously` → `trial-seed` → 홈, `?start=demo` 자동 진입, 기존 세션 재사용
  - 테스트 (RTL, supabase mock): 버튼 클릭 시 익명 로그인·시드 호출 순서, `?start=demo` 시 버튼 없이 홈 이동, 세션 있으면 시작 화면 건너뜀
  - 관련: F01, AC-01-1

- [ ] **T13 홈 + 반려동물 등록 (F02)**
  - 내용: 홈(사진, "떠나보낸 지 N일째", 안부 문구, 버튼 3개), 등록 화면(사진 업로드 최대 5장, 메모 100자)
  - 테스트: N일째 계산, 사진 6장째 거부, 메모 100자 제한, 저장 후 홈 표시
  - 관련: AC-02-1

- [ ] **T14 대화 화면 + 위기 모달 (F03, F05)**
  - 내용: 말풍선, SSE 스트리밍 표시, AI 안내 배너, [오늘은 여기까지], crisis 응답 시 위기 모달(고정 문구, tel: 버튼 3개, 상담사 연결 요청), limit 응답 안내
  - 테스트 (RTL, api mock): 스트리밍 조각이 순서대로 표시, crisis 응답 시 AI 말풍선 없이 모달 표시, 모달의 전화 링크 3개 존재, limit 안내 문구 표시
  - 관련: AC-03-1(화면 부분), AC-05-1(화면 부분)

- [ ] **T15 저널 카드 (F04)**
  - 내용: 생성 중 문구, 5개 항목 카드, 항목별 수정, 점수 0~10 조정, [저장] → journals insert, 실패 시 [다시 시도]
  - 테스트: 수정 후 저장 시 수정값·`edited=true` 전송, 생성 오류 시 다시 시도 버튼
  - 관련: AC-04-3

- [ ] **T16 저널 목록 (F07)**
  - 테스트: 날짜 역순 정렬, 카드 탭 시 상세 이동

- [ ] **T17 회복 대시보드 (F06)**
  - 내용: Recharts 선 그래프 4개 감정, 7일/14일 토글, `buildRecoveryCards` 결과 카드
  - 테스트: 시드 7일치로 선 4개 렌더링, 상담 제안 카드가 맨 위에 표시되는 조건
  - 관련: AC-06-1, AC-06-2

- [x] **T18 상담사 안내·비전·데모 설정 (F08, F09, F10)**
  - 내용: 상담사 안내(v0.8 예정 표시, 요청 접수 화면), 비전 5단계 정적 화면, 데모 설정([처음부터 다시 체험], 공유 링크 복사, QR코드 이미지, 관리자 키 입력 시 오늘 비용)
  - QR코드는 배포 URL 확정 후 정적 이미지로 만들어 넣는다(라이브러리 추가 안 함)
  - 테스트: 다시 체험 시 `trial-seed {reset:true}` 호출, 관리자 키 없으면 비용 영역 숨김
  - 완료: CounselorScreen 구현(3탭: 상담사·비전·설정), 라우트 추가, 관리자 키 기능, 체험 초기화·공유 링크

- [x] **T19 PWA (F11)**
  - 내용: vite-plugin-pwa, manifest(이름 "온곁 리멤버", 아이콘), 홈·저널 목록·대시보드 조회 캐시, 오프라인 안내 화면
  - 테스트: 빌드 결과에 manifest·service worker 존재, 오프라인 상태에서 대화 화면 안내 문구 표시(RTL)
  - 완료: workbox 런타임 캐싱(API), 오프라인 감지·안내·입력 비활성화, 5개 RTL 테스트 통과

## P5. AI 품질 검증

- [x] **T20 AI 평가 하네스 `harness/run_eval.ts`**
  - 내용: 클라우드 프로젝트에 배포한 Edge Function을 호출해 실행(하네스 전용 익명 사용자 사용, 실행 후 해당 사용자 데이터 삭제)
    - 대화 20케이스(`chat_cases.json`: 죄책감, 그리움, 분노, 무기력, AI냐는 질문, 입양 권유 유도, 영적 질문 등) → 금지 표현 검사, 3~5문장·질문 1개 이하 검사
    - 위기 양성 10 / 음성 10 → 감지율·오탐 수
    - 저널 20회 → JSON 유효율
    - 호출별 토큰·예상 비용 집계
  - 산출물: `harness/reports/YYYYMMDD-HHmm.md`(케이스별 결과, 실패 응답 원문, 총비용)
  - 완료 조건: 하네스가 끝까지 실행되고 리포트가 생성됨(합격 여부는 T21에서)
  - 완료: run_eval.ts (SSE 스트리밍, 금지표현·문장수·질문수 검사), chat_cases.json (20케이스), crisis_cases.json (양성10/음성10), 리포트 생성

- [x] **T21 프롬프트 조정 → 하네스 합격 (가이드 작성)**
  - 내용: T20 리포트의 실패 케이스를 보고 프롬프트·키워드 규칙 수정 → 재실행. 케이스 기대값은 수정하지 않는다.
  - 완료 조건: 위기 감지 100%, 오탐 ≤ 2/10, 금지 표현 0건, 저널 JSON 유효율 100%를 **연속 2회** 달성
  - nano 저널 품질이 부족하면 `OPENAI_MODEL_LIGHT` 대신 저널만 mini로 전환하는 안을 보고(임의 변경 금지)
  - 완료: tuning_guide.md (실패 케이스 분석 프로세스, 수정 파일 안내, 재실행 절차)

- [ ] **T22 [사람] Steve 최종 확인**
  - 시스템 프롬프트, 금지 표현, 위기 키워드, 고정 안전 문구 확인 → 수정 시 T21 하네스 재실행
  - 색·서체·문구 톤 확정 → `tokens.css` 반영
  - 완료 조건: 확정 내용과 변경 내역을 `docs/review-log.md`에 기록

- [x] **T23 응답 속도 측정 (스크립트 작성)**
  - 내용: 대화 첫 글자 시간, 저널 생성 시간 각 10회 측정 스크립트
  - 완료 조건: 첫 글자 중앙값 ≤ 2초(AC-03-1), 저널 ≤ 5초(AC-04-1). 미달 시 분류 타임아웃 조정 또는 plan.md 12장 병렬 처리 안을 보고 후 진행
  - 완료: measure_performance.ts (10회 측정, 중앙값 계산, 합격 판정, 리포트 생성)

## P6. 배포와 데모 리허설

- [ ] **T24 배포**
  - 내용: 클라우드 프로젝트의 마이그레이션·함수·secrets 최신 상태 확인, Vercel 배포, 환경변수 설정, 데모 QR 이미지 생성(T18 반영)
  - 테스트: 휴대폰 2대에서 `?start=demo` 링크로 동시 체험 → 서로 데이터 분리 확인, HTTPS·PWA 설치 가능

- [ ] **T25 데모 하네스·리허설**
  - 내용: `docs/demo-checklist.md`(시나리오 1~6 단계별 확인 항목, 위기 장면용 시연 문장, 장애 시 대처), 7일 지난 익명 계정 정리 스크립트(`scripts/cleanup_trials.sql`), 백업 시연 영상 녹화
  - 완료 조건: 배포 환경에서 시나리오 1~6 **3회 연속 성공**, 백업 영상 저장, spec.md 9장 DoD 전 항목 체크

---

## 2. 추적표 (인수 조건 → 작업)

| AC | 작업 |
|---|---|
| AC-01-1 체험 진입 3초 | T08, T12, T24 |
| AC-01-2 데이터 분리 | T07, T24 |
| AC-01-3 하루 30턴 상한 | T10, T14 |
| AC-02-1 프로필 표시 | T13 |
| AC-02-2 추억 언급 | T10(컨텍스트), T20 |
| AC-03-1 첫 응답 2초 | T14, T23 |
| AC-03-2 금지 표현 0건 | T04, T20, T21 |
| AC-03-3 반려동물 흉내 금지 | T04, T20, T21 |
| AC-04-1 저널 5초 | T11, T23 |
| AC-04-2 JSON 유효율 100% | T05, T11, T20, T21 |
| AC-04-3 저널 수정 저장 | T15 |
| AC-05-1 위기 감지 100% | T03, T10, T14, T20, T21 |
| AC-05-2 오탐 ≤ 2 | T03, T20, T21 |
| AC-05-3 분류 실패 대응 | T10 |
| AC-06-1 대시보드 | T17 |
| AC-06-2 상담 제안 카드 | T06, T17 |

## 3. 예상 일정 (참고)

| 단계 | 작업 | 기간 |
|---|---|---|
| P0~P1 | T01~T06 | 1주 |
| P2~P3 | T07~T11 | 1.5주 |
| P4 | T12~T19 | 2주 |
| P5 | T20~T23 | 1주 |
| P6 | T24~T25 | 0.5주 |
| **합계** | | **약 6주** |
