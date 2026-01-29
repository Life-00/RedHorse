# Bedrock Agent 연결 가이드

## 📋 개요

이 가이드는 AWS Bedrock Agent RAG 챗봇을 Lambda 함수에 연결하는 방법을 설명합니다.

## ✅ 완료된 작업

### 1. 환경 변수 설정
- `backend/.env`에 Bedrock Agent 정보 추가됨
  ```bash
  BEDROCK_AGENT_ID=9NPCFXV4WV
  BEDROCK_AGENT_ALIAS_ID=6FHUTRQ2GT
  BEDROCK_REGION=us-east-1
  ```

### 2. Lambda 함수 코드 업데이트
- `backend/lambda/ai_services/handler.py`의 `chat_with_ai()` 함수가 Bedrock Agent를 호출하도록 수정됨
- 오류 발생 시 더미 응답으로 폴백하는 로직 포함

### 3. 배포 스크립트 업데이트
- `backend/scripts/deploy_lambda.py`에 Bedrock 환경 변수 추가
- IAM 역할에 Bedrock Agent 권한 자동 추가 기능 포함

### 4. IAM 정책 문서 생성
- `backend/infrastructure/bedrock_agent_policy.json` 생성

## 🚀 배포 단계

### 1단계: Bedrock Agent 연결 테스트 (로컬)

먼저 로컬에서 Bedrock Agent 연결을 테스트합니다:

```bash
cd backend
python scripts/test_bedrock_agent.py
```

**예상 출력:**
```
============================================================
🤖 Bedrock Agent 연결 테스트
============================================================

Agent ID: 9NPCFXV4WV
Agent Alias ID: 6FHUTRQ2GT
Region: us-east-1

📡 Bedrock Agent Runtime 클라이언트 생성 중...
✅ 클라이언트 생성 완료

💬 테스트 메시지: 안녕하세요! 야간 근무 후 수면 관리 팁을 알려주세요.
🔑 세션 ID: test-session-001

🚀 Agent 호출 중...

📥 응답 수신 중...

============================================================
🤖 Agent 응답:
============================================================

[Agent의 응답이 여기에 표시됩니다]

============================================================
✅ 테스트 성공!
============================================================
```

### 2단계: Lambda 함수 배포

Lambda 함수를 AWS에 배포합니다:

```bash
cd backend
python scripts/deploy_lambda.py
```

이 스크립트는 자동으로:
- IAM 역할 생성 (또는 기존 역할 사용)
- Bedrock Agent 권한 추가
- 모든 Lambda 함수 배포 (ai_services 포함)
- 환경 변수 설정

### 3단계: Lambda IAM 권한 확인

배포 후 Lambda 함수의 IAM 역할에 다음 권한이 있는지 확인:

**AWS Console → IAM → Roles → shift-worker-wellness-lambda-role**

필요한 권한:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeAgent",
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

### 4단계: Lambda 함수 테스트

AWS Console에서 Lambda 함수를 직접 테스트:

**AWS Console → Lambda → shift-worker-wellness-ai_services → Test**

테스트 이벤트:
```json
{
  "httpMethod": "POST",
  "path": "/users/test-user-123/chat",
  "body": "{\"message\": \"야간 근무 후 수면 관리 팁을 알려주세요\"}",
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "test-user-123"
      }
    }
  }
}
```

### 5단계: API Gateway 연결 확인

API Gateway가 Lambda 함수와 올바르게 연결되어 있는지 확인:

**AWS Console → API Gateway → [Your API] → Resources**

필요한 엔드포인트:
- `POST /users/{user_id}/chat` → `shift-worker-wellness-ai_services`

### 6단계: 프론트엔드에서 테스트

프론트엔드 앱에서 챗봇을 열고 메시지를 보내 테스트합니다.

## 🔧 문제 해결

### 문제 1: AccessDeniedException

**증상:**
```
AccessDeniedException: User is not authorized to perform: bedrock:InvokeAgent
```

**해결 방법:**
1. Lambda 실행 역할에 Bedrock 권한 추가
2. AWS Console → IAM → Roles → shift-worker-wellness-lambda-role
3. "Add permissions" → "Create inline policy"
4. `backend/infrastructure/bedrock_agent_policy.json` 내용 붙여넣기

### 문제 2: Agent Not Found

**증상:**
```
ResourceNotFoundException: Agent not found
```

**해결 방법:**
1. Agent ID와 Alias ID가 올바른지 확인
2. `backend/.env` 파일 확인
3. Bedrock Agent가 활성화되어 있는지 확인

### 문제 3: Timeout

**증상:**
```
Task timed out after 30.00 seconds
```

**해결 방법:**
1. Lambda 함수 타임아웃 증가
2. AWS Console → Lambda → Configuration → General configuration
3. Timeout을 60초로 증가

### 문제 4: 더미 응답만 나옴

**증상:**
챗봇이 Bedrock Agent 대신 더미 응답을 반환

**해결 방법:**
1. Lambda 함수 로그 확인 (CloudWatch Logs)
2. 환경 변수가 올바르게 설정되었는지 확인
3. `BEDROCK_AGENT_ID`와 `BEDROCK_AGENT_ALIAS_ID`가 비어있지 않은지 확인

## 📊 모니터링

### CloudWatch Logs 확인

Lambda 함수 실행 로그:
```bash
aws logs tail /aws/lambda/shift-worker-wellness-ai_services --follow
```

### 주요 로그 메시지

성공:
```
Bedrock Agent 호출: agent_id=9NPCFXV4WV, alias_id=6FHUTRQ2GT, session_id=...
Bedrock Agent 응답: [응답 내용]...
```

실패:
```
Bedrock Agent 호출 오류: [오류 메시지]
Bedrock Agent 설정이 없습니다. 더미 응답을 사용합니다.
```

## 🎯 다음 단계

Bedrock Agent 연결이 완료되면:

1. **수면 계획 AI 생성** - `generate_sleep_plan()` 함수에 Bedrock 통합
2. **카페인 계획 AI 생성** - `generate_caffeine_plan()` 함수에 Bedrock 통합
3. **프롬프트 최적화** - 더 나은 응답을 위한 프롬프트 엔지니어링
4. **세션 관리** - 사용자별 대화 컨텍스트 유지

## 📚 참고 자료

- [AWS Bedrock Agent 문서](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [Boto3 Bedrock Agent Runtime](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/bedrock-agent-runtime.html)
- [Lambda IAM 권한](https://docs.aws.amazon.com/lambda/latest/dg/lambda-permissions.html)
