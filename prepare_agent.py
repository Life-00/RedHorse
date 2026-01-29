#!/usr/bin/env python3
"""
Bedrock Agent 재배포 (Prepare)
IAM 권한 변경 후 Agent를 다시 준비해야 변경사항이 적용됩니다.
"""

import boto3
import time

region = 'us-east-1'
bedrock_agent_client = boto3.client('bedrock-agent', region_name=region)

agent_id = '9NPCFXV4WV'

print("\n" + "="*60)
print("🔄 Bedrock Agent 재배포 (Prepare)")
print("="*60 + "\n")

try:
    # 1. 현재 Agent 상태 확인
    print("1️⃣  현재 Agent 상태 확인\n")
    
    agent_response = bedrock_agent_client.get_agent(
        agentId=agent_id
    )
    
    agent = agent_response['agent']
    
    print(f"   Agent: {agent['agentName']}")
    print(f"   현재 상태: {agent['agentStatus']}")
    print(f"   마지막 준비: {agent.get('preparedAt', 'N/A')}\n")
    
    # 2. Agent Prepare 시작
    print("2️⃣  Agent Prepare 시작\n")
    print("   ⏳ Agent를 다시 준비하고 있습니다...")
    print("   (이 작업은 1-2분 정도 소요될 수 있습니다)\n")
    
    prepare_response = bedrock_agent_client.prepare_agent(
        agentId=agent_id
    )
    
    prepared_agent = prepare_response['agentStatus']
    print(f"   📋 Prepare 요청 완료: {prepared_agent}\n")
    
    # 3. Prepare 완료 대기
    print("3️⃣  Prepare 완료 대기\n")
    
    max_attempts = 30  # 최대 5분 대기
    attempt = 0
    
    while attempt < max_attempts:
        time.sleep(10)  # 10초마다 확인
        attempt += 1
        
        agent_response = bedrock_agent_client.get_agent(
            agentId=agent_id
        )
        
        agent = agent_response['agent']
        status = agent['agentStatus']
        
        print(f"   [{attempt}/{max_attempts}] 상태: {status}")
        
        if status == 'PREPARED':
            print("\n   ✅ Agent Prepare 완료!\n")
            break
        elif status == 'FAILED':
            print("\n   ❌ Agent Prepare 실패!\n")
            break
    else:
        print("\n   ⚠️  타임아웃: Agent Prepare가 완료되지 않았습니다.\n")
    
    # 4. 최종 상태 확인
    print("4️⃣  최종 상태 확인\n")
    
    final_agent = bedrock_agent_client.get_agent(
        agentId=agent_id
    )['agent']
    
    print(f"   Agent: {final_agent['agentName']}")
    print(f"   상태: {final_agent['agentStatus']}")
    print(f"   준비 완료 시간: {final_agent.get('preparedAt', 'N/A')}\n")
    
    # 5. 다음 단계
    print("="*60)
    print("✅ 다음 단계")
    print("="*60 + "\n")
    
    if final_agent['agentStatus'] == 'PREPARED':
        print("Agent가 성공적으로 재배포되었습니다!\n")
        print("이제 다음을 수행하세요:")
        print("1. 1-2분 대기 (변경사항 전파)")
        print("2. 프론트엔드에서 채팅 테스트")
        print("3. python tail_lambda_logs.py 로 로그 확인\n")
    else:
        print("Agent 재배포에 문제가 있습니다.")
        print("AWS Console에서 Agent 상태를 확인하세요:\n")
        print("1. AWS Console → Amazon Bedrock")
        print("2. Agents → ShiftSync-Health-Consultant")
        print("3. 상태 및 오류 메시지 확인\n")

except Exception as e:
    print(f"❌ 오류: {e}\n")
    import traceback
    traceback.print_exc()
