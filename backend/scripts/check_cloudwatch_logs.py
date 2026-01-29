#!/usr/bin/env python3
"""
CloudWatch Logs 확인 스크립트
AI Services Lambda의 최근 로그를 확인합니다.
"""

import boto3
import json
from datetime import datetime, timedelta

def check_logs():
    """CloudWatch Logs 확인"""
    
    logs_client = boto3.client('logs', region_name='us-east-1')
    
    # Lambda 함수 이름
    function_name = 'shift-worker-wellness-ai_services'
    log_group_name = f'/aws/lambda/{function_name}'
    
    print(f"🔍 {function_name} Lambda 로그 확인 중...\n")
    print(f"📋 Log Group: {log_group_name}\n")
    
    try:
        # 최근 10분간의 로그 조회
        start_time = int((datetime.now() - timedelta(minutes=10)).timestamp() * 1000)
        end_time = int(datetime.now().timestamp() * 1000)
        
        # 로그 스트림 목록 가져오기
        streams_response = logs_client.describe_log_streams(
            logGroupName=log_group_name,
            orderBy='LastEventTime',
            descending=True,
            limit=5
        )
        
        if not streams_response.get('logStreams'):
            print("⚠️  최근 로그 스트림이 없습니다.")
            return
        
        print(f"📊 최근 로그 스트림 {len(streams_response['logStreams'])}개 발견\n")
        
        # 각 로그 스트림에서 이벤트 가져오기
        for stream in streams_response['logStreams']:
            stream_name = stream['logStreamName']
            print(f"\n{'='*80}")
            print(f"📝 Log Stream: {stream_name}")
            print(f"{'='*80}\n")
            
            try:
                events_response = logs_client.get_log_events(
                    logGroupName=log_group_name,
                    logStreamName=stream_name,
                    startTime=start_time,
                    endTime=end_time,
                    limit=100
                )
                
                events = events_response.get('events', [])
                
                if not events:
                    print("  (이벤트 없음)\n")
                    continue
                
                # 로그 이벤트 출력
                for event in events:
                    timestamp = datetime.fromtimestamp(event['timestamp'] / 1000)
                    message = event['message'].strip()
                    
                    # 중요한 로그만 필터링
                    if any(keyword in message.lower() for keyword in [
                        'error', 'exception', 'bedrock', 'agent', 'sleep', 'caffeine',
                        'biopathway', 'fallback', 'schedule', 'start', 'end'
                    ]):
                        print(f"[{timestamp.strftime('%H:%M:%S')}] {message}")
                
                print()
                
            except Exception as e:
                print(f"  ⚠️  로그 이벤트 조회 실패: {e}\n")
        
        print(f"\n{'='*80}")
        print("✅ 로그 확인 완료")
        print(f"{'='*80}\n")
        
    except Exception as e:
        print(f"❌ 로그 조회 실패: {e}")
        print(f"\n💡 Tip: CloudWatch Logs 권한이 있는지 확인하세요.")

if __name__ == "__main__":
    check_logs()
