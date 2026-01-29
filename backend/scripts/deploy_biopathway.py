#!/usr/bin/env python3
"""
BioPathway Calculator Lambda 배포 스크립트
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
    
    if not env_path.exists():
        print_warning(f".env 파일을 찾을 수 없습니다: {env_path}")
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
        print_warning(f".env 파일을 읽을 수 없습니다")
        return
    
    for line in content.split('\n'):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            os.environ[key.strip()] = value.strip()
    
    print_success(f".env 파일 로드 완료")

load_env_file()

# AWS 클라이언트
lambda_client = boto3.client('lambda', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
iam_client = boto3.client('iam', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
ec2_client = boto3.client('ec2', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

def get_or_create_lambda_role():
    """Lambda 실행 역할 가져오기"""
    role_name = 'shift-worker-wellness-lambda-role'
    
    try:
        response = iam_client.get_role(RoleName=role_name)
        print_info(f"기존 IAM 역할 사용: {role_name}")
        return response['Role']['Arn']
    except iam_client.exceptions.NoSuchEntityException:
        print_error(f"IAM 역할을 찾을 수 없습니다: {role_name}")
        print_info("먼저 deploy_lambda.py를 실행하여 IAM 역할을 생성하세요.")
        sys.exit(1)

def get_vpc_config():
    """VPC 설정 가져오기"""
    try:
        security_group_id = os.environ.get('LAMBDA_SECURITY_GROUP_ID')
        if not security_group_id:
            security_group_id = os.environ.get('RDS_SECURITY_GROUP_ID')
        
        if not security_group_id:
            print_warning("보안 그룹 ID가 설정되지 않았습니다. VPC 없이 배포합니다.")
            return None
        
        # 보안 그룹에서 VPC ID 가져오기
        sg_response = ec2_client.describe_security_groups(GroupIds=[security_group_id])
        vpc_id = sg_response['SecurityGroups'][0]['VpcId']
        
        # VPC의 서브넷 가져오기
        subnets_response = ec2_client.describe_subnets(
            Filters=[
                {'Name': 'vpc-id', 'Values': [vpc_id]},
                {'Name': 'state', 'Values': ['available']}
            ]
        )
        
        # PRIVATE 서브넷 우선 선택
        private_subnets = []
        for subnet in subnets_response['Subnets']:
            for tag in subnet.get('Tags', []):
                if tag['Key'] == 'Type' and tag['Value'].lower() == 'private':
                    private_subnets.append(subnet['SubnetId'])
                    break
        
        selected_subnets = private_subnets if private_subnets else [s['SubnetId'] for s in subnets_response['Subnets']]
        
        vpc_config = {
            'SubnetIds': selected_subnets[:2],
            'SecurityGroupIds': [security_group_id]
        }
        
        print_success(f"VPC 설정 완료: VPC {vpc_id}, 서브넷 {len(selected_subnets[:2])}개")
        return vpc_config
        
    except Exception as e:
        print_warning(f"VPC 설정 가져오기 실패: {e}")
        return None

def create_deployment_package():
    """Lambda 배포 패키지 생성"""
    print_info("배포 패키지 생성 중: biopathway_calculator")
    
    lambda_dir = Path(__file__).parent.parent / 'lambda' / 'biopathway_calculator'
    zip_path = Path(__file__).parent.parent / 'biopathway_calculator.zip'
    
    # 기존 zip 파일 삭제
    if zip_path.exists():
        zip_path.unlink()
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # lambda_function.py 추가
        lambda_function_path = lambda_dir / 'lambda_function.py'
        if lambda_function_path.exists():
            zipf.write(lambda_function_path, 'lambda_function.py')
        else:
            print_error(f"lambda_function.py를 찾을 수 없습니다: {lambda_function_path}")
            sys.exit(1)
        
        # requirements.txt 처리
        requirements_path = lambda_dir / 'requirements.txt'
        if requirements_path.exists():
            print_info("의존성 설치 중...")
            
            # 임시 디렉토리에 패키지 설치
            temp_dir = Path(__file__).parent.parent / 'temp_packages_bio'
            temp_dir.mkdir(exist_ok=True)
            
            # psycopg2-binary를 Lambda용으로 설치 (Linux x86_64)
            result = subprocess.run([
                sys.executable, '-m', 'pip', 'install',
                '-r', str(requirements_path),
                '-t', str(temp_dir),
                '--platform', 'manylinux2014_x86_64',
                '--python-version', '3.11',
                '--implementation', 'cp',
                '--only-binary', ':all:',
                '--upgrade'
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                print_warning(f"pip install failed: {result.stderr}")
                print_info("Trying alternative method...")
                # Fallback: install without platform specification
                subprocess.run([
                    sys.executable, '-m', 'pip', 'install',
                    '-r', str(requirements_path),
                    '-t', str(temp_dir),
                    '--upgrade'
                ], check=True)
            
            # 설치된 패키지를 zip에 추가
            for root, dirs, files in os.walk(temp_dir):
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

def deploy_lambda():
    """Lambda 함수 배포"""
    print_info("Lambda 함수 배포 중: ShiftSync_BioPathway_Calculator")
    
    # 배포 패키지 생성
    zip_path = create_deployment_package()
    
    # zip 파일 읽기
    with open(zip_path, 'rb') as f:
        zip_content = f.read()
    
    # Lambda 함수 이름
    lambda_function_name = 'ShiftSync_BioPathway_Calculator'
    
    # 환경 변수 설정
    environment = {
        'Variables': {
            'DB_HOST': os.environ.get('DB_HOST', ''),
            'DB_PORT': os.environ.get('DB_PORT', '5432'),
            'DB_NAME': os.environ.get('DB_NAME', 'rhythm_fairy'),
            'DB_USER': os.environ.get('DB_USER', 'postgres'),
            'DB_PASSWORD': os.environ.get('DB_PASSWORD', ''),
        }
    }
    
    # IAM 역할 가져오기
    role_arn = get_or_create_lambda_role()
    
    # VPC 설정 가져오기
    vpc_config = get_vpc_config()
    
    try:
        # 기존 함수 확인
        try:
            lambda_client.get_function(FunctionName=lambda_function_name)
            
            # 함수 코드 업데이트
            print_info(f"기존 함수 코드 업데이트 중...")
            lambda_client.update_function_code(
                FunctionName=lambda_function_name,
                ZipFile=zip_content
            )
            
            # 함수가 Active 상태가 될 때까지 대기
            import time
            print_info("함수 업데이트 대기 중...")
            time.sleep(10)
            
            # 환경 변수와 VPC 설정 업데이트
            print_info(f"함수 설정 업데이트 중...")
            update_params = {
                'FunctionName': lambda_function_name,
                'Environment': environment,
                'Timeout': 60,
                'MemorySize': 256
            }
            
            # VPC 설정 업데이트
            if vpc_config:
                update_params['VpcConfig'] = vpc_config
                print_info(f"VPC 설정 업데이트: {vpc_config}")
            
            lambda_client.update_function_configuration(**update_params)
            
            print_success(f"Lambda 함수 업데이트 완료: {lambda_function_name}")
            
        except lambda_client.exceptions.ResourceNotFoundException:
            # 새 함수 생성
            print_info(f"새 함수 생성 중...")
            
            create_params = {
                'FunctionName': lambda_function_name,
                'Runtime': 'python3.11',
                'Role': role_arn,
                'Handler': 'lambda_function.lambda_handler',
                'Code': {'ZipFile': zip_content},
                'Environment': environment,
                'Timeout': 60,
                'MemorySize': 256,
                'Publish': True
            }
            
            if vpc_config:
                create_params['VpcConfig'] = vpc_config
            
            lambda_client.create_function(**create_params)
            
            print_success(f"Lambda 함수 생성 완료: {lambda_function_name}")
        
        # zip 파일 삭제
        zip_path.unlink()
        
        return lambda_function_name
        
    except Exception as e:
        print_error(f"Lambda 함수 배포 실패: {e}")
        import traceback
        print_error(traceback.format_exc())
        sys.exit(1)

def main():
    """메인 함수"""
    print(f"\n{Colors.BLUE}{'='*60}")
    print("🚀 BioPathway Calculator Lambda 배포")
    print(f"{'='*60}{Colors.END}\n")
    
    try:
        lambda_function_name = deploy_lambda()
        
        print(f"\n{Colors.GREEN}{'='*60}")
        print("🎉 배포 완료!")
        print(f"{'='*60}{Colors.END}\n")
        
        print_info(f"Lambda 함수: {lambda_function_name}")
        print_info("Bedrock Agent에서 이 Lambda를 Action Group에 연결하세요.")
        
    except Exception as e:
        print_error(f"배포 실패: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
