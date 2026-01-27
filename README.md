# ShiftHealth - 교대근무자 건강 관리 앱

아로마테라피 기반 시각적 테라피를 통해 교대근무자의 건강을 관리하는 웹 애플리케이션입니다.

## 🌟 주요 기능

- **아로마테라피 시각적 테라피**: 시간대별 자동 테마 변경으로 눈의 피로 완화
- **수면 패턴 관리**: AI 기반 개인 맞춤 수면 계획 제공
- **카페인 섭취 추적**: 건강한 카페인 섭취량 관리
- **피로도 모니터링**: 실시간 피로도 분석 및 개선 제안
- **AI 건강 상담**: 24시간 AI 상담사와의 대화
- **팀 대시보드**: 팀원들의 건강 상태 모니터링
- **백색소음 플레이어**: 집중력 향상을 위한 환경음 제공

## 🏗️ 아키텍처

### 프론트엔드 (이 저장소)
- **React 18** + **TypeScript**
- **Framer Motion** (애니메이션)
- **Recharts** (데이터 시각화)
- **Lucide React** (아이콘)

### AWS 클라우드 인프라
```
사용자 → Route 53 → CloudFront → S3 (정적 파일)
                              ↓
                         API Gateway
                         ↙        ↘
                    Lambda      ALB → Fargate
                 (기본 API)    (AI/ML 처리)
```

- **S3**: 정적 웹사이트 호스팅
- **CloudFront**: CDN 및 HTTPS 제공
- **Route 53**: 도메인 관리
- **API Gateway**: 단일 API 진입점
- **Lambda**: 기본 API 처리 (/user, /schedule, /sleep, /caffeine, /stats)
- **Fargate**: AI/ML 처리 (/analysis, /chat)

## 🚀 로컬 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm start

# 프로덕션 빌드
npm run build
```

### 환경 변수 설정
```bash
# .env.development 파일 생성
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG_MODE=true
```

## 📦 AWS 배포

### 1. 사전 준비
```bash
# AWS CLI 설치 및 구성
aws configure

# 도메인 설정
export DOMAIN_NAME="your-app.com"
export AWS_REGION="ap-northeast-2"
```

### 2. 인프라 배포
```bash
# CloudFormation 스택 배포
aws cloudformation deploy \
  --template-file aws/cloudformation-frontend.yaml \
  --stack-name shifthealth-frontend \
  --parameter-overrides DomainName=$DOMAIN_NAME \
  --capabilities CAPABILITY_IAM \
  --region $AWS_REGION
```

### 3. 애플리케이션 배포
```bash
# 자동 배포 스크립트 실행
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

또는 수동 배포:
```bash
# 프로덕션 빌드
npm run build:prod

# S3 업로드
aws s3 sync build/ s3://your-app-frontend --delete

# CloudFront 캐시 무효화
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## 🔧 개발 가이드

### 프로젝트 구조
```
src/
├── components/          # 재사용 가능한 컴포넌트
├── screens/            # 페이지 컴포넌트
├── context/            # React Context
├── hooks/              # 커스텀 훅
├── config/             # 설정 파일
├── theme/              # 테마 설정
├── types/              # TypeScript 타입 정의
└── utils/              # 유틸리티 함수
```

### API 통합
```typescript
// API 서비스 사용 예시
import { useApi, useMutation } from '../hooks/useApi';
import { apiServices } from '../config/api';

// 데이터 조회
const { data, loading, error } = useApi(() => apiServices.user.getProfile());

// 데이터 변경
const { mutate: updateProfile } = useMutation(apiServices.user.updateProfile);
```

### 테마 시스템
```typescript
// 아로마테라피 테마 사용
import { useAroma } from '../context/AromaContext';

const { currentTheme, updateAromaByStress } = useAroma();
updateAromaByStress('high'); // 라벤더 테마로 변경
```

## 🎨 디자인 시스템

### 색상 팔레트
- **라벤더**: 수면/휴식 (#E6E6FA)
- **민트**: 상쾌함/집중 (#E0F2E7)
- **카모마일**: 편안함/저녁 (#FFF8DC)
- **유칼립투스**: 집중/오후 (#E0F6FF)

### 애니메이션 원칙
- 부드러운 전환 (0.3s ease-out)
- 안개 피어오르는 효과
- 눈의 피로를 줄이는 저자극 모션

## 🔒 보안

- **HTTPS 강제**: CloudFront를 통한 SSL/TLS
- **CSP 헤더**: XSS 공격 방지
- **CORS 설정**: API Gateway에서 도메인 제한
- **인증**: JWT 토큰 기반 인증

## 📊 모니터링

- **CloudWatch**: 인프라 모니터링
- **Real User Monitoring**: 사용자 경험 추적
- **Error Tracking**: 오류 로그 수집

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.

## 📞 지원

문의사항이 있으시면 [이슈](https://github.com/your-org/shifthealth-frontend/issues)를 생성해주세요.

---

**ShiftHealth** - 건강한 교대근무 생활의 시작 🌙✨