# Vercel 배포 가이드

npm workspace 이슈로 인해 CLI 자동 배포가 제한됩니다.
**Vercel Dashboard를 통한 배포를 권장합니다.**

## 방법 1: Vercel Dashboard (권장) ⭐

### Step 1: GitHub에 푸시

```bash
# GitHub 저장소 생성 후
git remote add origin https://github.com/your-username/pet-loss-care.git
git push -u origin main01
```

### Step 2: Vercel 프로젝트 생성

1. https://vercel.com/new 접속
2. **Import Git Repository** 선택
3. GitHub 저장소 선택
4. 다음 설정 입력:

**Framework Preset:**
- `Vite` 선택

**Root Directory:**
- `web` 입력

**Build and Output Settings:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: (비워둠 - 워크스페이스에서 자동 처리)

**Environment Variables:**
```
VITE_SUPABASE_URL=https://lcuovdsvejnkzhsdvelx.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase에서 확인>
```

### Step 3: Supabase Anon Key 확인

1. https://supabase.com/dashboard/project/lcuovdsvejnkzhsdvelx/settings/api
2. **anon** 키 복사
3. Vercel Environment Variables에 붙여넣기

### Step 4: 배포

**Deploy** 버튼 클릭

---

## 방법 2: 빌드 파일 직접 업로드

```bash
cd web

# dist 폴더를 zip으로 압축
tar -czf dist.tar.gz dist/

# 또는 Windows에서
powershell Compress-Archive -Path dist -DestinationPath dist.zip
```

1. https://vercel.com/new 접속
2. **Browse** 클릭
3. `dist.zip` 또는 `dist` 폴더 선택
4. 프로젝트 이름 입력
5. Environment Variables 설정 (위와 동일)
6. Deploy

---

## 방법 3: Vercel CLI (워크스페이스 수정 필요)

루트 package.json에서 workspace 설정 제거 후:

```bash
cd web

# .vercel 디렉토리 제거 (있다면)
rm -rf .vercel

# 배포
vercel --prod
```

단, 이 방법은 workspace 구조를 변경해야 하므로 **권장하지 않습니다**.

---

## 배포 후 확인

배포 완료 후 받은 URL에서:

1. `https://your-app.vercel.app` 접속
2. `https://your-app.vercel.app/?start=demo` 체험 진입 테스트
3. 대화, 저널, 대시보드 기능 확인

---

## 환경변수 상세

### VITE_SUPABASE_URL
```
https://lcuovdsvejnkzhsdvelx.supabase.co
```

### VITE_SUPABASE_ANON_KEY
Supabase Dashboard에서 확인:
1. Project Settings → API
2. "anon / public" 키 복사

---

## 트러블슈팅

### 빌드 실패

**문제:** `npm install` 오류
**해결:** Root Directory를 `web`로 설정했는지 확인

### CORS 오류

**문제:** API 호출 실패
**해결:** Supabase Dashboard → Settings → API → CORS에 Vercel URL 추가

### 환경변수 미적용

**문제:** Supabase 연결 실패
**해결:** Vercel Dashboard → Settings → Environment Variables 확인 후 재배포

---

## 다음 단계

배포 완료 후:
1. QR 코드 생성 (배포 URL 사용)
2. T21: 하네스 실행
3. T23: 성능 측정
4. T25: 데모 리허설
