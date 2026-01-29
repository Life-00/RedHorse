#!/usr/bin/env python3
"""
NAT Gateway 생성 스크립트
Lambda가 VPC 내부에서 인터넷(Bedrock, S3 등)에 접근할 수 있도록 NAT Gateway를 생성합니다.

비용: 약 $32/월 (시간당 $0.045 + 데이터 전송 비용)
"""

import boto3
import time
import sys
from pathlib import Path

# 환경 변수 로드
def load_env_file():
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        import os
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

load_env_file()

import os

# AWS 클라이언트
region = os.environ.get('AWS_REGION', 'us-east-1')
ec2_client = boto3.client('ec2', region_name=region)

print("\n" + "="*60)
print("🚀 NAT Gateway 생성 스크립트")
print("="*60 + "\n")

print(f"📍 Region: {region}")
print(f"💰 예상 비용: 약 $32/월 (시간당 $0.045 + 데이터 전송)\n")

# 1. VPC 정보 확인
print("1️⃣  VPC 정보 확인")
print("-" * 60)

try:
    # 기본 VPC 가져오기
    vpcs = ec2_client.describe_vpcs(
        Filters=[{'Name': 'is-default', 'Values': ['true']}]
    )
    
    if not vpcs['Vpcs']:
        print("❌ 기본 VPC를 찾을 수 없습니다.")
        sys.exit(1)
    
    vpc = vpcs['Vpcs'][0]
    vpc_id = vpc['VpcId']
    
    print(f"✅ VPC ID: {vpc_id}")
    print(f"   CIDR: {vpc['CidrBlock']}\n")
    
except Exception as e:
    print(f"❌ 오류: {e}")
    sys.exit(1)

# 2. Public 서브넷 찾기
print("2️⃣  Public 서브넷 찾기")
print("-" * 60)

try:
    # 모든 서브넷 가져오기
    subnets = ec2_client.describe_subnets(
        Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
    )
    
    # Public 서브넷 찾기 (MapPublicIpOnLaunch가 true인 서브넷)
    public_subnets = []
    for subnet in subnets['Subnets']:
        if subnet.get('MapPublicIpOnLaunch', False):
            public_subnets.append(subnet)
    
    if not public_subnets:
        print("⚠️  MapPublicIpOnLaunch가 true인 서브넷이 없습니다.")
        print("   첫 번째 서브넷을 사용합니다.\n")
        public_subnet = subnets['Subnets'][0]
    else:
        public_subnet = public_subnets[0]
    
    subnet_id = public_subnet['SubnetId']
    availability_zone = public_subnet['AvailabilityZone']
    
    print(f"✅ Public 서브넷: {subnet_id}")
    print(f"   가용 영역: {availability_zone}")
    print(f"   CIDR: {public_subnet['CidrBlock']}\n")
    
except Exception as e:
    print(f"❌ 오류: {e}")
    sys.exit(1)

# 3. Elastic IP 할당
print("3️⃣  Elastic IP 할당")
print("-" * 60)

try:
    # 기존 NAT Gateway용 EIP 확인
    existing_eips = ec2_client.describe_addresses(
        Filters=[
            {'Name': 'domain', 'Values': ['vpc']},
            {'Name': 'tag:Purpose', 'Values': ['NAT-Gateway']}
        ]
    )
    
    if existing_eips['Addresses']:
        eip = existing_eips['Addresses'][0]
        allocation_id = eip['AllocationId']
        public_ip = eip.get('PublicIp', 'N/A')
        print(f"✅ 기존 Elastic IP 사용: {allocation_id}")
        print(f"   Public IP: {public_ip}\n")
    else:
        # 새 EIP 할당
        eip_response = ec2_client.allocate_address(
            Domain='vpc',
            TagSpecifications=[
                {
                    'ResourceType': 'elastic-ip',
                    'Tags': [
                        {'Key': 'Name', 'Value': 'NAT-Gateway-EIP'},
                        {'Key': 'Purpose', 'Value': 'NAT-Gateway'},
                        {'Key': 'Project', 'Value': 'shift-worker-wellness'}
                    ]
                }
            ]
        )
        
        allocation_id = eip_response['AllocationId']
        public_ip = eip_response['PublicIp']
        
        print(f"✅ Elastic IP 할당 완료: {allocation_id}")
        print(f"   Public IP: {public_ip}\n")

except Exception as e:
    print(f"❌ 오류: {e}")
    sys.exit(1)

# 4. NAT Gateway 생성
print("4️⃣  NAT Gateway 생성")
print("-" * 60)

try:
    # 기존 NAT Gateway 확인
    existing_nat = ec2_client.describe_nat_gateways(
        Filters=[
            {'Name': 'vpc-id', 'Values': [vpc_id]},
            {'Name': 'state', 'Values': ['pending', 'available']}
        ]
    )
    
    if existing_nat['NatGateways']:
        nat_gateway = existing_nat['NatGateways'][0]
        nat_gateway_id = nat_gateway['NatGatewayId']
        state = nat_gateway['State']
        
        print(f"✅ 기존 NAT Gateway 발견: {nat_gateway_id}")
        print(f"   상태: {state}")
        
        if state == 'pending':
            print(f"   ⏳ NAT Gateway가 생성 중입니다. 잠시 기다려주세요...\n")
        else:
            print(f"   ✅ NAT Gateway가 이미 사용 가능합니다.\n")
    else:
        # NAT Gateway 생성
        nat_response = ec2_client.create_nat_gateway(
            SubnetId=subnet_id,
            AllocationId=allocation_id,
            TagSpecifications=[
                {
                    'ResourceType': 'natgateway',
                    'Tags': [
                        {'Key': 'Name', 'Value': 'shift-worker-wellness-nat'},
                        {'Key': 'Project', 'Value': 'shift-worker-wellness'}
                    ]
                }
            ]
        )
        
        nat_gateway_id = nat_response['NatGateway']['NatGatewayId']
        
        print(f"✅ NAT Gateway 생성 요청 완료: {nat_gateway_id}")
        print(f"   ⏳ NAT Gateway가 생성 중입니다 (약 2-3분 소요)...\n")

except Exception as e:
    print(f"❌ 오류: {e}")
    sys.exit(1)

# 5. NAT Gateway 상태 확인 (사용 가능할 때까지 대기)
print("5️⃣  NAT Gateway 상태 확인")
print("-" * 60)

try:
    max_attempts = 20
    attempt = 0
    
    while attempt < max_attempts:
        nat_status = ec2_client.describe_nat_gateways(
            NatGatewayIds=[nat_gateway_id]
        )
        
        state = nat_status['NatGateways'][0]['State']
        
        if state == 'available':
            print(f"✅ NAT Gateway가 사용 가능합니다!\n")
            break
        elif state == 'failed':
            print(f"❌ NAT Gateway 생성에 실패했습니다.")
            sys.exit(1)
        else:
            attempt += 1
            print(f"⏳ 상태: {state} ({attempt}/{max_attempts}) - 10초 후 재확인...")
            time.sleep(10)
    
    if attempt >= max_attempts:
        print(f"⚠️  타임아웃: NAT Gateway가 아직 준비되지 않았습니다.")
        print(f"   나중에 다시 확인해주세요: {nat_gateway_id}\n")

except Exception as e:
    print(f"❌ 오류: {e}")
    sys.exit(1)

# 6. Private 서브넷의 라우트 테이블 업데이트
print("6️⃣  라우트 테이블 업데이트")
print("-" * 60)

try:
    # Lambda가 사용하는 서브넷 찾기
    lambda_client = boto3.client('lambda', region_name=region)
    
    try:
        lambda_config = lambda_client.get_function(
            FunctionName='shift-worker-wellness-ai_services'
        )
        lambda_subnet_ids = lambda_config['Configuration']['VpcConfig']['SubnetIds']
        
        print(f"Lambda 서브넷: {', '.join(lambda_subnet_ids)}\n")
        
        # 각 서브넷의 라우트 테이블 찾기 및 업데이트
        for subnet_id in lambda_subnet_ids:
            # 서브넷과 연결된 라우트 테이블 찾기
            route_tables = ec2_client.describe_route_tables(
                Filters=[
                    {'Name': 'association.subnet-id', 'Values': [subnet_id]}
                ]
            )
            
            if not route_tables['RouteTables']:
                # 명시적 연결이 없으면 메인 라우트 테이블 사용
                route_tables = ec2_client.describe_route_tables(
                    Filters=[
                        {'Name': 'vpc-id', 'Values': [vpc_id]},
                        {'Name': 'association.main', 'Values': ['true']}
                    ]
                )
            
            if route_tables['RouteTables']:
                route_table = route_tables['RouteTables'][0]
                route_table_id = route_table['RouteTableId']
                
                # 0.0.0.0/0 라우트 확인
                has_nat_route = False
                for route in route_table.get('Routes', []):
                    if route.get('DestinationCidrBlock') == '0.0.0.0/0':
                        if 'NatGatewayId' in route:
                            print(f"✅ 서브넷 {subnet_id}: NAT Gateway 라우트 이미 존재")
                            has_nat_route = True
                        elif 'GatewayId' in route and route['GatewayId'].startswith('igw-'):
                            print(f"⚠️  서브넷 {subnet_id}: Internet Gateway 라우트 존재")
                            print(f"   → NAT Gateway 라우트로 교체합니다...")
                            
                            # 기존 IGW 라우트 삭제
                            try:
                                ec2_client.delete_route(
                                    RouteTableId=route_table_id,
                                    DestinationCidrBlock='0.0.0.0/0'
                                )
                                print(f"   ✅ 기존 라우트 삭제 완료")
                            except Exception as e:
                                print(f"   ⚠️  라우트 삭제 실패: {e}")
                
                # NAT Gateway 라우트 추가
                if not has_nat_route:
                    try:
                        ec2_client.create_route(
                            RouteTableId=route_table_id,
                            DestinationCidrBlock='0.0.0.0/0',
                            NatGatewayId=nat_gateway_id
                        )
                        print(f"✅ 서브넷 {subnet_id}: NAT Gateway 라우트 추가 완료")
                        print(f"   라우트 테이블: {route_table_id}")
                    except Exception as e:
                        print(f"❌ 라우트 추가 실패: {e}")
                
                print()
    
    except lambda_client.exceptions.ResourceNotFoundException:
        print("⚠️  Lambda 함수를 찾을 수 없습니다.")
        print("   Lambda 배포 후 라우트 테이블을 수동으로 업데이트해주세요.\n")

except Exception as e:
    print(f"❌ 오류: {e}\n")

# 최종 요약
print("\n" + "="*60)
print("🎉 NAT Gateway 설정 완료!")
print("="*60 + "\n")

print(f"✅ NAT Gateway ID: {nat_gateway_id}")
print(f"✅ Elastic IP: {public_ip}")
print(f"✅ VPC: {vpc_id}")
print(f"✅ 서브넷: {subnet_id}\n")

print("📊 다음 단계:")
print("1. Lambda 함수 재배포:")
print("   cd backend")
print("   python scripts/deploy_lambda.py")
print()
print("2. 챗봇 테스트:")
print("   프론트엔드에서 챗봇 기능 테스트")
print()
print("3. 비용 모니터링:")
print("   AWS Cost Explorer에서 NAT Gateway 비용 확인")
print()

print("💡 참고:")
print("- NAT Gateway 비용: 약 $32/월")
print("- 삭제 방법: AWS Console > VPC > NAT Gateways")
print("- Elastic IP도 함께 릴리스해야 추가 비용 없음")
print()
