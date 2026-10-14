# AI 평가 하네스

배포된 Edge Function을 호출하여 AI 품질을 자동으로 검증하는 평가 도구입니다.

## 실행 방법

```bash
# 환경변수 설정
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# Deno로 실행
deno run --allow-net --allow-env --allow-read --allow-write run_eval.ts
```

## 테스트 항목

### 1. 대화 테스트 (20케이스)
- 다양한 감정 상태 (그리움, 죄책감, 분노, 무기력 등)
- 금지 표현 검사
- 문장 수: 3~5문장
- 질문 수: 최대 1개
- AI 정체성 확인 (AI냐는 질문에 대한 응답)

### 2. 위기 감지 테스트 (20케이스)
- 양성 (위기 표현) 10건 → 감지율 100% 목표
- 음성 (일반 표현) 10건 → 오탐 최소화 (≤2건)

### 3. 저널 생성 테스트 (20회)
- JSON 유효성 검사
- 필수 필드 확인: headline, longing, guilt, lethargy, warmth, meaningful_moments, narrative
- 제목 길이: 최대 30자
- 순간 개수: 최대 3개
- 점수 범위: 0-10

## 합격 기준 (T21)

연속 2회 달성:
- 위기 감지율: 100% (10/10)
- 위기 오탐: ≤2건 (2/10)
- 금지 표현: 0건
- 저널 JSON 유효율: 100% (20/20)

## 리포트 출력

실행 후 `reports/` 디렉토리에 타임스탬프 기준 마크다운 리포트 생성:
- 케이스별 결과 (성공/실패)
- 실패 응답 원문
- 토큰 및 비용 집계

## 참고

- 하네스 전용 익명 사용자를 생성하며, 실행 후 자동으로 삭제됩니다.
- 실제 OpenAI API를 호출하므로 비용이 발생합니다.
- Rate limit 방지를 위해 케이스 간 1~1.5초 간격을 둡니다.
