#!/usr/bin/env python3
"""
Lambda 함수 배포 스크립트
모든 Lambda 함수를 AWS에 배포합니다.
"""

import os
import sys
import json
import zipfile
import boto3
import subprocess
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

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.END}")

# 환경 변수 로드
def load_env_file():
    env_path = Path(__file__).parent.parent / '.env'
    print_info(f".env 파일 경로: {env_path}")
    
    if not env_path.exists():
        print_warning(f".env 파일을 찾을 수 없습니다: {env_path}")
        return
    
    loaded_vars = []
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                # 값의 앞뒤 공백 제거
                value = value.strip()
                os.environ[key] = value
                loaded_vars.append(key)
    
    print_success(f".env 파일에서 {len(loaded_vars)}개 환경 변수 로드 완료")
    
    # 중요 변수 확인
    important_vars = ['DB_HOST', 'RDS_SECURITY_GROUP_ID', 'BEDROCK_AGENT_ID']
    for var in important_vars:
        value = os.environ.get(var)
        if value:
            print_info(f"  ✓ {var}: {value[:20]}..." if len(value) > 20 else f"  ✓ {var}: {value}")
        else:
            print_warning(f"  ✗ {var}: 설정되지 않음")

load_env_file()

# AWS 클라이언트
lambda_client = boto3.client('lambda', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
iam_client = boto3.client('iam', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
ec2_client = boto3.client('ec2', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

# Lambda 함수 목록
LAMBDA_FUNCTIONS = [
    'user_management',
    'schedule_management',
    'ai_services',
    'fatigue_assessment',
    'jumpstart',
    'wellness'
]

def get_or_create_lambda_role():
    """Lambda 실행 역할 생성 또는 가져오기"""
    role_name = 'shift-worker-wellness-lambda-role'
    
    try:
        response = iam_client.get_role(RoleName=role_name)
        print_info(f"기존 IAM 역할 사용: {role_name}")
        role_arn = response['Role']['Arn']
        
        # 기존 역할에 Bedrock 권한이 있는지 확인하고 없으면 추가
        try:
            iam_client.get_role_policy(RoleName=role_name, PolicyName='BedrockAgentAccess')
            print_info("Bedrock Agent 권한이 이미 있습니다.")
        except iam_client.exceptions.NoSuchEntityException:
            print_info("Bedrock Agent 권한 추가 중...")
            bedrock_policy = {
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
                    }
                ]
            }
            
            iam_client.put_role_policy(
                RoleName=role_name,
                PolicyName='BedrockAgentAccess',
                PolicyDocument=json.dumps(bedrock_policy)
            )
            print_success("Bedrock Agent 권한 추가 완료")
        
        return role_arn
        
    except iam_client.exceptions.NoSuchEntityException:
        print_info(f"IAM 역할 생성 중: {role_name}")
        
        # 신뢰 정책
        trust_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "lambda.amazonaws.com"},
                    "Action": "sts:AssumeRole"
                }
            ]
        }
        
        # 역할 생성
        response = iam_client.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(trust_policy),
            Description='Execution role for shift worker wellness Lambda functions'
        )
        
        role_arn = response['Role']['Arn']
        
        # 정책 연결
        policies = [
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
            'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
            'arn:aws:iam::aws:policy/AmazonS3FullAccess',
            'arn:aws:iam::aws:policy/AmazonRDSFullAccess'
        ]
        
        for policy_arn in policies:
            iam_client.attach_role_policy(
                RoleName=role_name,
                PolicyArn=policy_arn
            )
        
        # Bedrock Agent 인라인 정책 추가
        bedrock_policy = {
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
                }
            ]
        }
        
        iam_client.put_role_policy(
            RoleName=role_name,
            PolicyName='BedrockAgentAccess',
            PolicyDocument=json.dumps(bedrock_policy)
        )
        
        print_success(f"IAM 역할 생성 완료: {role_arn}")
        
        # 역할이 전파될 때까지 대기
        import time
        print_info("IAM 역할 전파 대기 중 (10초)...")
        time.sleep(10)
        
        return role_arn

def get_vpc_config():
    """VPC 설정 가져오기"""
    try:
        # Lambda 보안 그룹 ID 확인 (RDS 보안 그룹이 아님!)
        security_group_id = os.environ.get('LAMBDA_SECURITY_GROUP_ID')
        if not security_group_id:
            # 폴백: RDS_SECURITY_GROUP_ID 사용 (하위 호환성)
            security_group_id = os.environ.get('RDS_SECURITY_GROUP_ID')
            if not security_group_id:
                print_warning("LAMBDA_SECURITY_GROUP_ID가 설정되지 않았습니다. VPC 없이 배포합니다.")
                return None
            print_warning("⚠️  RDS_SECURITY_GROUP_ID를 사용 중입니다. LAMBDA_SECURITY_GROUP_ID를 설정하세요.")
        
        print_info(f"Lambda 보안 그룹 ID: {security_group_id}")
        
        # 보안 그룹에서 VPC ID 가져오기
        sg_response = ec2_client.describe_security_groups(GroupIds=[security_group_id])
        if not sg_response['SecurityGroups']:
            print_warning(f"보안 그룹을 찾을 수 없습니다: {security_group_id}")
            return None
        
        vpc_id = sg_response['SecurityGroups'][0]['VpcId']
        print_info(f"VPC ID: {vpc_id}")
        
        # VPC의 서브넷 가져오기 (PRIVATE 서브넷 우선)
        subnets_response = ec2_client.describe_subnets(
            Filters=[
                {'Name': 'vpc-id', 'Values': [vpc_id]},
                {'Name': 'state', 'Values': ['available']}
            ]
        )
        
        if not subnets_response['Subnets']:
            print_warning(f"VPC {vpc_id}에서 사용 가능한 서브넷을 찾을 수 없습니다.")
            return None
        
        # 서브넷 정보 출력
        all_subnets = subnets_response['Subnets']
        print_info(f"사용 가능한 서브넷 {len(all_subnets)}개 발견:")
        
        # PRIVATE 서브넷 우선 선택 (이름에 'private' 포함 또는 Type 태그)
        private_subnets = []
        public_subnets = []
        
        for subnet in all_subnets:
            subnet_id = subnet['SubnetId']
            subnet_name = ''
            subnet_type = ''
            
            for tag in subnet.get('Tags', []):
                if tag['Key'] == 'Name':
                    subnet_name = tag['Value']
                elif tag['Key'] == 'Type':
                    subnet_type = tag['Value']
            
            az = subnet['AvailabilityZone']
            print_info(f"  - {subnet_id} ({subnet_name}) Type={subnet_type} in {az}")
            
            # Type 태그가 Private이거나 이름에 private가 포함된 경우
            if subnet_type.lower() == 'private' or 'private' in subnet_name.lower():
                private_subnets.append(subnet_id)
            else:
                public_subnets.append(subnet_id)
        
        # PRIVATE 서브넷이 있으면 사용, 없으면 PUBLIC 서브넷 사용
        selected_subnets = private_subnets if private_subnets else public_subnets
        
        if len(selected_subnets) < 2:
            # 서브넷이 2개 미만이면 모든 서브넷 사용
            selected_subnets = [s['SubnetId'] for s in all_subnets]
        
        # 최소 2개 서브넷 필요 (다른 AZ에 있어야 함)
        if len(selected_subnets) < 2:
            print_warning(f"최소 2개의 서브넷이 필요합니다. 현재: {len(selected_subnets)}개")
            return None
        
        subnet_type = "PRIVATE" if private_subnets else "PUBLIC"
        print_success(f"{subnet_type} 서브넷 {len(selected_subnets[:2])}개 선택: {selected_subnets[:2]}")
        
        vpc_config = {
            'SubnetIds': selected_subnets[:2],
            'SecurityGroupIds': [security_group_id]
        }
        
        print_success(f"VPC 설정 완료: VPC {vpc_id}")
        return vpc_config
        
    except Exception as e:
        print_warning(f"VPC 설정 가져오기 실패: {e}. VPC 없이 배포합니다.")
        import traceback
        print_warning(traceback.format_exc())
        return None

def create_deployment_package(function_name):
    """Lambda 배포 패키지 생성"""
    print_info(f"배포 패키지 생성 중: {function_name}")
    
    lambda_dir = Path(__file__).parent.parent / 'lambda' / function_name
    utils_dir = Path(__file__).parent.parent / 'utils'
    zip_path = Path(__file__).parent.parent / f'{function_name}.zip'
    
    # 기존 zip 파일 삭제
    if zip_path.exists():
        zip_path.unlink()
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # handler.py 추가
        handler_path = lambda_dir / 'handler.py'
        if handler_path.exists():
            zipf.write(handler_path, 'handler.py')
        
        # utils 디렉토리 추가
        if utils_dir.exists():
            for file in utils_dir.glob('*.py'):
                if file.name != '__pycache__':
                    zipf.write(file, f'utils/{file.name}')
        
        # requirements.txt가 있으면 의존성 설치
        requirements_path = lambda_dir / 'requirements.txt'
        if requirements_path.exists():
            print_info(f"의존성 설치 중: {function_name}")
            
            # 임시 디렉토리에 패키지 설치
            temp_dir = Path(__file__).parent.parent / 'temp_packages'
            temp_dir.mkdir(exist_ok=True)
            
            # Windows에서 psycopg2-binary 빌드 문제 해결
            # --only-binary 옵션 사용
            subprocess.run([
                sys.executable, '-m', 'pip', 'install',
                '-r', str(requirements_path),
                '-t', str(temp_dir),
                '--only-binary', ':all:',
                '--platform', 'manylinux2014_x86_64',
                '--python-version', '311',
                '--implementation', 'cp',
                '--abi', 'cp311',
                '--quiet'
            ], check=True)
            
            # 설치된 패키지를 zip에 추가
            for root, dirs, files in os.walk(temp_dir):
                # __pycache__ 제외
                dirs[:] = [d for d in dirs if d != '__pycache__']
                
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(temp_dir)
                    zipf.write(file_path, arcname)
            
            # 임시 디렉토리 삭제
            import shutil
            shutil.rmtree(temp_dir)
    
    print_success(f"배포 패키지 생성 완료: {zip_path}")
    return zip_path

def deploy_lambda_function(function_name, role_arn, vpc_config):
    """Lambda 함수 배포"""
    print_info(f"Lambda 함수 배포 중: {function_name}")
    
    # 배포 패키지 생성
    zip_path = create_deployment_package(function_name)
    
    # zip 파일 읽기
    with open(zip_path, 'rb') as f:
        zip_content = f.read()
    
    # Lambda 함수 이름
    lambda_function_name = f'shift-worker-wellness-{function_name}'
    
    # 환경 변수 설정
    environment = {
        'Variables': {
            'DB_HOST': os.environ.get('DB_HOST', ''),
            'DB_PORT': os.environ.get('DB_PORT', '5432'),
            'DB_NAME': os.environ.get('DB_NAME', 'rhythm_fairy'),
            'DB_USER': os.environ.get('DB_USER', 'postgres'),
            'DB_PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'APP_REGION': os.environ.get('AWS_REGION', 'us-east-1'),  # AWS_REGION 대신 APP_REGION 사용
            'S3_BUCKET_NAME': os.environ.get('S3_BUCKET_NAME', 'redhorse-s3-frontend-0126'),
            'BEDROCK_AGENT_ID': os.environ.get('BEDROCK_AGENT_ID', ''),
            'BEDROCK_AGENT_ALIAS_ID': os.environ.get('BEDROCK_AGENT_ALIAS_ID', ''),
            'BEDROCK_REGION': os.environ.get('BEDROCK_REGION', 'us-east-1')
        }
    }
    
    try:
        # 기존 함수 확인
        try:
            response = lambda_client.get_function(FunctionName=lambda_function_name)
            
            # 함수 코드만 업데이트
            print_info(f"기존 함수 코드 업데이트 중: {lambda_function_name}")
            
            lambda_client.update_function_code(
                FunctionName=lambda_function_name,
                ZipFile=zip_content
            )
            
            # 환경 변수와 VPC 설정 업데이트 (별도 호출)
            print_info(f"함수 설정 업데이트 중: {lambda_function_name}")
            
            # 함수가 Active 상태가 될 때까지 대기
            import time
            max_wait = 60  # 최대 60초 대기
            wait_interval = 5
            elapsed = 0
            
            while elapsed < max_wait:
                try:
                    response = lambda_client.get_function(FunctionName=lambda_function_name)
                    state = response['Configuration']['State']
                    last_update_status = response['Configuration']['LastUpdateStatus']
                    
                    if state == 'Active' and last_update_status == 'Successful':
                        break
                    
                    print_info(f"함수 상태: {state}, 업데이트 상태: {last_update_status}. {wait_interval}초 대기 중...")
                    time.sleep(wait_interval)
                    elapsed += wait_interval
                except Exception as e:
                    print_warning(f"상태 확인 오류: {e}")
                    time.sleep(wait_interval)
                    elapsed += wait_interval
            
            update_params = {
                'FunctionName': lambda_function_name,
                'Environment': environment,
                'Timeout': 120,  # Bedrock Agent 응답 대기 시간 (120초)
                'MemorySize': 512
            }
            
            # VPC 설정 추가 (있는 경우)
            if vpc_config:
                update_params['VpcConfig'] = vpc_config
            
            lambda_client.update_function_configuration(**update_params)
            
            print_success(f"Lambda 함수 업데이트 완료: {lambda_function_name}")
            
        except lambda_client.exceptions.ResourceNotFoundException:
            # 새 함수 생성
            print_info(f"새 함수 생성 중: {lambda_function_name}")
            
            create_params = {
                'FunctionName': lambda_function_name,
                'Runtime': 'python3.11',
                'Role': role_arn,
                'Handler': 'handler.lambda_handler',
                'Code': {'ZipFile': zip_content},
                'Environment': environment,
                'Timeout': 120,  # Bedrock Agent 응답 대기 시간 (120초)
                'MemorySize': 512,
                'Publish': True
            }
            
            # VPC 설정 추가 (있는 경우)
            if vpc_config:
                create_params['VpcConfig'] = vpc_config
            
            lambda_client.create_function(**create_params)
            
            print_success(f"Lambda 함수 생성 완료: {lambda_function_name}")
        
        # zip 파일 삭제
        zip_path.unlink()
        
        return lambda_function_name
        
    except Exception as e:
        print_error(f"Lambda 함수 배포 실패: {e}")
        raise

def main():
    """메인 함수"""
    print(f"\n{Colors.BLUE}{'='*50}")
    print("🚀 Lambda 함수 배포 시작")
    print(f"{'='*50}{Colors.END}\n")
    
    try:
        # IAM 역할 생성/가져오기
        role_arn = get_or_create_lambda_role()
        
        # VPC 설정 가져오기
        vpc_config = get_vpc_config()
        
        # 각 Lambda 함수 배포
        deployed_functions = []
        for function_name in LAMBDA_FUNCTIONS:
            try:
                lambda_function_name = deploy_lambda_function(function_name, role_arn, vpc_config)
                deployed_functions.append(lambda_function_name)
            except Exception as e:
                print_error(f"{function_name} 배포 실패: {e}")
                continue
        
        print(f"\n{Colors.GREEN}{'='*50}")
        print("🎉 Lambda 함수 배포 완료!")
        print(f"{'='*50}{Colors.END}\n")
        
        print_info("배포된 함수 목록:")
        for func in deployed_functions:
            print(f"  - {func}")
        
        print(f"\n{Colors.YELLOW}다음 단계:{Colors.END}")
        print("1. API Gateway 설정")
        print("2. Lambda 함수와 API Gateway 연결")
        print("3. 프론트엔드 환경 변수에 API Gateway URL 설정\n")
        
    except Exception as e:
        print_error(f"배포 실패: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
