# LIVE TEXT — 배포 가이드

## 30분 안에 배포하기

### 1단계: Supabase 설정 (10분)

1. [supabase.com](https://supabase.com) 접속 → 무료 계정 생성
2. 새 프로젝트 생성
3. **SQL Editor** 메뉴 → `supabase-setup.sql` 파일 내용 복사 후 실행
4. **Settings > API** 에서 아래 두 값을 복사해 두기
   - `Project URL`
   - `anon public` key

---

### 2단계: GitHub에 코드 올리기 (5분)

1. [github.com](https://github.com) 에서 새 저장소(repository) 생성
2. 이 폴더 전체를 업로드 (또는 git push)

> `.env.local` 파일은 절대 올리지 마세요 (`.gitignore`에 이미 포함됨)

---

### 3단계: Vercel 배포 (5분)

1. [vercel.com](https://vercel.com) 접속 → GitHub 계정으로 로그인
2. **Add New Project** → 방금 만든 저장소 선택
3. **Environment Variables** 에 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` = 1단계에서 복사한 Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 1단계에서 복사한 anon key
4. **Deploy** 클릭

배포 완료 후 `https://your-project.vercel.app` 형태의 URL이 생성됩니다.

---

## 사용 방법

| 페이지 | URL | 용도 |
|--------|-----|------|
| 운영자 | `/operator` | 행사 시작 전 여기서 시작 |
| 참가자 | `/participant?event=XXXX` | QR 코드로 공유 |
| 스크린 | `/screen?event=XXXX` | 빔프로젝터/모니터에 표시 |

### 행사 당일 순서
1. `/operator` 접속 → 자동으로 행사 코드(#XXXX) 생성
2. **QR 코드 보기** 버튼 클릭 → QR 코드를 행사장에 표시
3. **스크린 열기** 버튼 → 새 창을 빔프로젝터 화면에 전체화면으로 띄움
4. 참가자가 QR 스캔 → 메시지 입력
5. 운영자 화면 왼쪽에 메시지 수신 → **승인** 클릭
6. 승인된 메시지 오른쪽 패널에 표시 → **스크린 송출** 클릭
7. 빔프로젝터 화면에 메시지 표시됨

---

## 로컬에서 먼저 테스트하기 (선택)

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어서 Supabase URL과 Key 입력

# 3. 실행
npm run dev

# 브라우저에서 http://localhost:3000 접속
```
