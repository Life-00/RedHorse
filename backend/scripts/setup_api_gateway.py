#!/usr/bin/env python3
"""
API Gateway 설정 스크립트
Lambda 함수들을 API Gateway에 연결합니다.
"""

import os
import sys
import json
import boto3
from pathlib import Path

# 색상 코드
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.END}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.END}")

# 환경 변수 로드
def load_env_file():
    env_path = Path(__file__).parent.parent / '.env'
    if not env_path.exists():
        return
    
    # 다양한 인코딩 시도
    encodings = ['utf-8', 'utf-16', 'cp1252', 'latin-1']
    content = None
    
    for encoding in encodings:
        try:
            with open(env_path, 'r', encoding=encoding) as f:
                content = f.read()
            break
        except UnicodeDecodeError:
            continue
    
    if not content:
        return
    
    for line in content.split('\n'):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            os.environ[key.strip()] = value.strip()

load_env_file()

# AWS 클라이언트
region = os.environ.get('AWS_REGION', 'us-east-1')
apigateway = boto3.client('apigatewayv2', region_name=region)
lambda_client = boto3.client('lambda', region_name=region)

# API 라우트 정의
API_ROUTES = {
    'user_management': [
        ('POST', '/users'),
        ('GET', '/users/{user_id}'),
        ('PUT', '/users/{user_id}'),
        ('DELETE', '/users/{user_id}')
    ],
    'schedule_management': [
        ('GET', '/users/{user_id}/schedules'),
        ('POST', '/users/{user_id}/schedules'),
        ('PUT', '/users/{user_id}/schedules/{schedule_id}'),
        ('DELETE', '/users/{user_id}/schedules/{schedule_id}'),
        ('POST', '/users/{user_id}/schedule-images'),
        ('GET', '/users/{user_id}/schedule-images')
    ],
    'ai_services': [
        ('POST', '/users/{user_id}/sleep-plans'),
        ('GET', '/users/{user_id}/sleep-plans'),
        ('POST', '/users/{user_id}/caffeine-plans'),
        ('GET', '/users/{user_id}/caffeine-plans'),
        ('POST', '/users/{user_id}/chat'),
        ('GET', '/users/{user_id}/chat')
    ],
    'fatigue_assessment': [
        ('POST', '/users/{user_id}/fatigue-assessment'),
        ('GET', '/users/{user_id}/fatigue-assessment'),
        ('GET', '/users/{user_id}/fatigue-assessment/history'),
        ('GET', '/users/{user_id}/fatigue-assessment/statistics')
    ],
    'jumpstart': [
        ('POST', '/users/{user_id}/jumpstart'),
        ('GET', '/users/{user_id}/jumpstart'),
        ('PUT', '/users/{user_id}/jumpstart/tasks/{task_id}'),
        ('POST', '/users/{user_id}/jumpstart/blocks/{block_id}/tasks'),
        ('GET', '/users/{user_id}/jumpstart/statistics')
    ],
    'wellness': [
        ('GET', '/audio-files'),
        ('GET', '/audio-files/{file_id}'),
        ('POST', '/users/{user_id}/daily-checklist'),
        ('GET', '/users/{user_id}/daily-checklist'),
        ('PUT', '/users/{user_id}/daily-checklist/{task_id}'),
        ('POST', '/users/{user_id}/daily-checklist/custom')
    ]
}

def create_or_get_api():
    """HTTP API 생성 또는 가져오기"""
    api_name = 'shift-worker-wellness-api'
    
    # 기존 API 확인
    apis = apigateway.get_apis()
    for api in apis['Items']:
        if api['Name'] == api_name:
            print_info(f"기존 API 사용: {api_name}")
            return api['ApiId'], api['ApiEndpoint']
    
    # 새 API 생성
    print_info(f"새 API 생성 중: {api_name}")
    
    response = apigateway.create_api(
        Name=api_name,
        ProtocolType='HTTP',
        Description='API for Shift Worker Wellness App',
        CorsConfiguration={
            'AllowOrigins': ['*'],
            'AllowMethods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'AllowHeaders': ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
            'MaxAge': 300
        }
    )
    
    api_id = response['ApiId']
    api_endpoint = response['ApiEndpoint']
    
    print_success(f"API 생성 완료: {api_id}")
    return api_id, api_endpoint

def create_lambda_integration(api_id, function_name):
    """Lambda 통합 생성"""
    lambda_function_name = f'shift-worker-wellness-{function_name}'
    
    # Lambda 함수 ARN 가져오기
    try:
        lambda_response = lambda_client.get_function(FunctionName=lambda_function_name)
        lambda_arn = lambda_response['Configuration']['FunctionArn']
    except lambda_client.exceptions.ResourceNotFoundException:
        print_error(f"Lambda 함수를 찾을 수 없습니다: {lambda_function_name}")
        return None
    
    # AWS 계정 ID 가져오기
    import boto3
    sts_client = boto3.client('sts', region_name=region)
    account_id = sts_client.get_caller_identity()['Account']
    
    # 통합 생성
    try:
        integration_response = apigateway.create_integration(
            ApiId=api_id,
            IntegrationType='AWS_PROXY',
            IntegrationUri=lambda_arn,
            PayloadFormatVersion='2.0'
        )
        
        integration_id = integration_response['IntegrationId']
        
        # Lambda 권한 추가
        try:
            lambda_client.add_permission(
                FunctionName=lambda_function_name,
                StatementId=f'apigateway-{api_id}-{function_name}',
                Action='lambda:InvokeFunction',
                Principal='apigateway.amazonaws.com',
                SourceArn=f'arn:aws:execute-api:{region}:{account_id}:{api_id}/*'
            )
        except lambda_client.exceptions.ResourceConflictException:
            # 권한이 이미 존재하는 경우
            pass
        
        print_success(f"Lambda 통합 생성 완료: {function_name}")
        return integration_id
        
    except Exception as e:
        print_error(f"Lambda 통합 생성 실패: {e}")
        return None

def create_routes(api_id, function_name, integration_id):
    """라우트 생성"""
    routes = API_ROUTES.get(function_name, [])
    
    for method, path in routes:
        try:
            apigateway.create_route(
                ApiId=api_id,
                RouteKey=f'{method} {path}',
                Target=f'integrations/{integration_id}'
            )
            print_info(f"라우트 생성: {method} {path}")
        except Exception as e:
            print_error(f"라우트 생성 실패 ({method} {path}): {e}")

def create_stage(api_id):
    """스테이지 생성"""
    stage_name = 'prod'
    
    try:
        # 기존 스테이지 확인
        try:
            apigateway.get_stage(ApiId=api_id, StageName=stage_name)
            print_info(f"기존 스테이지 사용: {stage_name}")
            return stage_name
        except apigateway.exceptions.NotFoundException:
            pass
        
        # 새 스테이지 생성
        apigateway.create_stage(
            ApiId=api_id,
            StageName=stage_name,
            AutoDeploy=True,
            Description='Production stage'
        )
        
        print_success(f"스테이지 생성 완료: {stage_name}")
        return stage_name
        
    except Exception as e:
        print_error(f"스테이지 생성 실패: {e}")
        return None

def main():
    """메인 함수"""
    print(f"\n{Colors.BLUE}{'='*50}")
    print("🚀 API Gateway 설정 시작")
    print(f"{'='*50}{Colors.END}\n")
    
    try:
        # API 생성
        api_id, api_endpoint = create_or_get_api()
        
        # 각 Lambda 함수에 대한 통합 및 라우트 생성
        for function_name in API_ROUTES.keys():
            print_info(f"\n{function_name} 설정 중...")
            
            integration_id = create_lambda_integration(api_id, function_name)
            if integration_id:
                create_routes(api_id, function_name, integration_id)
        
        # 스테이지 생성
        stage_name = create_stage(api_id)
        
        # 최종 API URL
        api_url = f"{api_endpoint}/{stage_name}"
        
        print(f"\n{Colors.GREEN}{'='*50}")
        print("🎉 API Gateway 설정 완료!")
        print(f"{'='*50}{Colors.END}\n")
        
        print_info(f"API URL: {api_url}")
        print_info(f"API ID: {api_id}")
        
        print(f"\n{Colors.YELLOW}다음 단계:{Colors.END}")
        print(f"1. 프론트엔드 .env.local 파일에 다음 추가:")
        print(f"   VITE_API_BASE_URL={api_url}")
        print(f"2. 프론트엔드 빌드 및 배포\n")
        
        # .env 파일 업데이트
        env_path = Path(__file__).parent.parent / '.env'
        with open(env_path, 'a', encoding='utf-8') as f:
            f.write(f"\n# API Gateway\n")
            f.write(f"API_GATEWAY_URL={api_url}\n")
            f.write(f"API_GATEWAY_ID={api_id}\n")
        
        print_success("백엔드 .env 파일 업데이트 완료")
        
    except Exception as e:
        print_error(f"설정 실패: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
