# 🤝 기여 가이드 (Contributing Guide)

ShiftSync 프로젝트에 기여해주셔서 감사합니다! 이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 📋 목차

- [행동 강령](#-행동-강령)
- [시작하기](#-시작하기)
- [개발 워크플로우](#-개발-워크플로우)
- [코딩 컨벤션](#-코딩-컨벤션)
- [커밋 메시지 가이드](#-커밋-메시지-가이드)
- [Pull Request 프로세스](#-pull-request-프로세스)
- [이슈 리포팅](#-이슈-리포팅)

---

## 📜 행동 강령

이 프로젝트는 모든 기여자가 존중받는 환경을 유지하기 위해 행동 강령을 따릅니다:

- 🤝 서로를 존중하고 배려합니다
- 💬 건설적인 피드백을 제공합니다
- 🌍 다양성을 존중합니다
- 🚫 괴롭힘이나 차별을 용납하지 않습니다

---

## 🚀 시작하기

### 1. 저장소 포크 및 클론

```bash
# 저장소 포크 (GitHub에서)
# 포크한 저장소 클론
git clone https://github.com/YOUR_USERNAME/shiftsync.git
cd shiftsync

# 원본 저장소를 upstream으로 추가
git remote add upstream https://github.com/ORIGINAL_OWNER/shiftsync.git
```

### 2. 개발 환경 설정

```bash
# 프론트엔드 의존성 설치
npm install

# 백엔드 의존성 설치
cd backend
pip install -r requirements.txt
```

### 3. 환경 변수 설정

```bash
# 프론트엔드
cp .env.example .env.local

# 백엔드
cp backend/.env.example backend/.env
```

---

## 🔄 개발 워크플로우

### 브랜치 전략

- `main` - 프로덕션 브랜치 (보호됨)
- `develop` - 개발 브랜치
- `feature/*` - 새로운 기능
- `bugfix/*` - 버그 수정
- `hotfix/*` - 긴급 수정

### 새 기능 개발

```bash
# develop 브랜치에서 시작
git checkout develop
git pull upstream develop

# 새 기능 브랜치 생성
git checkout -b feature/your-feature-name

# 개발 진행
# ... 코드 작성 ...

# 변경사항 커밋
git add .
git commit -m "feat: add your feature description"

# 원격 저장소에 푸시
git push origin feature/your-feature-name
```

---

## 📝 코딩 컨벤션

### Frontend (React/TypeScript)

#### 파일 명명 규칙
```
- 컴포넌트: PascalCase (예: UserProfile.tsx)
- 유틸리티: camelCase (예: formatDate.ts)
- 타입: PascalCase (예: UserTypes.ts)
```

#### 코드 스타일
```typescript
// ✅ Good
interface UserProfile {
  userId: string;
  email: string;
  name: string;
}

export function UserCard({ user }: { user: UserProfile }) {
  return (
    <div className="rounded-lg bg-white p-4">
      <h2 className="text-xl font-bold">{user.name}</h2>
      <p className="text-gray-600">{user.email}</p>
    </div>
  );
}

// ❌ Bad
function usercard(props: any) {
  return <div>{props.user.name}</div>;
}
```

#### ESLint 규칙 준수
```bash
# 린트 체크
npm run lint

# 자동 수정
npm run lint -- --fix
```

### Backend (Python)

#### 파일 명명 규칙
```
- 모듈: snake_case (예: user_management.py)
- 클래스: PascalCase (예: DatabaseManager)
- 함수: snake_case (예: get_user_profile)
```

#### 코드 스타일 (PEP 8)
```python
# ✅ Good
def calculate_fatigue_score(
    sleep_hours: float,
    consecutive_nights: int,
    commute_time: int
) -> dict:
    """
    피로도 점수 계산
    
    Args:
        sleep_hours: 수면 시간 (시간)
        consecutive_nights: 연속 야간 근무 일수
        commute_time: 출퇴근 시간 (분)
        
    Returns:
        dict: 피로도 점수 및 위험도
    """
    score = 0
    
    if sleep_hours < 6:
        score += 30
    
    score += consecutive_nights * 10
    score += commute_time // 10
    
    return {
        'score': min(score, 100),
        'risk_level': 'high' if score > 70 else 'medium' if score > 40 else 'low'
    }

# ❌ Bad
def calc(s,n,c):
    return s+n+c
```

### Tailwind CSS 클래스 순서

```typescript
// 권장 순서: Layout → Box Model → Typography → Visual → Misc
<div className="
  flex items-center justify-between  // Layout
  w-full h-12 p-4 m-2              // Box Model
  text-lg font-bold                 // Typography
  bg-blue-500 text-white rounded-lg // Visual
  hover:bg-blue-600 transition      // Misc
">
```

---

## 💬 커밋 메시지 가이드

### Conventional Commits 형식 사용

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 종류

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 코드 추가/수정
- `chore`: 빌드 프로세스, 도구 설정 등

### 예시

```bash
# 기능 추가
git commit -m "feat(auth): add social login with Google"

# 버그 수정
git commit -m "fix(schedule): resolve OCR parsing error for night shifts"

# 문서 업데이트
git commit -m "docs(readme): update deployment instructions"

# 리팩토링
git commit -m "refactor(api): simplify error handling logic"

# 상세 설명이 필요한 경우
git commit -m "feat(wellness): add meditation audio player

- Implement S3 streaming for audio files
- Add play/pause/seek controls
- Support background playback

Closes #123"
```

---

## 🔍 Pull Request 프로세스

### 1. PR 생성 전 체크리스트

- [ ] 코드가 린트 규칙을 통과하는가?
- [ ] 모든 테스트가 통과하는가?
- [ ] 문서가 업데이트되었는가?
- [ ] 커밋 메시지가 컨벤션을 따르는가?
- [ ] 변경사항이 기존 기능을 깨뜨리지 않는가?

### 2. PR 템플릿

```markdown
## 📝 변경 사항 요약
<!-- 무엇을 변경했는지 간단히 설명 -->

## 🎯 변경 이유
<!-- 왜 이 변경이 필요한지 설명 -->

## 🧪 테스트 방법
<!-- 어떻게 테스트했는지 설명 -->

## 📸 스크린샷 (UI 변경 시)
<!-- UI 변경이 있다면 스크린샷 첨부 -->

## ✅ 체크리스트
- [ ] 코드 린트 통과
- [ ] 테스트 통과
- [ ] 문서 업데이트
- [ ] 리뷰어 지정
```

### 3. 리뷰 프로세스

1. **PR 생성**: 변경사항을 설명하는 PR 생성
2. **자동 체크**: CI/CD 파이프라인 통과 확인
3. **코드 리뷰**: 최소 1명의 리뷰어 승인 필요
4. **수정 반영**: 리뷰 피드백 반영
5. **머지**: 승인 후 develop 브랜치에 머지

---

## 🐛 이슈 리포팅

### 버그 리포트

```markdown
**🐛 버그 설명**
명확하고 간결한 버그 설명

**📋 재현 단계**
1. '...'로 이동
2. '...'를 클릭
3. '...'까지 스크롤
4. 오류 발생

**✅ 예상 동작**
무엇이 일어나야 하는지 설명

**❌ 실제 동작**
실제로 무엇이 일어났는지 설명

**📸 스크린샷**
가능하다면 스크린샷 첨부

**🖥️ 환경**
- OS: [예: Windows 11]
- 브라우저: [예: Chrome 120]
- 버전: [예: 1.0.0]

**📝 추가 정보**
기타 관련 정보
```

### 기능 제안

```markdown
**💡 기능 설명**
제안하는 기능에 대한 명확한 설명

**🎯 문제점**
이 기능이 해결하는 문제는?

**💭 제안하는 솔루션**
어떻게 구현되어야 하는가?

**🔄 대안**
고려한 다른 대안들

**📝 추가 정보**
기타 관련 정보나 스크린샷
```

---

## 🏷️ 라벨 시스템

### 이슈 라벨

- `bug` 🐛 - 버그 리포트
- `enhancement` ✨ - 새로운 기능 제안
- `documentation` 📚 - 문서 관련
- `good first issue` 🌱 - 초보자에게 적합
- `help wanted` 🙋 - 도움이 필요함
- `priority: high` 🔴 - 높은 우선순위
- `priority: medium` 🟡 - 중간 우선순위
- `priority: low` 🟢 - 낮은 우선순위

---

## 🎓 학습 리소스

### Frontend
- [React 공식 문서](https://react.dev/)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)

### Backend
- [AWS Lambda 개발자 가이드](https://docs.aws.amazon.com/lambda/)
- [AWS Bedrock 문서](https://docs.aws.amazon.com/bedrock/)
- [Python PEP 8 스타일 가이드](https://peps.python.org/pep-0008/)

---

## 💡 팁

### 효율적인 개발을 위한 팁

1. **작은 단위로 커밋**: 논리적으로 관련된 변경사항만 포함
2. **자주 푸시**: 작업 내용을 자주 원격 저장소에 백업
3. **리베이스 활용**: `git rebase`로 깔끔한 커밋 히스토리 유지
4. **테스트 작성**: 새 기능에는 항상 테스트 추가
5. **문서화**: 복잡한 로직은 주석으로 설명

### 도움이 필요하신가요?

- 💬 [GitHub Discussions](https://github.com/your-repo/discussions)에서 질문
- 📧 이메일: support@shiftsync.com
- 📚 [프로젝트 위키](https://github.com/your-repo/wiki) 참고

---

## 🙏 감사합니다!

여러분의 기여가 ShiftSync를 더 나은 프로젝트로 만듭니다. 함께 교대근무자들의 건강한 삶을 지원해요! 💪

---

<div align="center">

**Made with ❤️ by the ShiftSync Community**

</div>
