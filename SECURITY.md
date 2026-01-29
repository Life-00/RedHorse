# 🔒 보안 정책 (Security Policy)

## 지원되는 버전

현재 보안 업데이트를 받는 ShiftSync 버전:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## 🚨 보안 취약점 보고

ShiftSync의 보안을 유지하는 데 도움을 주셔서 감사합니다. 보안 취약점을 발견하셨다면 책임감 있게 공개해주시기 바랍니다.

### 보고 방법

**⚠️ 공개 이슈로 보안 취약점을 보고하지 마세요!**

대신 다음 방법 중 하나를 사용해주세요:

1. **이메일**: security@shiftsync.com
2. **GitHub Security Advisory**: [Create a security advisory](https://github.com/your-repo/security/advisories/new)

### 보고서에 포함할 정보

보안 취약점을 보고할 때 다음 정보를 포함해주세요:

- 🔍 **취약점 유형** (예: SQL Injection, XSS, CSRF 등)
- 📍 **영향을 받는 파일/경로**
- 📝 **취약점 재현 단계**
- 💥 **잠재적 영향**
- 🛠️ **가능한 해결 방법** (선택사항)
- 📧 **연락처 정보**

### 보고서 예시

```markdown
**취약점 유형**: SQL Injection

**영향을 받는 컴포넌트**: 
- backend/lambda/schedule_management/handler.py
- Line 145-150

**재현 단계**:
1. /users/{user_id}/schedules 엔드포인트에 접근
2. 다음 페이로드 전송: `{"date": "2024-01-01' OR '1'='1"}`
3. 데이터베이스 쿼리가 실행됨

**잠재적 영향**:
- 무단 데이터 접근
- 데이터베이스 정보 유출

**제안 해결 방법**:
- Prepared statements 사용
- 입력 값 검증 강화
```

## 📋 보안 취약점 처리 프로세스

### 1. 접수 (24시간 이내)
- 보고서 접수 확인
- 초기 평가 시작

### 2. 평가 (3-5일)
- 취약점 재현 및 검증
- 심각도 평가 (Critical, High, Medium, Low)
- 영향 범위 분석

### 3. 수정 (심각도에 따라)
- **Critical**: 24-48시간
- **High**: 1주일
- **Medium**: 2주일
- **Low**: 다음 정기 릴리스

### 4. 공개
- 패치 배포 후 30일 뒤 공개
- 보고자와 협의하여 공개 시기 조정 가능
- CVE 번호 할당 (필요시)

## 🏆 보안 연구자 인정

보안 취약점을 책임감 있게 보고해주신 분들을 SECURITY_HALL_OF_FAME.md에 기록합니다 (동의하신 경우).

## 🛡️ 보안 모범 사례

### 사용자를 위한 보안 가이드

#### 1. 강력한 비밀번호 사용
```
✅ Good: MyP@ssw0rd!2024#ShiftSync
❌ Bad: password123
```

#### 2. 2단계 인증 활성화
- AWS Cognito MFA 설정 권장
- 인증 앱 사용 (Google Authenticator, Authy 등)

#### 3. 정기적인 비밀번호 변경
- 최소 3개월마다 변경
- 다른 서비스와 동일한 비밀번호 사용 금지

#### 4. 의심스러운 활동 보고
- 비정상적인 로그인 시도
- 예상치 못한 데이터 변경
- 이상한 이메일 수신

### 개발자를 위한 보안 가이드

#### 1. 환경 변수 관리
```bash
# ❌ 절대 커밋하지 마세요
.env
.env.local
backend/.env

# ✅ .gitignore에 추가
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore
```

#### 2. AWS 자격 증명 보호
```bash
# ❌ 하드코딩 금지
aws_access_key = "AKIAIOSFODNN7EXAMPLE"

# ✅ 환경 변수 사용
aws_access_key = os.environ.get('AWS_ACCESS_KEY_ID')
```

#### 3. SQL Injection 방지
```python
# ❌ 문자열 포맷팅 사용 금지
query = f"SELECT * FROM users WHERE id = {user_id}"

# ✅ Prepared statements 사용
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))
```

#### 4. XSS 방지
```typescript
// ❌ dangerouslySetInnerHTML 사용 금지
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ✅ 텍스트로 렌더링
<div>{userInput}</div>
```

#### 5. CORS 설정
```python
# ✅ 프로덕션에서는 특정 도메인만 허용
headers = {
    'Access-Control-Allow-Origin': 'https://shiftsync.com',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
}
```

## 🔐 데이터 보안

### 저장 데이터
- ✅ AWS RDS 암호화 활성화
- ✅ 민감한 데이터는 암호화하여 저장
- ✅ 정기적인 백업 수행

### 전송 데이터
- ✅ HTTPS/TLS 사용 (CloudFront)
- ✅ API 요청에 인증 토큰 포함
- ✅ 민감한 데이터는 POST body에 포함

### 개인정보
- ✅ 최소한의 정보만 수집
- ✅ 사용자 동의 후 수집
- ✅ 정기적인 데이터 정리

## 📚 보안 관련 리소스

### AWS 보안 가이드
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [AWS Lambda Security](https://docs.aws.amazon.com/lambda/latest/dg/lambda-security.html)
- [AWS RDS Security](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.html)

### OWASP 리소스
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

### 보안 도구
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - 프론트엔드 의존성 검사
- [Safety](https://pyup.io/safety/) - Python 의존성 검사
- [AWS Security Hub](https://aws.amazon.com/security-hub/) - AWS 리소스 보안 검사

## 🔄 정기 보안 점검

### 월간
- [ ] 의존성 업데이트 확인
- [ ] 보안 패치 적용
- [ ] 액세스 로그 검토

### 분기별
- [ ] 보안 감사 수행
- [ ] 침투 테스트
- [ ] 보안 정책 검토

### 연간
- [ ] 전체 보안 평가
- [ ] 재해 복구 계획 테스트
- [ ] 보안 교육 실시

## 📞 연락처

보안 관련 문의:
- 📧 **Email**: security@shiftsync.com
- 🔒 **PGP Key**: [공개 키 링크]
- ⏰ **응답 시간**: 24시간 이내

일반 문의:
- 💬 **GitHub Issues**: [링크]
- 📧 **Email**: support@shiftsync.com

---

## 🙏 감사의 말

ShiftSync의 보안을 개선하는 데 도움을 주신 모든 보안 연구자분들께 감사드립니다.

---

<div align="center">

**보안은 우리 모두의 책임입니다** 🔒

</div>
