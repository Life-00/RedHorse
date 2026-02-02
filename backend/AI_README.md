# 🤖 AI 시스템 가이드

> **ShiftSync 프로젝트의 AI 부분 완벽 가이드**  
> AWS Bedrock Agents와 Lambda를 활용한 교대근무자 맞춤형 AI 서비스

---

## 📋 목차

1. [AI 시스템 개요](#-ai-시스템-개요)
2. [3개의 Bedrock Agent 소개](#-3개의-bedrock-agent-소개)
3. [AI 아키텍처](#-ai-아키텍처)
4. [Lambda 함수 상세](#-lambda-함수-상세)
5. [데이터 흐름](#-데이터-흐름)
6. [환경 설정](#-환경-설정)
7. [배포 가이드](#-배포-가이드)
8. [테스트 방법](#-테스트-방법)
9. [트러블슈팅](#-트러블슈팅)

---

## 🎯 AI 시스템 개요

### 왜 AI가 필요한가?

교대근무자는 일반적인 9-to-5 근무자와 다른 생활 패턴을 가지고 있어요:
- 🌙 **야간 근무**: 낮에 자고 밤에 일해야 함
- 🔄 **불규칙한 스케줄**: 주간/야간/초저녁 근무가 섞여 있음
- 😴 **수면 부족**: 생체 리듬이 깨져서 잠을 제대로 못 잠
- ☕ **카페인 의존**: 졸음을 쫓기 위해 커피를 많이 마심

이런 문제를 해결하기 위해 **개인 맞춤형 AI 건강 코치**가 필요합니다!

### 우리 AI 시스템의 특징

✅ **3개의 전문 AI Agent**
- 각 Agent가 특정 역할에 특화되어 있어요
- Amazon Nova Premier 모델 사용 (AWS 최신 AI)

✅ **안전한 AI**
- Guardrails로 의료 진단 차단
- 개인정보 자동 보호
- 부적절한 콘텐츠 필터링

✅ **실시간 데이터 연동**
- RDS 데이터베이스에서 사용자 스케줄 조회
- S3에서 이미지 불러오기
- Lambda로 복잡한 계산 수행

---

## 🤖 3개의 Bedrock Agent 소개


### 1️⃣ RAG Chatbot Agent (건강 상담 챗봇)

**역할**: 교대근무자의 건강 질문에 전문적으로 답변하는 AI 상담사

**어떻게 작동하나요?**
```
사용자 질문 → RAG Chatbot Agent → Knowledge Base 검색 → 답변 생성
```

**핵심 기술**:
- **RAG (Retrieval-Augmented Generation)**: 
  - "검색 + 생성" 방식
  - Knowledge Base에서 관련 문서를 먼저 찾고
  - 그 정보를 바탕으로 답변을 생성해요
- **Knowledge Base**: KOSHA(한국산업안전보건공단) 가이드라인 문서
- **모델**: Amazon Nova Premier

**예시 대화**:
```
👤 사용자: "야간 근무 후 잠이 안 와요. 어떻게 해야 하나요?"

🤖 Agent: "야간 근무 후 수면 문제는 흔한 일이에요. KOSHA 가이드라인에 따르면:
1. 퇴근 즉시 선글라스를 착용하여 햇빛 노출을 최소화하세요
2. 귀가 후 암막 커튼을 치고 방을 어둡게 만드세요
3. 실온을 18-20도로 유지하고 백색소음을 활용하세요
4. 가족에게 수면 시간을 공유하여 방해를 최소화하세요"
```

**특징**:
- ✅ Lambda 사용 안 함 (Knowledge Base만 사용)
- ✅ Guardrails로 의료 진단 차단
- ✅ 신뢰할 수 있는 출처 기반 답변

---

### 2️⃣ OCR Agent (스케줄 자동 인식)

**역할**: 근무표 사진을 업로드하면 자동으로 일정을 읽어서 등록해주는 AI

**어떻게 작동하나요?**
```
사진 업로드 → S3 저장 → OCR Agent → Lambda 호출 → 
Claude 3.5 Sonnet 비전 → 텍스트 추출 → JSON 변환 → RDS 저장
```

**핵심 기술**:
- **Amazon Nova Premier**: Agent 역할 (사용자 요청 이해)
- **Claude 3.5 Sonnet**: 비전 모델 (이미지 인식)
- **Action Group**: Lambda 함수 호출 기능
- **Lambda**: `ocr_vision` - 실제 OCR 처리

**예시 시나리오**:
```
1. 사용자가 근무표 사진 업로드
   📸 [1조 | 1월 15일: D | 1월 16일: N | 1월 17일: O]

2. OCR Agent가 Lambda 호출
   🤖 "1조의 일정을 분석해줘"

3. Lambda가 Claude 비전으로 이미지 분석
   👁️ "1월 15일은 주간(D), 16일은 야간(N), 17일은 휴무(O)"

4. JSON 형식으로 변환
   📄 [
        {"date": "2026-01-15", "type": "D"},
        {"date": "2026-01-16", "type": "N"},
        {"date": "2026-01-17", "type": "O"}
      ]

5. RDS에 자동 저장
   💾 스케줄 등록 완료!
```

**특징**:
- ✅ Action Group으로 `ocr_vision` Lambda 호출
- ✅ Claude 3.5 Sonnet 비전 기능 활용
- ✅ 자동으로 날짜, 근무 타입 인식

---

### 3️⃣ Bio-Coach Agent (맞춤형 건강 코치)

**역할**: 사용자의 근무 스케줄에 맞춘 수면/카페인 관리 계획을 생성하는 AI 코치

**어떻게 작동하나요?**
```
사용자 요청 → Bio-Coach Agent → Lambda 호출 → 
RDS에서 스케줄 조회 → BIO_RULES 적용 → 
타임라인 형식 가이드 생성
```

**핵심 기술**:
- **Amazon Nova Premier**: Agent 역할 (건강 코치)
- **Action Group**: Lambda 함수 호출 기능
- **Lambda**: `biopathway_calculator` - 생체리듬 계산
- **BIO_RULES**: 근무 타입별 과학적 규칙

**예시 시나리오**:
```
1. 사용자 요청
   👤 "1월 30일 어떻게 관리해야 해?"

2. Bio-Coach Agent가 Lambda 호출
   🤖 "user_id=123, target_date=2026-01-30 조회해줘"

3. Lambda가 RDS에서 스케줄 확인
   💾 "1월 30일은 야간 근무(N)"

4. BIO_RULES 적용
   📋 야간 근무 규칙:
      - 수면 시작: 09:00 (퇴근 후 아침)
      - 카페인 마감: 03:00 (새벽 3시 이후 금지)
      - 팁: "퇴근길 선글라스 착용"

5. Agent가 타임라인 형식으로 답변 생성
   🤖 "📅 2026년 1월 30일 (야간 근무 🌙) 건강 관리 로드맵
   
   ⏰ 오늘의 타임라인
   ☕ 03:00 AM: 카페인 섭취 마감
   💤 09:00 AM: 수면 시작 권장
   
   💡 전문가 팁
   퇴근길 햇빛 노출을 최소화하고 즉시 암막 커튼 아래서 수면하세요.
   
   🎯 실천 가이드
   1. ✅ 퇴근 즉시 선글라스 착용
   2. ✅ 귀가 후 바로 암막 커튼 설치된 방에서 수면
   ..."
```

**특징**:
- ✅ Action Group으로 `biopathway_calculator` Lambda 호출
- ✅ 근무 타입별 맞춤형 가이드 (D/E/N/O)
- ✅ 타임라인 형식의 실천 가능한 조언

---


## 🏗️ AI 아키텍처

### 전체 구조도

```
┌─────────────────────────────────────────────────────────────────┐
│                      사용자 (Frontend)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (REST API)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ai_services Lambda (VPC)                        │
│                                                                  │
│  • chat_with_ai()         → RAG Chatbot Agent 호출              │
│  • generate_sleep_plan()  → Bio-Coach Agent 호출                │
│  • generate_caffeine_plan() → Bio-Coach Agent 호출              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│   Bedrock Agents          │   │   RDS PostgreSQL              │
│   (Amazon Nova Premier)   │   │                               │
│                           │   │  • users                      │
│  1. RAG Chatbot Agent     │   │  • schedules                  │
│     └─ Knowledge Base     │   │  • sleep_plans                │
│        (KOSHA 문서)       │   │  • caffeine_plans             │
│                           │   │  • chat_history               │
│  2. OCR Agent             │   └───────────────────────────────┘
│     └─ Action Group       │
│        └─ ocr_vision      │   ┌───────────────────────────────┐
│           Lambda          │   │   S3 Bucket                   │
│                           │   │                               │
│  3. Bio-Coach Agent       │   │  • 스케줄 이미지               │
│     └─ Action Group       │   │  • 이완 오디오                 │
│        └─ biopathway      │   └───────────────────────────────┘
│           _calculator     │
│           Lambda          │
│                           │
│  Guardrails 적용:         │
│  • 의료 진단 차단          │
│  • 개인정보 보호           │
│  • 콘텐츠 필터링           │
└───────────────────────────┘
```

### Agent vs Lambda 역할 분담

**🤖 Bedrock Agent의 역할**:
- 사용자의 자연어 이해 ("1월 30일 어떻게 해야 해?")
- 의사결정 (어떤 Lambda를 호출할지 판단)
- 자연어 생성 (사용자가 이해하기 쉬운 답변 작성)
- 대화 컨텍스트 관리 (이전 대화 기억)

**⚡ Lambda의 역할**:
- 데이터베이스 조회 (RDS에서 스케줄 가져오기)
- 복잡한 계산 (BIO_RULES 적용, 시간 계산)
- 외부 서비스 호출 (Claude 비전 API)
- 구조화된 데이터 반환 (JSON 형식)

**왜 이렇게 나눴나요?**
- Agent는 "대화"를 잘하고
- Lambda는 "계산"을 잘해요
- 각자 잘하는 일을 맡겨서 효율적으로 작동해요!

---

## 🔧 Lambda 함수 상세

### 1. ai_services Lambda

**위치**: `backend/lambda/ai_services/handler.py`

**역할**: 3개의 Bedrock Agent를 호출하는 중앙 허브

**주요 함수**:

#### 1) `chat_with_ai(user_id, message)`
```python
# RAG Chatbot Agent 호출
def chat_with_ai(user_id: str, message: str):
    """
    사용자의 건강 질문에 답변
    
    흐름:
    1. Bedrock Agent Runtime 클라이언트 생성
    2. RAG Chatbot Agent 호출 (BEDROCK_AGENT_ID)
    3. 스트림 응답 처리
    4. 채팅 기록 DB 저장
    """
```

**예시**:
```python
# 입력
user_id = "user123"
message = "야간 근무 후 잠이 안 와요"

# 출력
{
    "id": 1,
    "user_id": "user123",
    "message": "야간 근무 후 잠이 안 와요",
    "response": "야간 근무 후 수면 문제는...",
    "created_at": "2026-01-30T10:00:00"
}
```

#### 2) `generate_sleep_plan(user_id, plan_date)`
```python
# Bio-Coach Agent 호출 (수면 계획)
def generate_sleep_plan(user_id: str, plan_date: str):
    """
    맞춤형 수면 계획 생성
    
    흐름:
    1. Bio-Coach Agent 호출 (BEDROCK_BIO_AGENT_ID)
    2. Agent가 biopathway_calculator Lambda 호출
    3. 수면 시간, 낮잠 시간 계산
    4. sleep_plans 테이블에 저장
    """
```

**예시**:
```python
# 입력
user_id = "user123"
plan_date = "2026-01-30"

# 출력
{
    "id": 1,
    "user_id": "user123",
    "plan_date": "2026-01-30",
    "main_sleep_start": "09:00",
    "main_sleep_end": "17:00",
    "main_sleep_duration": 8.0,
    "nap_start": "20:00",
    "nap_end": "20:30",
    "nap_duration": 0.5,
    "rationale": "퇴근길 햇빛 노출을 최소화하고..."
}
```

#### 3) `generate_caffeine_plan(user_id, plan_date)`
```python
# Bio-Coach Agent 호출 (카페인 계획)
def generate_caffeine_plan(user_id: str, plan_date: str):
    """
    맞춤형 카페인 계획 생성
    
    흐름:
    1. Bio-Coach Agent 호출
    2. Agent가 biopathway_calculator Lambda 호출
    3. 카페인 마감 시간 계산
    4. caffeine_plans 테이블에 저장
    """
```

**환경 변수**:
```env
# RAG Chatbot Agent
BEDROCK_AGENT_ID=9NPCFXV4WV
BEDROCK_AGENT_ALIAS_ID=6FHUTRQ2GT

# OCR Agent
BEDROCK_OCR_AGENT_ID=BTSIJ4YCPQ
BEDROCK_OCR_AGENT_ALIAS_ID=VOCYE8YXAS

# Bio-Coach Agent
BEDROCK_BIO_AGENT_ID=1XOE4OAMLR
BEDROCK_BIO_AGENT_ALIAS_ID=VXOUCFXA2P

BEDROCK_REGION=us-east-1
```

---

### 2. biopathway_calculator Lambda

**위치**: `backend/lambda/biopathway_calculator/lambda_function.py`

**역할**: Bio-Coach Agent의 Action Group으로 생체리듬 계산

**핵심 로직**: BIO_RULES

```python
BIO_RULES = {
    "D": {  # 주간 근무 (Day)
        "sleep": "23:00",
        "coffee": "14:00",
        "tip": "밤 11시 이전 취침하여 규칙적인 생체 리듬을 유지하세요."
    },
    "N": {  # 야간 근무 (Night)
        "sleep": "09:00",
        "coffee": "03:00",
        "tip": "퇴근길 햇빛 노출을 최소화하고 즉시 암막 커튼 아래서 수면하세요."
    },
    "E": {  # 초저녁 근무 (Evening)
        "sleep": "02:00",
        "coffee": "18:00",
        "tip": "퇴근 후 가벼운 식사를 하고 미온수로 샤워하여 숙면을 유도하세요."
    },
    "O": {  # 휴무 (Off)
        "sleep": "23:00",
        "coffee": "15:00",
        "tip": "부족한 잠을 보충하되 오후 3시 이후의 긴 낮잠은 피하세요."
    }
}
```

**작동 방식**:
```python
def lambda_handler(event, context):
    # 1. Bedrock Agent에서 파라미터 추출
    user_id = event['parameters'][0]['value']
    target_date = event['parameters'][1]['value']
    
    # 2. RDS에서 사용자 스케줄 조회
    schedule = get_user_schedule(user_id, target_date)
    # 결과: {"shift_type": "night", "start_time": "22:00", "end_time": "06:00"}
    
    # 3. BIO_RULES 적용
    bio_result = apply_bio_rules(schedule['shift_type'])
    # 결과: {"sleep": "09:00", "coffee": "03:00", "tip": "...", "shift_type": "N"}
    
    # 4. Bedrock Agent 형식으로 반환
    return {
        "messageVersion": "1.0",
        "response": {
            "functionResponse": {
                "responseBody": {
                    "TEXT": {
                        "body": json.dumps(bio_result)
                    }
                }
            }
        }
    }
```

**왜 Lambda를 사용하나요?**
- RDS 접근 권한 필요 (VPC 내부)
- 복잡한 데이터베이스 쿼리
- BIO_RULES 같은 비즈니스 로직 적용

---

### 3. ocr_vision Lambda

**위치**: `backend/lambda/ocr_vision/handler.py`

**역할**: OCR Agent의 Action Group으로 이미지 인식

**작동 방식**:
```python
def lambda_handler(event, context):
    # 1. Bedrock Agent에서 파라미터 추출
    s3_key = event['parameters'][0]['value']  # "schedules/user123/schedule.png"
    user_group = event['parameters'][1]['value']  # "1조"
    
    # 2. S3에서 이미지 다운로드
    image_data = s3_client.get_object(
        Bucket='redhorse-s3-ai-0126',
        Key=s3_key
    )['Body'].read()
    
    # 3. Claude 3.5 Sonnet 비전 호출
    response = bedrock_client.invoke_model(
        modelId="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        body=json.dumps({
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "data": encoded_image}},
                    {"type": "text", "text": f"'{user_group}'의 근무 데이터를 분석해줘."}
                ]
            }]
        })
    )
    
    # 4. JSON 파싱
    schedules = json.loads(result_text)
    # 결과: [
    #   {"date": "2026-01-15", "type": "D"},
    #   {"date": "2026-01-16", "type": "N"}
    # ]
    
    # 5. Bedrock Agent 형식으로 반환
    return {
        "messageVersion": "1.0",
        "response": {
            "functionResponse": {
                "responseBody": {
                    "TEXT": {
                        "body": json.dumps(schedules)
                    }
                }
            }
        }
    }
```

**왜 Lambda를 사용하나요?**
- S3 접근 권한 필요
- Claude 비전 API 호출
- 이미지 전처리 (base64 인코딩)
- JSON 파싱 및 검증

---


## 🔄 데이터 흐름

### 시나리오 1: AI 챗봇 상담

```
1. 사용자가 질문 입력
   👤 "야간 근무 후 잠이 안 와요"
   
2. Frontend → API Gateway → ai_services Lambda
   📡 POST /users/user123/chat
   
3. ai_services Lambda가 RAG Chatbot Agent 호출
   ⚡ invoke_bedrock_agent(
        agent_id="9NPCFXV4WV",
        message="야간 근무 후 잠이 안 와요"
      )
   
4. RAG Chatbot Agent가 Knowledge Base 검색
   🔍 KOSHA 가이드라인에서 "야간 근무", "수면" 관련 문서 검색
   
5. Agent가 답변 생성
   🤖 "야간 근무 후 수면 문제는 흔한 일이에요. 
       KOSHA 가이드라인에 따르면..."
   
6. ai_services Lambda가 DB에 저장
   💾 INSERT INTO chat_history (user_id, message, response)
   
7. Frontend에 응답 반환
   📱 사용자에게 답변 표시
```

---

### 시나리오 2: 스케줄 OCR 자동 등록

```
1. 사용자가 근무표 사진 업로드
   👤 📸 [근무표 이미지]
   
2. Frontend → S3 업로드
   📤 s3://bucket/schedules/user123/schedule_20260130.png
   
3. Frontend → API Gateway → schedule_management Lambda
   📡 POST /users/user123/schedules/ocr
   
4. schedule_management Lambda가 OCR Agent 호출
   ⚡ invoke_bedrock_agent(
        agent_id="BTSIJ4YCPQ",
        s3_key="schedules/user123/schedule_20260130.png",
        user_group="1조"
      )
   
5. OCR Agent가 ocr_vision Lambda 호출 (Action Group)
   🔗 Action Group: "analyze_schedule_image"
   
6. ocr_vision Lambda 작동
   a. S3에서 이미지 다운로드
      📥 s3_client.get_object()
   
   b. Claude 3.5 Sonnet 비전 호출
      👁️ bedrock_client.invoke_model(
           modelId="claude-3-5-sonnet",
           image=encoded_image
         )
   
   c. 텍스트 추출 및 JSON 변환
      📄 [
           {"date": "2026-01-15", "type": "D"},
           {"date": "2026-01-16", "type": "N"},
           {"date": "2026-01-17", "type": "O"}
         ]
   
7. OCR Agent가 결과 반환
   🤖 "1조의 1월 15일부터 17일까지 일정을 추출했어요"
   
8. schedule_management Lambda가 RDS에 저장
   💾 INSERT INTO schedules (user_id, work_date, shift_type)
   
9. Frontend에 성공 메시지 반환
   📱 "3건의 일정이 등록되었습니다"
```

---

### 시나리오 3: 맞춤형 수면 계획 생성

```
1. 사용자가 수면 계획 요청
   👤 "1월 30일 수면 계획 알려줘"
   
2. Frontend → API Gateway → ai_services Lambda
   📡 POST /users/user123/sleep-plans
       body: {"plan_date": "2026-01-30"}
   
3. ai_services Lambda가 Bio-Coach Agent 호출
   ⚡ invoke_bedrock_agent(
        agent_id="1XOE4OAMLR",
        prompt="사용자 user123의 2026-01-30 수면 계획을 생성해주세요"
      )
   
4. Bio-Coach Agent가 biopathway_calculator Lambda 호출 (Action Group)
   🔗 Action Group: "get_daily_biorhythm"
       Parameters: user_id="user123", target_date="2026-01-30"
   
5. biopathway_calculator Lambda 작동
   a. RDS에서 스케줄 조회
      💾 SELECT shift_type FROM schedules 
          WHERE user_id='user123' AND work_date='2026-01-30'
      결과: shift_type = "night"
   
   b. BIO_RULES 적용
      📋 BIO_RULES["N"] = {
           "sleep": "09:00",
           "coffee": "03:00",
           "tip": "퇴근길 햇빛 노출을 최소화하고..."
         }
   
   c. 결과 반환
      📤 {
           "date": "2026-01-30",
           "shift": "N",
           "sleep": "09:00",
           "coffee": "03:00",
           "tip": "퇴근길 햇빛 노출을 최소화하고..."
         }
   
6. Bio-Coach Agent가 타임라인 형식으로 답변 생성
   🤖 "📅 2026년 1월 30일 (야간 근무 🌙) 건강 관리 로드맵
       
       ⏰ 오늘의 타임라인
       ☕ 03:00 AM: 카페인 섭취 마감
       💤 09:00 AM: 수면 시작 권장
       
       💡 전문가 팁
       퇴근길 햇빛 노출을 최소화하고 즉시 암막 커튼 아래서 수면하세요.
       
       🎯 실천 가이드
       1. ✅ 퇴근 즉시 선글라스 착용
       2. ✅ 귀가 후 바로 암막 커튼 설치된 방에서 수면
       ..."
   
7. ai_services Lambda가 파싱 및 DB 저장
   💾 INSERT INTO sleep_plans (
        user_id, plan_date, main_sleep_start, main_sleep_end, rationale
      )
   
8. Frontend에 응답 반환
   📱 타임라인 형식의 수면 계획 표시
```

---

## ⚙️ 환경 설정

### 1. 환경 변수 설정

`backend/.env` 파일 생성:

```env
# Database
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=rhythm_fairy
DB_USER=postgres
DB_PASSWORD=your-secure-password

# AWS
AWS_REGION=us-east-1
S3_BUCKET_NAME=redhorse-s3-ai-0126

# Bedrock Agents
# RAG Chatbot Agent
BEDROCK_AGENT_ID=9NPCFXV4WV
BEDROCK_AGENT_ALIAS_ID=6FHUTRQ2GT

# OCR Agent
BEDROCK_OCR_AGENT_ID=BTSIJ4YCPQ
BEDROCK_OCR_AGENT_ALIAS_ID=VOCYE8YXAS

# Bio-Coach Agent
BEDROCK_BIO_AGENT_ID=1XOE4OAMLR
BEDROCK_BIO_AGENT_ALIAS_ID=VXOUCFXA2P

BEDROCK_REGION=us-east-1
```

### 2. AWS 권한 설정

Lambda 실행 역할에 필요한 권한:

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
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::redhorse-s3-ai-0126/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": [
        "arn:aws:lambda:us-east-1:*:function:biopathway_calculator",
        "arn:aws:lambda:us-east-1:*:function:ocr_vision"
      ]
    }
  ]
}
```

### 3. Bedrock Agent 설정

#### RAG Chatbot Agent 설정
```
1. AWS Console → Bedrock → Agents
2. Agent 생성
   - Name: ShiftSync-RAG-Chatbot
   - Model: Amazon Nova Premier
3. Knowledge Base 연결
   - KOSHA 가이드라인 문서 업로드
4. Guardrails 적용
   - 의료 진단 차단
   - 개인정보 보호
   - 콘텐츠 필터링
5. Alias 생성 및 ID 복사
```

#### OCR Agent 설정
```
1. Agent 생성
   - Name: ShiftSync-OCR
   - Model: Amazon Nova Premier
2. Action Group 추가
   - Name: AnalyzeScheduleImage
   - Lambda: ocr_vision
   - Parameters:
     * s3_key (string, required)
     * user_group (string, required)
3. Alias 생성 및 ID 복사
```

#### Bio-Coach Agent 설정
```
1. Agent 생성
   - Name: ShiftSync-Bio-Coach
   - Model: Amazon Nova Premier
2. Instructions 설정 (backend/BIO_COACH_SETUP.md 참조)
3. Action Group 추가
   - Name: GetBioPathwayAction
   - Lambda: biopathway_calculator
   - Parameters:
     * user_id (string, required)
     * target_date (string, required)
4. Alias 생성 및 ID 복사
```

---

## 🚀 배포 가이드

### 1. Lambda 함수 배포

#### ai_services Lambda 배포
```bash
cd backend/scripts
python deploy_lambda.py
```

이 스크립트는 자동으로:
- ✅ Lambda 함수 생성/업데이트
- ✅ 환경 변수 설정
- ✅ VPC 설정
- ✅ IAM 역할 권한 추가

#### biopathway_calculator Lambda 배포
```bash
python deploy_biopathway.py
```

#### ocr_vision Lambda 배포
```bash
python deploy_ocr_lambda.py
```

### 2. 환경 변수 복원 (중요!)

Lambda 배포 후 환경 변수가 초기화될 수 있어요:

```bash
python deploy_ai_services_only.py
```

이 스크립트는:
- ✅ `.env` 파일에서 환경 변수 읽기
- ✅ Lambda 함수에 환경 변수 설정
- ✅ Bedrock Agent ID 복원

### 3. 배포 확인

```bash
# CloudWatch 로그 확인
python check_cloudwatch_logs.py

# 데이터베이스 연결 테스트
python test_connection.py

# Bedrock Agent 테스트
python test_bedrock_agent.py
```

---

## 🧪 테스트 방법

### 1. RAG Chatbot Agent 테스트

```bash
cd backend/scripts
python test_bedrock_agent.py
```

**테스트 시나리오**:
```python
# 테스트 메시지
message = "야간 근무 후 수면 관리 팁을 알려주세요"

# 예상 응답
# - KOSHA 가이드라인 기반 답변
# - 구체적인 실천 방법 포함
# - 의료 진단 없음
```

### 2. Bio-Coach Agent 테스트

```bash
python test_bio_coach_integration.py
```

**테스트 시나리오**:
```python
# 1. 수면 계획 생성 테스트
user_id = "test-user-123"
plan_date = "2026-01-30"

# 2. 카페인 계획 생성 테스트
# 3. 타임라인 형식 검증
# 4. DB 저장 확인
```

### 3. OCR Agent 테스트

```python
# 1. 테스트 이미지 S3 업로드
s3_key = "schedules/test/schedule.png"

# 2. OCR Agent 호출
response = invoke_ocr_agent(s3_key, "1조")

# 3. JSON 형식 검증
assert isinstance(response, list)
assert "date" in response[0]
assert "type" in response[0]
```

### 4. 통합 테스트

```bash
# 전체 플로우 테스트
python test_full_workflow.py
```

**테스트 플로우**:
```
1. 사용자 생성
2. 스케줄 OCR 등록
3. 수면 계획 생성
4. 카페인 계획 생성
5. AI 챗봇 상담
6. 결과 검증
```

---

## 🔧 트러블슈팅

### 문제 1: "AccessDeniedException: User is not authorized to perform: bedrock:InvokeAgent"

**원인**: Lambda 실행 역할에 Bedrock 권한이 없음

**해결 방법**:
```bash
1. AWS Console → IAM → Roles
2. shift-worker-wellness-lambda-role 선택
3. "Add permissions" → "Create inline policy"
4. backend/infrastructure/bedrock_agent_policy.json 내용 붙여넣기
5. 저장
```

---

### 문제 2: "ValueError: Bio-Coach Agent ID and Alias ID must be set"

**원인**: Lambda 환경 변수가 설정되지 않음

**해결 방법**:
```bash
# 환경 변수 복원
python backend/scripts/deploy_ai_services_only.py

# 확인
aws lambda get-function-configuration \
  --function-name shift-worker-wellness-ai_services \
  --query 'Environment.Variables'
```

---

### 문제 3: "NoScheduleFoundError"

**원인**: 사용자의 스케줄 데이터가 DB에 없음

**해결 방법**:
```bash
# 1. 데이터베이스 확인
python backend/scripts/check_database.py

# 2. 테스트 스케줄 추가
python backend/scripts/add_test_schedule.py

# 3. 또는 프론트엔드에서 스케줄 등록
```

---

### 문제 4: OCR Agent가 이미지를 인식하지 못함

**원인**: 
- S3 파일이 없음
- 이미지 형식 문제
- Claude 비전 API 오류

**해결 방법**:
```bash
# 1. S3 파일 확인
aws s3 ls s3://redhorse-s3-ai-0126/schedules/

# 2. CloudWatch 로그 확인
python backend/scripts/check_cloudwatch_logs.py

# 3. 이미지 형식 확인 (PNG, JPG만 지원)
```

---

### 문제 5: Agent 응답이 느림

**원인**: 
- VPC 엔드포인트 설정 문제
- Lambda 콜드 스타트
- Bedrock Agent 처리 시간

**해결 방법**:
```bash
# 1. Lambda 타임아웃 증가
aws lambda update-function-configuration \
  --function-name shift-worker-wellness-ai_services \
  --timeout 90

# 2. VPC 엔드포인트 확인
# AWS Console → VPC → Endpoints
# Bedrock, S3, RDS 엔드포인트 확인

# 3. Lambda 메모리 증가 (더 빠른 처리)
aws lambda update-function-configuration \
  --function-name shift-worker-wellness-ai_services \
  --memory-size 512
```

---

## 📚 추가 자료

### AWS 공식 문서
- [AWS Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [Amazon Nova Models](https://aws.amazon.com/bedrock/nova/)

---

## 🙋 FAQ

**Q1: Agent와 Lambda의 차이가 뭔가요?**
- Agent는 "대화하는 AI" (자연어 이해, 답변 생성)
- Lambda는 "계산하는 프로그램" (데이터 조회, 복잡한 로직)

**Q2: 왜 3개의 Agent를 만들었나요?**
- 각 Agent가 특정 역할에 특화되어 더 정확한 답변 제공
- 유지보수가 쉬움 (한 Agent만 수정 가능)
- 성능 최적화 (필요한 Agent만 호출)

**Q3: Knowledge Base는 어떻게 작동하나요?**
- 문서를 작은 조각(chunk)으로 나눔
- 벡터 임베딩으로 변환
- 사용자 질문과 유사한 조각 검색
- 검색된 조각을 바탕으로 답변 생성

**Q4: Guardrails는 왜 필요한가요?**
- 의료 앱이므로 안전성이 최우선
- AI가 잘못된 의료 조언을 하면 위험
- 개인정보 보호 필수

**Q5: BIO_RULES는 어떻게 만들었나요?**
- KOSHA 가이드라인 기반
- 수면의학 연구 참고
- 교대근무자 실제 데이터 분석

---

## 👥 기여자

이 AI 시스템은 **AWS Healthcare AI Jumpstart Prompthon 2026** 프로젝트의 일부입니다.

**AI 담당**: 김지훈
- Bedrock Agents 설계 및 구현
- Lambda 함수 개발
- BIO_RULES 알고리즘 설계

---

## 📞 문의

AI 시스템에 대한 질문이나 제안사항이 있으시면 Issue를 생성해주세요.

---

<div align="center">

**Made with 🤖 by AWS Bedrock Agents**

[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/bedrock/)
[![Amazon Nova](https://img.shields.io/badge/Amazon-Nova_Premier-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/bedrock/nova/)

</div>
