# Bio-Coach Agent 설정 가이드

## 현재 상태
✅ Lambda 환경 변수 설정 완료
- `BEDROCK_BIO_AGENT_ID`: 1XOE4OAMLR
- `BEDROCK_BIO_AGENT_ALIAS_ID`: VXOUCFXA2P

✅ AI Services Lambda 코드 업데이트 완료
- `invoke_bedrock_agent()` 함수에 `use_bio_coach` 파라미터 추가
- `generate_sleep_plan()` 및 `generate_caffeine_plan()`에서 Bio-Coach Agent 호출

## 다음 단계: Action Group 파라미터 추가

### 1. AWS Console에서 Bio-Coach Agent 열기
1. AWS Console → Amazon Bedrock → Agents
2. **ShiftSync-Bio-Coach** (ID: 1XOE4OAMLR) 선택

### 2. Action Group 수정
1. **Action Groups** 탭 선택
2. **GetBioPathwayAction** 선택
3. **Edit** 버튼 클릭

### 3. user_id 파라미터 추가
현재 파라미터:
- `target_date` (string, required) - 대상 날짜 (YYYY-MM-DD)

**추가할 파라미터:**
- **Parameter name**: `user_id`
- **Type**: `string`
- **Required**: `True` (체크)
- **Description**: `사용자 ID`

### 4. 저장 및 Prepare
1. **Save** 버튼 클릭
2. Agent 페이지로 돌아가서 **Prepare** 버튼 클릭
3. Prepare 완료 대기 (약 1-2분)

## 테스트 방법

### 1. 통합 테스트 실행
```bash
python backend/scripts/test_bio_coach_integration.py
```

이 스크립트는 다음을 테스트합니다:
- 수면 계획 생성 (Bio-Coach Agent 호출)
- 카페인 계획 생성 (Bio-Coach Agent 호출)

### 2. CloudWatch 로그 확인
```bash
python backend/scripts/check_cloudwatch_logs.py
```

로그에서 확인할 내용:
- ✅ `🚀 Invoking Bio-Coach Agent` - Bio-Coach Agent 호출 시작
- ✅ `✅ Bio-Coach Agent response` - Agent 응답 수신
- ✅ `✅ Sleep plan generated` - 수면 계획 생성 성공
- ✅ `✅ Caffeine plan generated` - 카페인 계획 생성 성공
- ❌ `⚠️ Bedrock Agent failed, using fallback` - Agent 실패, 폴백 사용

### 3. 스케줄 데이터 확인
```bash
python backend/scripts/test_schedule_data.py
```

Bio-Coach Agent가 BioPathway Calculator Lambda를 호출하려면 사용자의 스케줄 데이터가 DB에 있어야 합니다.

## 아키텍처

```
Frontend
  ↓
API Gateway
  ↓
AI Services Lambda (VPC)
  ↓
Bio-Coach Agent (Bedrock)
  ↓
BioPathway Calculator Lambda (VPC)
  ↓
RDS PostgreSQL
```

## 3개의 Bedrock Agent

1. **RAG Chatbot Agent** (ID: 9NPCFXV4WV, Alias: 6FHUTRQ2GT)
   - 용도: 일반 채팅 및 상담
   - 환경 변수: `BEDROCK_AGENT_ID`, `BEDROCK_AGENT_ALIAS_ID`

2. **OCR Agent** (ID: BTSIJ4YCPQ, Alias: VOCYE8YXAS)
   - 용도: 스케줄 이미지 인식
   - 환경 변수: `BEDROCK_OCR_AGENT_ID`, `BEDROCK_OCR_AGENT_ALIAS_ID`

3. **Bio-Coach Agent** (ID: 1XOE4OAMLR, Alias: VXOUCFXA2P) ⭐ NEW
   - 용도: 수면/카페인 추천
   - 환경 변수: `BEDROCK_BIO_AGENT_ID`, `BEDROCK_BIO_AGENT_ALIAS_ID`
   - Action Group: GetBioPathwayAction
     - Function: `get_daily_biorhythm`
     - Parameters: `user_id`, `target_date`

## 트러블슈팅

### 문제: "ValueError: Bio-Coach Agent ID and Alias ID must be set"
**원인**: Lambda 환경 변수가 설정되지 않음
**해결**: 
```bash
python backend/scripts/deploy_ai_services_only.py
```

### 문제: "NoScheduleFoundError"
**원인**: 사용자의 스케줄 데이터가 DB에 없음
**해결**: 
1. 프론트엔드에서 스케줄 등록
2. 또는 테스트 스케줄 추가:
```bash
python backend/scripts/add_test_schedule.py
```

### 문제: Bio-Coach Agent가 BioPathway Calculator를 호출하지 못함
**원인**: Action Group에 `user_id` 파라미터가 없음
**해결**: 위의 "Action Group 파라미터 추가" 섹션 참조

### 문제: "AgentTimeoutError" 또는 "AgentInvocationError"
**원인**: 
- VPC 설정 문제
- Lambda 권한 문제
- Bedrock Agent 설정 문제

**해결**:
1. VPC 설정 확인:
```bash
python backend/scripts/check_lambda_vpc.py
```

2. Lambda 권한 확인:
   - IAM Role에 `bedrock:InvokeAgent` 권한 있는지 확인
   - IAM Role에 `lambda:InvokeFunction` 권한 있는지 확인

3. Bedrock Agent 권한 확인:
   - Agent의 Resource-based policy에 Lambda invoke 권한 추가

## 다음 단계

1. ✅ Lambda 환경 변수 설정 완료
2. ⏳ **AWS Console에서 Action Group에 user_id 파라미터 추가** (현재 단계)
3. ⏳ 통합 테스트 실행
4. ⏳ 프론트엔드에서 실제 테스트
5. ⏳ CloudWatch 로그로 전체 플로우 검증
