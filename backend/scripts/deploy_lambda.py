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
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

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
        return response['Role']['Arn']
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
        
        print_success(f"IAM 역할 생성 완료: {role_arn}")
        
        # 역할이 전파될 때까지 대기
        import time
        print_info("IAM 역할 전파 대기 중 (10초)...")
        time.sleep(10)
        
        return role_arn

def get_vpc_config():
    """VPC 설정 가져오기"""
    try:
        # 기본 VPC 가져오기
        vpcs = ec2_client.describe_vpcs(Filters=[{'Name': 'is-default', 'Values': ['true']}])
        if not vpcs['Vpcs']:
            print_warning("기본 VPC를 찾을 수 없습니다. VPC 없이 배포합니다.")
            return None
        
        vpc_id = vpcs['Vpcs'][0]['VpcId']
        
        # 서브넷 가져오기
        subnets = ec2_client.describe_subnets(Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}])
        subnet_ids = [subnet['SubnetId'] for subnet in subnets['Subnets']]
        
        # 보안 그룹 가져오기
        security_group_id = os.environ.get('RDS_SECURITY_GROUP_ID')
        if not security_group_id:
            print_warning("RDS_SECURITY_GROUP_ID가 설정되지 않았습니다. VPC 없이 배포합니다.")
            return None
        
        return {
            'SubnetIds': subnet_ids[:2],  # 최소 2개 필요
            'SecurityGroupIds': [security_group_id]
        }
    except Exception as e:
        print_warning(f"VPC 설정 가져오기 실패: {e}. VPC 없이 배포합니다.")
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
            'S3_BUCKET_NAME': os.environ.get('S3_BUCKET_NAME', 'redhorse-s3-frontend-0126')
        }
    }
    
    try:
        # 기존 함수 확인
        try:
            lambda_client.get_function(FunctionName=lambda_function_name)
            
            # 함수 코드만 업데이트 (설정은 변경하지 않음)
            print_info(f"기존 함수 코드 업데이트 중: {lambda_function_name}")
            
            lambda_client.update_function_code(
                FunctionName=lambda_function_name,
                ZipFile=zip_content
            )
            
            print_success(f"Lambda 함수 코드 업데이트 완료: {lambda_function_name}")
            
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
                'Timeout': 30,
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
