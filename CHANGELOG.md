# 📝 Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🎯 Planned
- 웨어러블 디바이스 연동 (Apple Watch, Galaxy Watch)
- 다국어 지원 (영어, 일본어)
- 팀 관리 기능 (관리자용)
- 수면 품질 트래킹

---

## [1.0.0] - 2026-01-30

### 🎉 Initial Release

#### ✨ Added
- **AI 챗봇 상담**: AWS Bedrock RAG Agent 기반 대화형 AI
- **맞춤형 수면 계획**: Bio-Coach Agent를 활용한 개인화된 수면 추천
- **카페인 섭취 관리**: 근무 스케줄 기반 카페인 마감 시간 계산
- **피로 위험도 평가**: 수면, 야간 근무, 출퇴근 시간 종합 분석
- **스케줄 관리**: 
  - OCR 기반 자동 스케줄 등록
  - 수동 스케줄 입력
  - 월간/주간 일정 시각화
- **Daily Jumpstart**: 3단계 블록 시스템 (Now/Must-do/Recovery)
- **이완 & 휴식 허브**: 명상 오디오 및 백색소음 재생
- **사용자 인증**: AWS Cognito 기반 회원가입/로그인

#### 🏗️ Infrastructure
- AWS Lambda 서버리스 아키텍처 (8개 함수)
- AWS RDS PostgreSQL 데이터베이스
- AWS S3 파일 스토리지
- AWS CloudFront CDN
- AWS API Gateway REST API

#### 🛠️ Technical Stack
- **Frontend**: React 19.2, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend**: Python 3.x, AWS Lambda, AWS Bedrock Agents
- **Database**: PostgreSQL (AWS RDS)
- **AI**: 3개의 Bedrock Agents (RAG Chatbot, OCR, Bio-Coach)

#### 📚 Documentation
- 프로젝트 README
- 배포 가이드 (DEPLOYMENT.md)
- Bedrock Agent 설정 가이드
- API 문서

---

## Version History

### Version Naming Convention
- **Major (X.0.0)**: Breaking changes, 주요 기능 추가
- **Minor (0.X.0)**: 새로운 기능 추가 (하위 호환)
- **Patch (0.0.X)**: 버그 수정, 작은 개선

### Release Types
- 🎉 **Initial Release**: 첫 번째 공식 릴리스
- ✨ **Added**: 새로운 기능
- 🔧 **Changed**: 기존 기능 변경
- 🗑️ **Deprecated**: 곧 제거될 기능
- 🚫 **Removed**: 제거된 기능
- 🐛 **Fixed**: 버그 수정
- 🔒 **Security**: 보안 관련 수정

---

## Contributing

변경 사항을 추가하려면:
1. 이 파일의 `[Unreleased]` 섹션에 변경 사항 추가
2. 적절한 카테고리 사용 (Added, Changed, Fixed 등)
3. 간결하고 명확한 설명 작성
4. 관련 이슈나 PR 번호 링크

예시:
```markdown
### ✨ Added
- 새로운 알림 기능 추가 (#123)
- 다크 모드 지원 (#124)

### 🐛 Fixed
- 스케줄 OCR 파싱 오류 수정 (#125)
```

---

<div align="center">

**ShiftSync** - Made with ❤️ for Shift Workers

</div>
