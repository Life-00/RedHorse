# psycopg2 Lambda Layer 해결 방법

## 문제
Windows에서 빌드한 psycopg2-binary가 Lambda (Linux) 환경에서 작동하지 않음

## 해결 방법 1: AWS Lambda Layer 사용 (권장)

### 1단계: psycopg2 Layer 생성

```bash
# Docker를 사용하여 Linux용 psycopg2 빌드
docker run --rm -v $(pwd):/var/task public.ecr.aws/lambda/python:3.11 \
  pip install psycopg2-binary -t python/lib/python3.11/site-packages/

# ZIP 파일 생성
zip -r psycopg2-layer.zip python
```

### 2단계: Layer 업로드

```bash
aws lambda publish-layer-version \
  --layer-name psycopg2-layer \
  --description "psycopg2-binary for Python 3.11" \
  --zip-file fileb://psycopg2-layer.zip \
  --compatible-runtimes python3.11 \
  --region us-east-1
```

### 3단계: Lambda에 Layer 연결

```bash
aws lambda update-function-configuration \
  --function-name ShiftSync_BioPathway_Calculator \
  --layers arn:aws:lambda:us-east-1:YOUR_ACCOUNT:layer:psycopg2-layer:1
```

## 해결 방법 2: 공개 Lambda Layer 사용 (빠름)

AWS에서 제공하는 공개 psycopg2 Layer 사용:

```bash
# ARN 예시 (리전별로 다름)
arn:aws:lambda:us-east-1:898466741470:layer:psycopg2-py38:1
```

AWS Console에서:
1. Lambda 함수 → Configuration → Layers
2. Add a layer
3. Specify an ARN 선택
4. ARN 입력: `arn:aws:lambda:us-east-1:898466741470:layer:psycopg2-py38:1`

## 해결 방법 3: pymysql 사용 (대안)

psycopg2 대신 순수 Python 라이브러리 사용:

```python
# requirements.txt
pg8000==1.29.4  # Pure Python PostgreSQL driver
```

```python
# lambda_function.py
import pg8000

def get_db_connection():
    return pg8000.connect(
        host=os.environ['DB_HOST'],
        port=int(os.environ.get('DB_PORT', '5432')),
        database=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD']
    )
```

## 현재 상태

✅ Bedrock Agent 통합은 정상 작동
✅ Fallback 로직으로 응답 생성 가능
⚠️ RDS 직접 조회는 psycopg2 문제로 실패

## 권장 사항

**단기:** 현재 상태로 진행 (Fallback 로직 사용)
- Bedrock Agent가 정상 작동
- 사용자 경험에 영향 없음

**장기:** Lambda Layer 추가
- RDS 직접 조회 필요 시
- 더 정확한 shift_type 인식
