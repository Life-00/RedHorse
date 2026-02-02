# 🔧 회원가입 오류 해결 방법

## 문제
"Auth UserPool not configured" 오류 발생

## 원인
환경 변수(`.env.local`)가 개발 서버에 로드되지 않음

## 해결 방법

### 1. 개발 서버 재시작 (필수)

**현재 실행 중인 개발 서버를 중지하고 다시 시작하세요:**

```bash
# 1. 현재 터미널에서 Ctrl+C로 개발 서버 중지

# 2. 다시 시작
npm run dev
```

### 2. 환경 변수 확인

개발 서버 시작 후 브라우저 콘솔(F12)에서 확인:

```javascript
// 브라우저 콘솔에서 실행
console.log(import.meta.env.VITE_COGNITO_USER_POOL_ID)
console.log(import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID)
```

**정상**: 값이 출력됨
**비정상**: `undefined` 출력 → `.env.local` 파일 위치 확인

### 3. .env.local 파일 위치 확인

파일이 **프로젝트 루트**에 있어야 합니다:

```
RedHorse/
├── .env.local          ← 여기!
├── package.json
├── vite.config.js
├── src/
└── backend/
```

### 4. 환경 변수 내용 확인

`.env.local` 파일 내용:

```bash
VITE_COGNITO_USER_POOL_ID=us-east-1_qkE8dIan5
VITE_COGNITO_USER_POOL_CLIENT_ID=5khcbjlr9o4ptgiimv597s7gg3
VITE_API_BASE_URL=https://rtzilsuyef.execute-api.us-east-1.amazonaws.com/prod
VITE_DEV_MODE=true
```

**중요**: 
- 변수명은 반드시 `VITE_`로 시작
- `=` 앞뒤에 공백 없음
- 따옴표 없음

---

## 빠른 해결

1. **터미널에서 개발 서버 중지** (Ctrl+C)
2. **다시 시작**: `npm run dev`
3. **브라우저 새로고침** (F5)
4. **회원가입 다시 시도**

---

## 여전히 안 되면

### 캐시 삭제 후 재시작

```bash
# 1. 개발 서버 중지 (Ctrl+C)

# 2. node_modules 캐시 삭제
rm -rf node_modules/.vite

# 3. 다시 시작
npm run dev
```

### 브라우저 캐시 삭제

1. F12 (개발자 도구)
2. Network 탭
3. "Disable cache" 체크
4. 페이지 새로고침

---

## 확인 방법

회원가입 페이지에서:
- ❌ "Auth UserPool not configured" → 환경 변수 로드 안 됨
- ✅ 회원가입 진행 가능 → 정상

---

## 추가 디버깅

브라우저 콘솔(F12)에서 경고 메시지 확인:

```
⚠️ env 누락: VITE_COGNITO_USER_POOL_ID / VITE_COGNITO_USER_POOL_CLIENT_ID
```

이 메시지가 보이면 환경 변수가 로드되지 않은 것입니다.
