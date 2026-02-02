import boto3
import json
import base64
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
bedrock_client = boto3.client('bedrock-runtime', region_name='us-east-1')

def lambda_handler(event, context):
    """
    OCR Lambda 함수 - 직접 호출 또는 Bedrock Agent 호출 모두 지원
    근무표 이미지를 분석하여 스케줄 데이터를 반환
    """
    logger.info(f"📥 이벤트 수신: {json.dumps(event)}")
    
    # 직접 호출인지 Bedrock Agent 호출인지 구분
    is_direct_invoke = 'actionGroup' not in event
    
    if is_direct_invoke:
        # 직접 호출 - 간단한 파라미터 구조
        s3_key = event.get('s3_key')
        user_group = event.get('user_group', "1조")
        logger.info(f"🔧 직접 호출 모드")
    else:
        # Bedrock Agent 호출 - 복잡한 파라미터 구조
        actionGroup = event.get('actionGroup')
        function = event.get('function')
        parameters = event.get('parameters', [])
        s3_key = next((p['value'] for p in parameters if p['name'] == 's3_key'), None)
        user_group = next((p['value'] for p in parameters if p['name'] == 'user_group'), "1조")
        logger.info(f"🤖 Bedrock Agent 호출 모드")
    
    try:
        if not s3_key:
            raise ValueError("S3 경로(s3_key) 정보가 누락되었습니다.")
        
        logger.info(f"🔍 파라미터 확인 - S3 키: {s3_key}, 사용자 그룹: {user_group}")
        
        # 1. S3에서 이미지 가져오기
        bucket = os.environ.get('S3_BUCKET_NAME', 'redhorse-s3-ai-0126')
        logger.info(f"🪣 S3 버킷: {bucket}")
        
        # S3 파일 존재 확인
        try:
            head_response = s3_client.head_object(Bucket=bucket, Key=s3_key)
            logger.info(f"✅ S3 파일 존재 확인: 크기 {head_response['ContentLength']} bytes")
        except Exception as head_error:
            logger.error(f"❌ S3 파일 존재 확인 실패: {head_error}")
            raise Exception(f"S3에서 파일을 찾을 수 없습니다: {s3_key}")
        
        # S3에서 이미지 다운로드
        logger.info(f"📥 S3에서 이미지 다운로드 중: s3://{bucket}/{s3_key}")
        image_obj = s3_client.get_object(Bucket=bucket, Key=s3_key)
        image_data = image_obj['Body'].read()
        encoded_image = base64.b64encode(image_data).decode('utf-8')
        
        logger.info(f"✅ S3에서 이미지 로드 완료: {len(encoded_image)} bytes (base64)")
        
        # 2. Claude 3.5 Sonnet 비전 호출
        # 현재 연도 가져오기
        from datetime import datetime
        current_year = datetime.now().year
        
        system_prompt = (
            f"너는 전문 스케줄 분석가야. 이미지에서 '{user_group}' 행 또는 열을 찾아 일정을 추출해. "
            f"중요: 연도가 명시되지 않은 경우 {current_year}년으로 간주해. "
            f"날짜 형식은 반드시 {current_year}-MM-DD 형식으로 작성해. "
            "근무 타입은 D(Day), E(Evening), N(Night), O(Off)로 매핑하고, "
            "반드시 [{\"date\": \"YYYY-MM-DD\", \"type\": \"D|E|N|O\"}] 형식의 JSON 배열로만 응답해. "
            "설명은 일절 배제해."
        )
        
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": encoded_image
                            }
                        },
                        {
                            "type": "text",
                            "text": f"'{user_group}'의 근무 데이터를 분석해줘."
                        }
                    ]
                }
            ]
        })
        
        logger.info("🤖 Bedrock 모델 호출 중...")
        
        response = bedrock_client.invoke_model(
            modelId="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
            body=body
        )
        
        result_text = json.loads(response.get('body').read())['content'][0]['text']
        logger.info(f"✅ Bedrock 응답: {result_text}")
        
        # JSON 파싱
        schedules = json.loads(result_text.replace('```json', '').replace('```', '').strip())
        
        logger.info(f"✅ 분석 완료: {len(schedules)}건의 일정")
        
        # 3. 응답 반환 (직접 호출 vs Bedrock Agent)
        if is_direct_invoke:
            # 직접 호출 - 간단한 JSON 응답
            logger.info(f"📤 직접 호출 응답 반환: {len(schedules)}건")
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'schedules': schedules,
                    'user_group': user_group,
                    's3_key': s3_key
                }, ensure_ascii=False)
            }
        else:
            # Bedrock Agent 호출 - Agent 응답 형식
            response_body = json.dumps(schedules, ensure_ascii=False)
            
            action_response = {
                'actionGroup': actionGroup,
                'function': function,
                'functionResponse': {
                    'responseBody': {
                        'TEXT': {
                            'body': response_body
                        }
                    }
                }
            }
            
            logger.info(f"📤 Bedrock Agent 응답 반환: {len(schedules)}건")
            
            return {
                'messageVersion': '1.0',
                'response': action_response
            }
        
    except Exception as e:
        logger.error(f"❌ 오류 발생: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        if is_direct_invoke:
            # 직접 호출 - 에러 응답
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': str(e),
                    'schedules': []
                }, ensure_ascii=False)
            }
        else:
            # Bedrock Agent 호출 - Agent 에러 응답
            error_response = {
                'actionGroup': actionGroup,
                'function': function,
                'functionResponse': {
                    'responseBody': {
                        'TEXT': {
                            'body': json.dumps({
                                'error': str(e),
                                'schedules': []
                            }, ensure_ascii=False)
                        }
                    }
                }
            }
            
            return {
                'messageVersion': '1.0',
                'response': error_response
            }
