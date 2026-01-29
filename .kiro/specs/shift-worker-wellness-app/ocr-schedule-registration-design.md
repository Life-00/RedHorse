# OCR 근무표 이미지 자동 등록 기능 설계 문서

## 1. 설계 개요

### 1.1 설계 목표
사용자가 근무표 이미지를 업로드하면 AWS Bedrock Claude 3.5 Sonnet을 활용하여 자동으로 근무 스케줄을 인식하고 데이터베이스에 저장하는 시스템 설계

### 1.2 설계 원칙
- **단순성**: 직접 Lambda 호출 방식으로 복잡도 최소화
- **신뢰성**: 파일 검증 및 재시도 로직으로 안정성 확보
- **확장성**: Lambda 자동 스케일링으로 동시 사용자 처리
- **보안성**: VPC 내부 통신 및 IAM 권한 최소화
- **관찰성**: 상세한 로깅으로 디버깅 용이성 확보

### 1.3 아키텍처 선택: 방법 A (직접 Lambda 호출)

**선택한 방법**: schedule_management Lambda → OCR Lambda 직접 호출

**선택 이유**:
- Bedrock Agent를 거치지 않아 파일명 불일치 문제 해결
- 호출 경로가 단순하여 디버깅 용이
- 응답 시간 단축 (중간 단계 제거)
- 구현 및 유지보수 복잡도 감소

**대안 (방법 B)**: Bedrock Agent를 통한 OCR 호출
- 장점: Agent 기반 워크플로우 활용 가능
- 단점: 파일명 불일치, 복잡한 디버깅, 응답 시간 증가
- 결론: 현재 요구사항에 부적합

## 2. 시스템 아키텍처

### 2.1 전체 플로우
```
[프론트엔드 React]
    ↓ POST /api/schedule/upload-image
    ↓ (base64 이미지 + filename)
[API Gateway]
    ↓
[schedule_management Lambda]
    ├─→ S3 업로드 (schedules/{user_id}/{timestamp}_{filename})
    ├─→ S3 파일 검증 (0.5초 대기 + head_object)
    ├─→ 1초 추가 대기 (S3 일관성 보장)
    └─→ boto3.client('lambda').invoke()
         ↓
    [OCR Lambda: ShiftSync-Vision-OCR]
         ├─→ S3에서 이미지 다운로드
         ├─→ Bedrock Claude 3.5 Sonnet 호출
         ├─→ OCR 결과 파싱
         └─→ JSON 응답 반환
    ↓
[schedule_management Lambda]
    ├─→ OCR 결과 검증
    ├─→ 데이터 변환 (D→day, E→evening, N→night, O→off)
    ├─→ RDS PostgreSQL 저장 (UPSERT)
    └─→ 성공 응답 반환
    ↓
[프론트엔드 React]
    └─→ 등록 결과 표시 및 달력 화면 이동
```

### 2.2 컴포넌트 다이어그램

```
┌─────────────────────┐
│  프론트엔드 React   │
│  (이미지 업로드)    │
└──────────┬──────────┘
           │ multipart/form-data
           ↓
┌─────────────────────┐
│   API Gateway       │
│  (HTTP 라우팅)      │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────────────┐
│  schedule_management Lambda         │
│  - S3 업로드                        │
│  - 파일 검증 (head_object)          │
│  - OCR Lambda 직접 호출             │
│  - 결과 파싱 및 DB 저장             │
└──────────┬──────────────────────────┘
           │
           ├─→ S3 (redhorse-s3-ai-0126)
           │   └─ schedules/{user_id}/{uuid}.jpg
           │
           ├─→ boto3.client('lambda').invoke()
           │   ↓
           │   ┌──────────────────────────┐
           │   │  OCR Lambda              │
           │   │  (ShiftSync-Vision-OCR)  │
           │   │  - S3 이미지 다운로드    │
           │   │  - Bedrock 호출          │
           │   │  - JSON 파싱             │
           │   └──────────┬───────────────┘
           │              │
           │              ↓
           │   ┌──────────────────────────┐
           │   │  AWS Bedrock             │
           │   │  Claude 3.5 Sonnet       │
           │   │  (비전 OCR)              │
           │   └──────────────────────────┘
           │
           └─→ RDS PostgreSQL
               └─ schedules 테이블
```

## 3. 상세 설계

### 3.1 프론트엔드 설계

#### 3.1.1 이미지 업로드 컴포넌트

**위치**: `src/components/schedule/ScheduleRegisterModal.tsx`

**주요 기능**:
- 파일 선택 (input type="file")
- 이미지 미리보기
- multipart/form-data 업로드
- 업로드 진행 상태 표시
- 성공/실패 피드백

**API 호출**:
```typescript
const uploadScheduleImage = async (file: File, userId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_group', '1조'); // 사용자 그룹 정보
  
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/schedule-images`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    }
  );
  
  return response.json();
};
```

#### 3.1.2 스케줄 표시 컴포넌트
**위치**: `src/pages/schedule/SchedulePage.tsx`

**주요 기능**:
- 월간/주간 달력 뷰
- OCR 등록된 스케줄 표시
- 근무 유형별 색상 구분
- 실시간 업데이트

### 3.2 백엔드 설계

#### 3.2.1 schedule_management Lambda

**파일**: `backend/lambda/schedule_management/handler.py`

**주요 클래스**:

1. **DatabaseManager**
   - RDS PostgreSQL 연결 관리
   - 쿼리 실행 (SELECT, INSERT, UPDATE, DELETE)
   - 트랜잭션 처리

2. **S3Manager**
   - S3 클라이언트 초기화
   - 이미지 업로드 (`upload_schedule_image`)
   - 파일 검증 (`head_object`)
   - 환경 변수에서 버킷 이름 로드

3. **ScheduleService**
   - 비즈니스 로직 처리
   - OCR Lambda 호출
   - 데이터 변환 및 저장

**핵심 메서드**: `upload_schedule_image`


```python
def upload_schedule_image(self, user_id: str, file_content: bytes, 
                         filename: str, user_group: str = "1조") -> Dict[str, Any]:
    """스케줄 이미지 업로드 및 OCR Lambda 직접 호출"""
    
    # 1. S3에 이미지 업로드
    s3_key = self.s3.upload_schedule_image(file_content, filename, user_id)
    # 경로: schedules/{user_id}/{uuid}.{ext}
    
    # 2. 데이터베이스에 메타데이터 저장
    query = """
    INSERT INTO schedule_images 
    (user_id, original_filename, s3_key, file_size, upload_status)
    VALUES (%s, %s, %s, %s, %s)
    RETURNING id, user_id, original_filename, s3_key, created_at
    """
    result = self.db.execute_insert_returning(query, params)
    
    # 3. S3 eventual consistency 대기 (1.5초)
    time.sleep(0.5)  # head_object 전 대기
    self.s3_client.head_object(Bucket=bucket, Key=s3_key)  # 파일 검증
    time.sleep(1)    # OCR Lambda 호출 전 추가 대기
    
    # 4. OCR Lambda 직접 호출
    lambda_client = boto3.client('lambda', region_name='us-east-1')
    ocr_lambda_name = os.environ.get('OCR_LAMBDA_NAME', 'ShiftSync-Vision-OCR')
    
    payload = {
        's3_key': s3_key,
        'user_group': user_group
    }
    
    response = lambda_client.invoke(
        FunctionName=ocr_lambda_name,
        InvocationType='RequestResponse',  # 동기 호출
        Payload=json.dumps(payload)
    )
    
    # 5. OCR 결과 파싱
    response_payload = json.loads(response['Payload'].read())
    body = json.loads(response_payload['body'])
    schedules = body.get('schedules', [])
    
    # 6. 타입 매핑 (D/E/N/O → day/evening/night/off)
    type_mapping = {'D': 'day', 'E': 'evening', 'N': 'night', 'O': 'off'}
    time_defaults = {
        'day': {'start': '08:00', 'end': '17:00'},
        'evening': {'start': '14:00', 'end': '23:00'},
        'night': {'start': '22:00', 'end': '07:00'},
        'off': {'start': None, 'end': None}
    }
    
    converted_schedules = []
    for item in schedules:
        shift_type = type_mapping.get(item.get('type', 'O'), 'off')
        times = time_defaults[shift_type]
        converted_schedules.append({
            'date': item.get('date'),
            'shift_type': shift_type,
            'start_time': times['start'],
            'end_time': times['end']
        })
    
    # 7. OCR 결과 DB 업데이트
    update_query = """
    UPDATE schedule_images 
    SET ocr_result = %s, upload_status = %s, processed_at = CURRENT_TIMESTAMP
    WHERE id = %s
    """
    self.db.execute_update(update_query, 
                          (json.dumps(ocr_result), 'processed', result['id']))
    
    return result
```

**로깅 전략**:
- 🔄 진행 중 작업
- ✅ 성공한 작업
- ❌ 실패한 작업
- 🪣 S3 관련 작업
- 🤖 Lambda/AI 호출
- 📥 데이터 수신
- 📤 데이터 전송

#### 3.2.2 OCR Lambda (ShiftSync-Vision-OCR)

**파일**: `backend/lambda/ocr_vision/lambda_function.py`

**주요 기능**:


1. **직접 호출 및 Bedrock Agent 호출 모두 지원**
   - `is_direct_invoke = 'actionGroup' not in event`로 구분
   - 직접 호출: 간단한 JSON 응답
   - Agent 호출: Bedrock Agent 응답 형식

2. **S3 이미지 다운로드**
   ```python
   bucket = os.environ.get('S3_BUCKET_NAME', 'redhorse-s3-ai-0126')
   
   # 파일 존재 확인
   head_response = s3_client.head_object(Bucket=bucket, Key=s3_key)
   
   # 이미지 다운로드
   image_obj = s3_client.get_object(Bucket=bucket, Key=s3_key)
   image_data = image_obj['Body'].read()
   encoded_image = base64.b64encode(image_data).decode('utf-8')
   ```

3. **Bedrock Claude 3.5 Sonnet 호출**
   ```python
   system_prompt = (
       f"너는 전문 스케줄 분석가야. 이미지에서 '{user_group}' 행 또는 열을 찾아 일정을 추출해. "
       "근무 타입은 D(Day), E(Evening), N(Night), O(Off)로 매핑하고, "
       "반드시 [{\"date\": \"YYYY-MM-DD\", \"type\": \"D|E|N|O\"}] 형식의 JSON 배열로만 응답해. "
       "설명은 일절 배제해."
   )
   
   body = {
       "anthropic_version": "bedrock-2023-05-31",
       "max_tokens": 1000,
       "system": system_prompt,
       "messages": [{
           "role": "user",
           "content": [
               {"type": "image", "source": {"type": "base64", "data": encoded_image}},
               {"type": "text", "text": f"'{user_group}'의 근무 데이터를 분석해줘."}
           ]
       }]
   }
   
   response = bedrock_client.invoke_model(
       modelId="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
       body=json.dumps(body)
   )
   ```

4. **응답 파싱 및 반환**
   ```python
   result_text = json.loads(response.get('body').read())['content'][0]['text']
   schedules = json.loads(result_text.replace('```json', '').replace('```', '').strip())
   
   # 직접 호출 응답
   return {
       'statusCode': 200,
       'body': json.dumps({
           'schedules': schedules,
           'user_group': user_group,
           's3_key': s3_key
       })
   }
   ```

### 3.3 데이터베이스 설계

#### 3.3.1 schedules 테이블
```sql
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    work_date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL,  -- 'day', 'evening', 'night', 'off'
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, work_date)  -- 사용자별 날짜 중복 방지
);

CREATE INDEX idx_schedules_user_date ON schedules(user_id, work_date);
```

#### 3.3.2 schedule_images 테이블

```sql
CREATE TABLE schedule_images (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    s3_key VARCHAR(500) NOT NULL UNIQUE,
    file_size INTEGER NOT NULL,
    upload_status VARCHAR(50) DEFAULT 'uploaded',  -- 'uploaded', 'processing', 'processed', 'failed'
    ocr_result JSONB,  -- OCR 결과 저장
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_schedule_images_user ON schedule_images(user_id);
CREATE INDEX idx_schedule_images_status ON schedule_images(upload_status);
```

**ocr_result JSONB 구조**:
```json
{
  "schedules": [
    {"date": "2024-01-01", "shift_type": "off", "start_time": null, "end_time": null},
    {"date": "2024-01-02", "shift_type": "day", "start_time": "08:00", "end_time": "17:00"}
  ],
  "user_group": "1조",
  "s3_key": "schedules/user123/uuid.jpg"
}
```

### 3.4 AWS 인프라 설계

#### 3.4.1 VPC 구성
```
VPC: vpc-046e339ed44006b37
├─ Private Subnet 1 (us-east-1a)
├─ Private Subnet 2 (us-east-1b)
└─ Security Group: sg-037154693a0796d47
   ├─ Inbound: PostgreSQL (5432) from Lambda
   └─ Outbound: All traffic
```

#### 3.4.2 Lambda 함수 구성

**schedule_management Lambda**:
- Runtime: Python 3.11
- Memory: 512 MB
- Timeout: 30초
- VPC: vpc-046e339ed44006b37
- Security Group: sg-037154693a0796d47
- 환경 변수:
  - `DB_HOST`: RDS 엔드포인트
  - `DB_NAME`: rhythm_fairy
  - `DB_USER`: postgres
  - `DB_PASSWORD`: [암호화됨]
  - `S3_BUCKET_NAME`: redhorse-s3-ai-0126
  - `OCR_LAMBDA_NAME`: ShiftSync-Vision-OCR
- IAM 권한:
  - AWSLambdaVPCAccessExecutionRole
  - S3 읽기/쓰기 (redhorse-s3-ai-0126)
  - Lambda 호출 (ShiftSync-Vision-OCR)
  - RDS 접근

**OCR Lambda (ShiftSync-Vision-OCR)**:
- Runtime: Python 3.12
- Memory: 1024 MB
- Timeout: 60초
- VPC: vpc-046e339ed44006b37
- Security Group: sg-037154693a0796d47
- 환경 변수:
  - `S3_BUCKET_NAME`: redhorse-s3-ai-0126
- IAM 권한:
  - AWSLambdaVPCAccessExecutionRole
  - S3 읽기 (redhorse-s3-ai-0126)
  - Bedrock 호출 (Claude 3.5 Sonnet)

#### 3.4.3 S3 버킷 구성


**버킷명**: `redhorse-s3-ai-0126`

**디렉토리 구조**:
```
redhorse-s3-ai-0126/
└── schedules/
    └── {user_id}/
        └── {uuid}.{ext}
```

**VPC Endpoint**:
- ID: vpce-081a73e4b83c3278a
- 타입: Gateway Endpoint
- 서비스: com.amazonaws.us-east-1.s3
- VPC: vpc-046e339ed44006b37
- 목적: VPC 내부 Lambda에서 S3 접근 (인터넷 게이트웨이 불필요)

**버킷 정책**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::redhorse-s3-ai-0126/schedules/*"
    }
  ]
}
```

#### 3.4.4 RDS 구성
- 엔진: PostgreSQL 14.x
- 인스턴스: db.t3.micro
- VPC: vpc-046e339ed44006b37
- Security Group: Lambda에서만 접근 허용
- 백업: 자동 백업 7일 보관
- 암호화: 저장 데이터 암호화 활성화

### 3.5 보안 설계

#### 3.5.1 IAM 권한 최소화
**schedule_management Lambda 정책**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::redhorse-s3-ai-0126/schedules/*"
    },
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:ShiftSync-Vision-OCR"
    }
  ]
}
```

**OCR Lambda 정책**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::redhorse-s3-ai-0126/schedules/*"
    },
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-*"
    }
  ]
}
```

#### 3.5.2 데이터 격리
- S3 경로에 user_id 포함: `schedules/{user_id}/`
- 데이터베이스 쿼리에 user_id 필터 적용
- API Gateway에서 JWT 토큰 검증

#### 3.5.3 암호화
- S3: 서버 측 암호화 (SSE-S3)
- RDS: 저장 데이터 암호화 (AES-256)
- 전송 중: HTTPS/TLS 1.2+

## 4. 데이터 플로우

### 4.1 이미지 업로드 플로우


```
1. 사용자가 이미지 선택
   ↓
2. 프론트엔드에서 FormData 생성
   - file: 이미지 파일
   - user_group: "1조"
   ↓
3. API Gateway로 POST 요청
   - Content-Type: multipart/form-data
   - Authorization: Bearer {JWT_TOKEN}
   ↓
4. schedule_management Lambda 호출
   ↓
5. multipart/form-data 파싱
   - boundary 추출
   - file 파트 추출
   - user_group 파트 추출
   ↓
6. S3에 이미지 업로드
   - 경로: schedules/{user_id}/{uuid}.jpg
   - put_object() 호출
   ↓
7. S3 파일 검증
   - 0.5초 대기
   - head_object() 호출
   - 파일 존재 확인
   ↓
8. schedule_images 테이블에 메타데이터 저장
   - user_id, original_filename, s3_key, file_size
   - upload_status: 'uploaded'
   ↓
9. 1초 추가 대기 (S3 eventual consistency)
   ↓
10. OCR Lambda 직접 호출
    - payload: {s3_key, user_group}
    - InvocationType: RequestResponse (동기)
    ↓
11. OCR Lambda에서 처리
    - S3 이미지 다운로드
    - Bedrock Claude 호출
    - JSON 파싱
    ↓
12. OCR 결과 반환
    - schedules: [{date, type}, ...]
    ↓
13. schedule_management Lambda에서 결과 처리
    - 타입 매핑 (D→day, E→evening, N→night, O→off)
    - 시간 기본값 설정
    ↓
14. schedule_images 테이블 업데이트
    - ocr_result: JSON 저장
    - upload_status: 'processed'
    - processed_at: 현재 시간
    ↓
15. 프론트엔드로 응답 반환
    - 등록된 스케줄 개수
    - 날짜 범위
    - 상세 스케줄 목록
```

### 4.2 스케줄 저장 플로우 (향후 구현)

현재는 OCR 결과를 `schedule_images.ocr_result`에만 저장하고 있습니다.
향후 자동으로 `schedules` 테이블에 저장하는 기능 추가 예정:

```python
# OCR 결과를 schedules 테이블에 자동 저장
for schedule in converted_schedules:
    upsert_query = """
    INSERT INTO schedules (user_id, work_date, shift_type, start_time, end_time)
    VALUES (%s, %s, %s, %s, %s)
    ON CONFLICT (user_id, work_date) 
    DO UPDATE SET 
        shift_type = EXCLUDED.shift_type,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        updated_at = CURRENT_TIMESTAMP
    """
    self.db.execute_update(upsert_query, (
        user_id,
        schedule['date'],
        schedule['shift_type'],
        schedule['start_time'],
        schedule['end_time']
    ))
```

## 5. 오류 처리 및 복구

### 5.1 오류 시나리오 및 처리

#### 5.1.1 S3 업로드 실패


**원인**:
- 네트워크 오류
- 권한 부족
- 버킷 용량 초과

**처리**:
```python
try:
    self.s3_client.put_object(Bucket=bucket, Key=s3_key, Body=file_content)
    logger.info(f"✅ S3 업로드 완료: {s3_key}")
except ClientError as e:
    logger.error(f"❌ S3 업로드 실패: {e}")
    raise Exception(f"S3 업로드 실패: {e}")
```

**복구**:
- 프론트엔드에서 재시도 옵션 제공
- 오류 메시지 명확히 표시

#### 5.1.2 S3 파일 검증 실패

**원인**:
- S3 eventual consistency 지연
- 파일명 불일치
- 권한 문제

**처리**:
```python
try:
    time.sleep(0.5)  # eventual consistency 대기
    head_response = self.s3_client.head_object(Bucket=bucket, Key=s3_key)
    logger.info(f"✅ S3 파일 검증 성공: {head_response['ContentLength']} bytes")
except Exception as verify_error:
    logger.error(f"❌ S3 파일 검증 실패: {verify_error}")
    raise Exception(f"S3 업로드는 성공했으나 파일 검증 실패: {verify_error}")
```

**복구**:
- 대기 시간 증가 (0.5초 → 1초)
- 재시도 로직 추가

#### 5.1.3 OCR Lambda 호출 실패

**원인**:
- Lambda 권한 부족
- Lambda 타임아웃
- Lambda 함수 오류

**처리**:
```python
try:
    response = lambda_client.invoke(
        FunctionName=ocr_lambda_name,
        InvocationType='RequestResponse',
        Payload=json.dumps(payload)
    )
    logger.info(f"✅ OCR Lambda 응답: {response_payload}")
except Exception as e:
    logger.error(f"❌ OCR Lambda 호출 오류: {e}")
    ocr_result = {
        'schedules': [],
        'error': str(e)
    }
```

**복구**:
- 빈 스케줄 배열 반환
- 오류 메시지 저장
- 수동 입력 대안 제시

#### 5.1.4 Bedrock OCR 실패

**원인**:
- 이미지 품질 불량
- 지원하지 않는 형식
- Bedrock 서비스 오류

**처리**:
```python
try:
    response = bedrock_client.invoke_model(modelId=model_id, body=body)
    result_text = json.loads(response.get('body').read())['content'][0]['text']
    schedules = json.loads(result_text.strip())
except Exception as e:
    logger.error(f"❌ Bedrock OCR 실패: {e}")
    return {
        'statusCode': 500,
        'body': json.dumps({'error': str(e), 'schedules': []})
    }
```

**복구**:
- 이미지 품질 개선 안내
- 다른 이미지 업로드 권장
- 수동 입력 옵션 제공

#### 5.1.5 데이터베이스 저장 실패

**원인**:
- DB 연결 오류
- 제약 조건 위반
- 트랜잭션 충돌

**처리**:
```python
try:
    with self.get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            conn.commit()
except psycopg2.Error as e:
    logger.error(f"❌ DB 저장 실패: {e}")
    conn.rollback()
    raise
```

**복구**:
- 트랜잭션 롤백
- 재시도 (최대 3회)
- 오류 로그 기록

### 5.2 로깅 전략

#### 5.2.1 로그 레벨
- **INFO**: 정상 작동 흐름
- **WARNING**: 예상 가능한 문제
- **ERROR**: 오류 발생

#### 5.2.2 로그 형식


```python
# 이모지를 활용한 시각적 로깅
logger.info(f"🔄 S3 업로드 시작: {s3_key}")
logger.info(f"✅ S3 업로드 완료: {s3_key}")
logger.error(f"❌ S3 업로드 실패: {error}")

logger.info(f"🪣 S3Manager 초기화: 버킷 = {bucket_name}")
logger.info(f"🤖 OCR Lambda 호출: {ocr_lambda_name}")
logger.info(f"📥 데이터 수신: {len(schedules)}개 스케줄")
logger.info(f"📤 응답 반환: {response}")
```

#### 5.2.3 CloudWatch Logs 구조
```
/aws/lambda/shift-worker-wellness-schedule_management
├─ 2024/01/29/[$LATEST]abc123...
│  ├─ START RequestId: abc-123
│  ├─ 🔄 S3 업로드 시작: schedules/user123/uuid.jpg
│  ├─ ✅ S3 업로드 완료: schedules/user123/uuid.jpg
│  ├─ 🤖 OCR Lambda 호출: ShiftSync-Vision-OCR
│  ├─ ✅ OCR Lambda 응답: {...}
│  ├─ 📥 OCR 결과 파싱 성공: 7개 스케줄 인식
│  └─ END RequestId: abc-123

/aws/lambda/ShiftSync-Vision-OCR
├─ 2024/01/29/[$LATEST]def456...
│  ├─ START RequestId: def-456
│  ├─ 📥 이벤트 수신: {s3_key: "..."}
│  ├─ 🔧 직접 호출 모드
│  ├─ 🪣 S3 버킷: redhorse-s3-ai-0126
│  ├─ ✅ S3 파일 존재 확인: 크기 123456 bytes
│  ├─ 📥 S3에서 이미지 로드 완료
│  ├─ 🤖 Bedrock 모델 호출 중...
│  ├─ ✅ Bedrock 응답: [...]
│  ├─ ✅ 분석 완료: 7건의 일정
│  └─ END RequestId: def-456
```

## 6. 성능 최적화

### 6.1 Lambda 최적화

#### 6.1.1 콜드 스타트 최소화
- **Provisioned Concurrency**: 자주 사용되는 Lambda에 적용
- **메모리 할당**: 적절한 메모리 크기 설정 (512MB ~ 1024MB)
- **의존성 최소화**: 필요한 라이브러리만 포함

#### 6.1.2 실행 시간 단축
- **S3 대기 시간 최적화**: 1.5초 (0.5초 + 1초)
- **병렬 처리**: 여러 스케줄 동시 저장 (향후 구현)
- **캐싱**: 자주 사용되는 데이터 Redis 캐싱

### 6.2 데이터베이스 최적화

#### 6.2.1 인덱스 전략
```sql
-- 사용자별 날짜 조회 최적화
CREATE INDEX idx_schedules_user_date ON schedules(user_id, work_date);

-- 업로드 상태별 조회 최적화
CREATE INDEX idx_schedule_images_status ON schedule_images(upload_status);

-- 사용자별 이미지 조회 최적화
CREATE INDEX idx_schedule_images_user ON schedule_images(user_id);
```

#### 6.2.2 쿼리 최적화
- **UPSERT 사용**: 중복 처리 최적화
- **배치 INSERT**: 여러 스케줄 한 번에 저장
- **Connection Pooling**: psycopg2 연결 재사용

### 6.3 S3 최적화

#### 6.3.1 VPC Endpoint 사용
- 인터넷 게이트웨이 불필요
- 데이터 전송 비용 절감
- 지연 시간 감소

#### 6.3.2 이미지 압축
- 업로드 전 클라이언트에서 이미지 압축
- 최대 해상도 제한 (1920x1080)
- JPEG 품질 80% 설정

## 7. 모니터링 및 알림

### 7.1 CloudWatch 메트릭

#### 7.1.1 Lambda 메트릭
- **Invocations**: 호출 횟수
- **Duration**: 실행 시간
- **Errors**: 오류 발생 횟수
- **Throttles**: 제한 발생 횟수
- **ConcurrentExecutions**: 동시 실행 수

#### 7.1.2 커스텀 메트릭


```python
import boto3

cloudwatch = boto3.client('cloudwatch')

# OCR 성공률 메트릭
cloudwatch.put_metric_data(
    Namespace='ShiftWorkerWellness',
    MetricData=[
        {
            'MetricName': 'OCRSuccessRate',
            'Value': 1.0 if success else 0.0,
            'Unit': 'None'
        }
    ]
)

# OCR 처리 시간 메트릭
cloudwatch.put_metric_data(
    Namespace='ShiftWorkerWellness',
    MetricData=[
        {
            'MetricName': 'OCRProcessingTime',
            'Value': processing_time_ms,
            'Unit': 'Milliseconds'
        }
    ]
)

# 인식된 스케줄 개수 메트릭
cloudwatch.put_metric_data(
    Namespace='ShiftWorkerWellness',
    MetricData=[
        {
            'MetricName': 'RecognizedScheduleCount',
            'Value': len(schedules),
            'Unit': 'Count'
        }
    ]
)
```

### 7.2 알림 설정

#### 7.2.1 CloudWatch Alarms
```yaml
OCRErrorRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: OCR-High-Error-Rate
    MetricName: Errors
    Namespace: AWS/Lambda
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 1
    Threshold: 10
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref SNSTopic

LambdaDurationAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: Lambda-High-Duration
    MetricName: Duration
    Namespace: AWS/Lambda
    Statistic: Average
    Period: 300
    EvaluationPeriods: 2
    Threshold: 10000  # 10초
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref SNSTopic
```

#### 7.2.2 SNS 알림
- 이메일 알림: 개발팀에게 오류 알림
- Slack 통합: 실시간 알림 채널
- SMS 알림: 긴급 상황 (선택사항)

## 8. 테스트 전략

### 8.1 단위 테스트

#### 8.1.1 S3Manager 테스트
```python
import pytest
from backend.lambda.schedule_management.handler import S3Manager

def test_upload_schedule_image():
    s3_manager = S3Manager()
    
    # 테스트 이미지 데이터
    test_image = b'fake_image_data'
    filename = 'test_schedule.jpg'
    user_id = 'test_user_123'
    
    # 업로드 실행
    s3_key = s3_manager.upload_schedule_image(test_image, filename, user_id)
    
    # 검증
    assert s3_key.startswith(f'schedules/{user_id}/')
    assert s3_key.endswith('.jpg')
```

#### 8.1.2 타입 매핑 테스트
```python
def test_type_mapping():
    type_mapping = {'D': 'day', 'E': 'evening', 'N': 'night', 'O': 'off'}
    
    assert type_mapping['D'] == 'day'
    assert type_mapping['E'] == 'evening'
    assert type_mapping['N'] == 'night'
    assert type_mapping['O'] == 'off'
```

### 8.2 통합 테스트

#### 8.2.1 전체 플로우 테스트
```python
def test_full_ocr_flow():
    # 1. 이미지 업로드
    with open('test_schedule.jpg', 'rb') as f:
        image_data = f.read()
    
    # 2. Lambda 호출
    response = lambda_client.invoke(
        FunctionName='shift-worker-wellness-schedule_management',
        Payload=json.dumps({
            'httpMethod': 'POST',
            'path': '/users/test_user/schedule-images',
            'body': base64.b64encode(image_data).decode()
        })
    )
    
    # 3. 응답 검증
    result = json.loads(response['Payload'].read())
    assert result['statusCode'] == 201
    assert 'upload' in json.loads(result['body'])
```

### 8.3 성능 테스트

#### 8.3.1 부하 테스트
```python
import concurrent.futures

def upload_test_image(user_id):
    # 이미지 업로드 시뮬레이션
    pass

# 100명 동시 사용자 시뮬레이션
with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
    futures = [executor.submit(upload_test_image, f'user_{i}') 
               for i in range(100)]
    results = [f.result() for f in futures]

# 성공률 계산
success_rate = sum(1 for r in results if r['success']) / len(results)
assert success_rate >= 0.95  # 95% 이상 성공
```

## 9. 배포 전략

### 9.1 배포 스크립트

#### 9.1.1 단일 Lambda 배포


**파일**: `deploy_single_function.py`

```python
import boto3
import zipfile
import os
from io import BytesIO

def deploy_lambda(function_name, handler_path, requirements_path):
    """단일 Lambda 함수 배포"""
    
    # 1. ZIP 파일 생성
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # handler.py 추가
        zip_file.write(handler_path, 'handler.py')
        
        # 의존성 추가 (psycopg2 등)
        # pip install -r requirements.txt -t ./package
        # zip_file.write('./package/*')
    
    # 2. Lambda 업데이트
    lambda_client = boto3.client('lambda')
    
    response = lambda_client.update_function_code(
        FunctionName=function_name,
        ZipFile=zip_buffer.getvalue()
    )
    
    print(f"✅ {function_name} 배포 완료")
    return response

# 사용 예시
deploy_lambda(
    'shift-worker-wellness-schedule_management',
    'backend/lambda/schedule_management/handler.py',
    'backend/lambda/schedule_management/requirements.txt'
)
```

#### 9.1.2 환경 변수 업데이트
**파일**: `update_schedule_lambda_env.py`

```python
import boto3

lambda_client = boto3.client('lambda')

response = lambda_client.update_function_configuration(
    FunctionName='shift-worker-wellness-schedule_management',
    Environment={
        'Variables': {
            'DB_HOST': 'your-rds-endpoint.rds.amazonaws.com',
            'DB_NAME': 'rhythm_fairy',
            'DB_USER': 'postgres',
            'DB_PASSWORD': 'your-password',
            'S3_BUCKET_NAME': 'redhorse-s3-ai-0126',
            'OCR_LAMBDA_NAME': 'ShiftSync-Vision-OCR'
        }
    }
)

print("✅ 환경 변수 업데이트 완료")
```

### 9.2 배포 체크리스트

#### 9.2.1 배포 전 확인사항
- [ ] 코드 변경사항 리뷰 완료
- [ ] 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] 환경 변수 설정 확인
- [ ] IAM 권한 확인
- [ ] VPC 설정 확인
- [ ] S3 버킷 접근 권한 확인

#### 9.2.2 배포 후 확인사항
- [ ] Lambda 함수 정상 작동 확인
- [ ] CloudWatch Logs 확인
- [ ] 테스트 이미지 업로드 성공
- [ ] OCR 결과 정확도 확인
- [ ] 데이터베이스 저장 확인
- [ ] 성능 메트릭 확인

### 9.3 롤백 전략

#### 9.3.1 Lambda 버전 관리
```python
# 배포 전 현재 버전 백업
lambda_client.publish_version(
    FunctionName='shift-worker-wellness-schedule_management',
    Description='Backup before OCR feature deployment'
)

# 문제 발생 시 이전 버전으로 롤백
lambda_client.update_alias(
    FunctionName='shift-worker-wellness-schedule_management',
    Name='prod',
    FunctionVersion='$PREVIOUS_VERSION'
)
```

#### 9.3.2 데이터베이스 롤백
```sql
-- 배포 전 백업
CREATE TABLE schedules_backup AS SELECT * FROM schedules;
CREATE TABLE schedule_images_backup AS SELECT * FROM schedule_images;

-- 롤백 시 복원
TRUNCATE schedules;
INSERT INTO schedules SELECT * FROM schedules_backup;

TRUNCATE schedule_images;
INSERT INTO schedule_images SELECT * FROM schedule_images_backup;
```

## 10. 향후 개선 계획

### 10.1 단기 개선 (1-2개월)

#### 10.1.1 자동 스케줄 저장
현재는 OCR 결과를 `schedule_images.ocr_result`에만 저장하고 있으나,
자동으로 `schedules` 테이블에 저장하는 기능 추가:

```python
# OCR 결과를 schedules 테이블에 자동 저장
for schedule in converted_schedules:
    self.create_or_update_schedule(user_id, schedule)
```

#### 10.1.2 OCR 정확도 개선
- 이미지 전처리 (회전, 크롭, 밝기 조정)
- 다양한 근무표 형식 학습
- 사용자 피드백 수집 및 반영

#### 10.1.3 실시간 미리보기
- OCR 결과를 사용자에게 미리 보여주기
- 수정 기능 제공
- 확인 후 저장

### 10.2 중기 개선 (3-6개월)

#### 10.2.1 다국어 지원
- 영어, 일본어, 중국어 근무표 인식
- 다국어 프롬프트 최적화

#### 10.2.2 수기 작성 근무표 인식
- 손글씨 인식 정확도 개선
- 다양한 필기체 학습

#### 10.2.3 배치 처리
- 여러 이미지 동시 업로드
- 월간 근무표 자동 분할

### 10.3 장기 개선 (6개월 이상)

#### 10.3.1 머신러닝 기반 학습
- 사용자별 근무표 형식 학습
- 자동 오류 수정
- 패턴 인식 개선

#### 10.3.2 템플릿 관리
- 사용자별 근무표 템플릿 저장
- 템플릿 기반 빠른 인식
- 템플릿 공유 기능

#### 10.3.3 알림 기능
- 근무표 변경 알림
- 스케줄 충돌 감지
- 자동 리마인더

## 11. 참고 자료

### 11.1 AWS 문서
- [AWS Lambda 개발자 가이드](https://docs.aws.amazon.com/lambda/)
- [AWS Bedrock 사용자 가이드](https://docs.aws.amazon.com/bedrock/)
- [Amazon S3 개발자 가이드](https://docs.aws.amazon.com/s3/)
- [Amazon RDS PostgreSQL 가이드](https://docs.aws.amazon.com/rds/)

### 11.2 관련 코드
- `backend/lambda/schedule_management/handler.py`
- `backend/lambda/ocr_vision/lambda_function.py`
- `backend/utils/s3_manager.py`
- `backend/scripts/deploy_lambda.py`

### 11.3 디버깅 스크립트
- `check_schedule_logs.py` - Lambda 로그 확인
- `check_s3_images.py` - S3 이미지 목록 확인
- `test_direct_ocr.py` - OCR Lambda 직접 테스트

---

**문서 버전**: 1.0
**작성일**: 2024-01-29
**작성자**: AI Assistant
**상태**: 구현 완료 및 테스트 성공 ✅
