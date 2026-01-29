#!/usr/bin/env python3
"""
Bedrock Agent 연결 테스트 스크립트
"""

import os
import sys
import json
import boto3
from pathlib import Path

# 환경 변수 로드
def load_env_file():
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

load_env_file()

# Bedrock Agent 설정
AGENT_ID = os.environ.get('BEDROCK_AGENT_ID')
AGENT_ALIAS_ID = os.environ.get('BEDROCK_AGENT_ALIAS_ID')
REGION = os.environ.get('BEDROCK_REGION', 'us-east-1')

print(f"\n{'='*60}")
print("🤖 Bedrock Agent 연결 테스트")
print(f"{'='*60}\n")

print(f"Agent ID: {AGENT_ID}")
print(f"Agent Alias ID: {AGENT_ALIAS_ID}")
print(f"Region: {REGION}\n")

if not AGENT_ID or not AGENT_ALIAS_ID:
    print("❌ 오류: BEDROCK_AGENT_ID 또는 BEDROCK_AGENT_ALIAS_ID가 설정되지 않았습니다.")
    print("backend/.env 파일을 확인하세요.\n")
    sys.exit(1)

try:
    # Bedrock Agent Runtime 클라이언트 생성
    print("📡 Bedrock Agent Runtime 클라이언트 생성 중...")
    bedrock_agent_runtime = boto3.client(
        'bedrock-agent-runtime',
        region_name=REGION
    )
    print("✅ 클라이언트 생성 완료\n")
    
    # 테스트 메시지
    test_message = "안녕하세요! 야간 근무 후 수면 관리 팁을 알려주세요."
    session_id = "test-session-001"
    
    print(f"💬 테스트 메시지: {test_message}")
    print(f"🔑 세션 ID: {session_id}\n")
    
    print("🚀 Agent 호출 중...\n")
    
    # Agent 호출
    response = bedrock_agent_runtime.invoke_agent(
        agentId=AGENT_ID,
        agentAliasId=AGENT_ALIAS_ID,
        sessionId=session_id,
        inputText=test_message
    )
    
    # 응답 스트림 처리
    print("📥 응답 수신 중...\n")
    print(f"{'='*60}")
    print("🤖 Agent 응답:")
    print(f"{'='*60}\n")
    
    full_response = ""
    event_stream = response['completion']
    
    for event in event_stream:
        if 'chunk' in event:
            chunk = event['chunk']
            if 'bytes' in chunk:
                chunk_text = chunk['bytes'].decode('utf-8')
                full_response += chunk_text
                print(chunk_text, end='', flush=True)
    
    print(f"\n\n{'='*60}")
    print("✅ 테스트 성공!")
    print(f"{'='*60}\n")
    
    print(f"📊 응답 길이: {len(full_response)} 문자\n")
    
except Exception as e:
    print(f"\n{'='*60}")
    print("❌ 테스트 실패!")
    print(f"{'='*60}\n")
    print(f"오류: {e}\n")
    
    if "AccessDeniedException" in str(e):
        print("💡 해결 방법:")
        print("1. Lambda 실행 역할에 Bedrock Agent 권한이 있는지 확인")
        print("2. IAM 정책에 다음 권한 추가:")
        print("   - bedrock:InvokeAgent")
        print("   - bedrock:InvokeModel")
        print("   - bedrock:InvokeModelWithResponseStream\n")
    
    sys.exit(1)
