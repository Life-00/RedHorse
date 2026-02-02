#!/usr/bin/env python3
"""
전체 배포 스크립트
백엔드(Lambda + API Gateway) + 프론트엔드(S3 + CloudFront)를 한 번에 배포합니다.
"""

import os
import sys
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

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.END}")

def print_step(step, title):
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"단계 {step}: {title}")
    print(f"{'='*60}{Colors.END}\n")

def run_script(script_path, description):
    """스크립트 실행"""
    print_info(f"{description} 실행 중...")
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            check=True,
            capture_output=False
        )
        print_success(f"{description} 완료")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"{description} 실패: {e}")
        return False

def main():
    """메인 함수"""
    print(f"\n{Colors.BLUE}{'='*60}")
    print("🚀 전체 배포 시작")
    print("   백엔드 (Lambda + API Gateway)")
    print("   프론트엔드 (S3 + CloudFront)")
    print(f"{'='*60}{Colors.END}\n")
    
    # 스크립트 경로
    backend_dir = Path(__file__).parent.parent / 'backend' / 'scripts'
    frontend_dir = Path(__file__).parent
    
    deploy_lambda_script = backend_dir / 'deploy_lambda.py'
    setup_api_gateway_script = backend_dir / 'setup_api_gateway.py'
    deploy_frontend_script = frontend_dir / 'deploy_frontend.py'
    
    try:
        # 1. Lambda 함수 배포
        print_step(1, "Lambda 함수 배포")
        if not run_script(deploy_lambda_script, "Lambda 배포"):
            print_error("Lambda 배포 실패. 배포를 중단합니다.")
            sys.exit(1)
        
        # 2. API Gateway 설정
        print_step(2, "API Gateway 설정")
        if not run_script(setup_api_gateway_script, "API Gateway 설정"):
            print_error("API Gateway 설정 실패. 배포를 중단합니다.")
            sys.exit(1)
        
        # 3. API Gateway URL 가져오기
        print_step(3, "프론트엔드 환경 변수 업데이트")
        
        # backend/.env에서 API Gateway URL 읽기
        env_path = backend_dir.parent / '.env'
        api_gateway_url = None
        
        if env_path.exists():
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.startswith('API_GATEWAY_URL='):
                        api_gateway_url = line.split('=', 1)[1].strip()
                        break
        
        if api_gateway_url:
            print_info(f"API Gateway URL: {api_gateway_url}")
            
            # .env.local 업데이트
            env_local_path = Path(__file__).parent.parent / '.env.local'
            
            # 기존 내용 읽기
            env_content = []
            if env_local_path.exists():
                with open(env_local_path, 'r', encoding='utf-8') as f:
                    env_content = f.readlines()
            
            # VITE_API_BASE_URL 업데이트 또는 추가
            updated = False
            for i, line in enumerate(env_content):
                if line.startswith('VITE_API_BASE_URL='):
                    env_content[i] = f'VITE_API_BASE_URL={api_gateway_url}\n'
                    updated = True
                    break
            
            if not updated:
                env_content.append(f'\n# API Gateway URL\n')
                env_content.append(f'VITE_API_BASE_URL={api_gateway_url}\n')
            
            # 파일 쓰기
            with open(env_local_path, 'w', encoding='utf-8') as f:
                f.writelines(env_content)
            
            print_success(".env.local 파일 업데이트 완료")
        else:
            print_error("API Gateway URL을 찾을 수 없습니다.")
        
        # 4. 프론트엔드 배포
        print_step(4, "프론트엔드 배포")
        if not run_script(deploy_frontend_script, "프론트엔드 배포"):
            print_error("프론트엔드 배포 실패.")
            sys.exit(1)
        
        # 완료
        print(f"\n{Colors.GREEN}{'='*60}")
        print("🎉 전체 배포 완료!")
        print(f"{'='*60}{Colors.END}\n")
        
        print_info("배포 정보:")
        if api_gateway_url:
            print(f"  백엔드 API: {api_gateway_url}")
        print(f"  프론트엔드: CloudFront URL 확인 (위 로그 참조)")
        
        print(f"\n{Colors.YELLOW}다음 단계:{Colors.END}")
        print("1. CloudFront 배포가 완전히 활성화될 때까지 대기 (15-20분)")
        print("2. CloudFront URL로 접속하여 앱 테스트")
        print("3. 오디오 파일을 S3의 audio/ 폴더에 업로드\n")
        
    except Exception as e:
        print_error(f"배포 실패: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
