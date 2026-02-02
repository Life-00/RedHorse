#!/usr/bin/env python3
"""
AI Services Lambda만 재배포하는 스크립트
"""

import boto3
import sys

lambda_client = boto3.client('lambda', region_name='us-east-1')

function_name = 'shift-worker-wellness-ai_services'

print(f"🔧 {function_name} Lambda 환경 변수 업데이트 중...")

# 현재 함수 설정 가져오기
response = lambda_client.get_function_configuration(FunctionName=function_name)

# 기존 환경 변수 가져오기
env_vars = response.get('Environment', {}).get('Variables', {})

print(f"\n현재 환경 변수:")
for key in sorted(env_vars.keys()):
    if 'BEDROCK' in key:
        print(f"  {key}: {env_vars[key]}")

# Bio-Coach Agent 환경 변수 추가/업데이트
env_vars['BEDROCK_BIO_AGENT_ID'] = '1XOE4OAMLR'
env_vars['BEDROCK_BIO_AGENT_ALIAS_ID'] = 'VXOUCFXA2P'

print(f"\n✅ 업데이트할 환경 변수:")
print(f"   BEDROCK_BIO_AGENT_ID: {env_vars['BEDROCK_BIO_AGENT_ID']}")
print(f"   BEDROCK_BIO_AGENT_ALIAS_ID: {env_vars['BEDROCK_BIO_AGENT_ALIAS_ID']}")

# 환경 변수 업데이트
try:
    lambda_client.update_function_configuration(
        FunctionName=function_name,
        Environment={'Variables': env_vars}
    )
    
    print(f"\n✅ 환경 변수 업데이트 완료!")
    
    # 업데이트 후 확인
    print(f"\n🔍 업데이트 확인 중...")
    import time
    time.sleep(3)
    
    response = lambda_client.get_function_configuration(FunctionName=function_name)
    updated_env_vars = response.get('Environment', {}).get('Variables', {})
    
    print(f"\n업데이트된 환경 변수:")
    for key in sorted(updated_env_vars.keys()):
        if 'BEDROCK' in key:
            print(f"  {key}: {updated_env_vars[key]}")
    
    # 검증
    if updated_env_vars.get('BEDROCK_BIO_AGENT_ID') == '1XOE4OAMLR':
        print(f"\n✅ BEDROCK_BIO_AGENT_ID 설정 성공!")
    else:
        print(f"\n❌ BEDROCK_BIO_AGENT_ID 설정 실패!")
        sys.exit(1)
    
    if updated_env_vars.get('BEDROCK_BIO_AGENT_ALIAS_ID') == 'VXOUCFXA2P':
        print(f"✅ BEDROCK_BIO_AGENT_ALIAS_ID 설정 성공!")
    else:
        print(f"❌ BEDROCK_BIO_AGENT_ALIAS_ID 설정 실패!")
        sys.exit(1)
    
    print(f"\n🎉 모든 환경 변수가 성공적으로 설정되었습니다!")
    
except Exception as e:
    print(f"\n❌ 환경 변수 업데이트 실패: {e}")
    sys.exit(1)
