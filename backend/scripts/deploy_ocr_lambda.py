#!/usr/bin/env python3
"""
OCR Lambda 함수 배포 스크립트
ShiftSync-Vision-OCR Lambda 함수를 업데이트합니다.
"""

import os
import sys
import json
import zipfile
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
    print_info(f".env 파일 경로: {env_path}")
    
    if not env_path.exists():
        print_error(f".env 파일을 찾을 수 없습니다: {env_path}")
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
        print_error(f".env 파일을 읽을 수 없습니다")
        return
    
    for line in content.split('\n'):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            os.environ[key.strip()] = value.strip()
    
    print_success(".env 파일 로드 완료")

load_env_file()

# AWS 클라이언트
lambda_client = boto3.client('lambda', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

def create_deployment_package():
    """OCR Lambda 배포 패키지 생성"""
    print_info("OCR Lambda 배포 패키지 생성 중...")
    
    lambda_dir = Path(__file__).parent.parent / 'lambda' / 'ocr_vision'
    zip_path = Path(__file__).parent.parent / 'ocr_vision.zip'
    
    # 기존 zip 파일 삭제
    if zip_path.exists():
        zip_path.unlink()
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # lambda_function.py 추가 (handler.py 대신)
        lambda_function_path = lambda_dir / 'lambda_function.py'
        if lambda_function_path.exists():
            zipf.write(lambda_function_path, 'lambda_function.py')
            print_info(f"  ✓ lambda_function.py 추가")
        else:
            print_error(f"lambda_function.py를 찾을 수 없습니다: {lambda_function_path}")
            return None
    
    print_success(f"배포 패키지 생성 완료: {zip_path}")
    return zip_path

def deploy_ocr_lambda():
    """OCR Lambda 함수 배포"""
    print_info("OCR Lambda 함수 배포 시작...")
    
    # 배포 패키지 생성
    zip_path = create_deployment_package()
    if not zip_path:
        return False
    
    # zip 파일 읽기
    with open(zip_path, 'rb') as f:
        zip_content = f.read()
    
    # Lambda 함수 이름
    lambda_function_name = 'ShiftSync-Vision-OCR'
    
    try:
        # 기존 함수 확인
        print_info(f"Lambda 함수 확인 중: {lambda_function_name}")
        response = lambda_client.get_function(FunctionName=lambda_function_name)
        
        # 함수 코드 업데이트
        print_info(f"함수 코드 업데이트 중: {lambda_function_name}")
        
        lambda_client.update_function_code(
            FunctionName=lambda_function_name,
            ZipFile=zip_content
        )
        
        print_success(f"OCR Lambda 함수 업데이트 완료: {lambda_function_name}")
        
        # zip 파일 삭제
        zip_path.unlink()
        
        return True
        
    except lambda_client.exceptions.ResourceNotFoundException:
        print_error(f"Lambda 함수를 찾을 수 없습니다: {lambda_function_name}")
        print_info("AWS 콘솔에서 함수가 존재하는지 확인해주세요.")
        return False
        
    except Exception as e:
        print_error(f"Lambda 함수 배포 실패: {e}")
        import traceback
        print_error(traceback.format_exc())
        return False

def main():
    """메인 함수"""
    print(f"\n{Colors.BLUE}{'='*50}")
    print("🚀 OCR Lambda 함수 배포 시작")
    print(f"{'='*50}{Colors.END}\n")
    
    success = deploy_ocr_lambda()
    
    if success:
        print(f"\n{Colors.GREEN}{'='*50}")
        print("🎉 OCR Lambda 함수 배포 완료!")
        print(f"{'='*50}{Colors.END}\n")
        print_info("이제 근무표 이미지 업로드를 테스트할 수 있습니다.")
    else:
        print(f"\n{Colors.RED}{'='*50}")
        print("❌ OCR Lambda 함수 배포 실패")
        print(f"{'='*50}{Colors.END}\n")
        sys.exit(1)

if __name__ == '__main__':
    main()
