#!/usr/bin/env python3
"""
프론트엔드 배포 스크립트
S3 + CloudFront에 프론트엔드를 배포합니다.
"""

import os
import sys
import json
import boto3
import subprocess
from pathlib import Path
import mimetypes

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

# AWS 클라이언트
s3_client = boto3.client('s3', region_name='us-east-1')
cloudfront_client = boto3.client('cloudfront', region_name='us-east-1')

# 설정
BUCKET_NAME = 'redhorse-s3-frontend-0126'
FRONTEND_PREFIX = ''  # 루트에 직접 업로드
AUDIO_PREFIX = 'audio/'
OCR_PREFIX = 'ocr/'

def build_frontend():
    """프론트엔드 빌드"""
    print_info("프론트엔드 빌드 중...")
    
    try:
        # npm install
        print_info("의존성 설치 중...")
        subprocess.run(['npm', 'install'], check=True, shell=True)
        
        # npm run build
        print_info("빌드 실행 중...")
        subprocess.run(['npm', 'run', 'build'], check=True, shell=True)
        
        print_success("프론트엔드 빌드 완료")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"빌드 실패: {e}")
        return False

def setup_s3_bucket():
    """S3 버킷 설정"""
    print_info(f"S3 버킷 설정 중: {BUCKET_NAME}")
    
    try:
        # 버킷 존재 확인
        try:
            s3_client.head_bucket(Bucket=BUCKET_NAME)
            print_info(f"기존 버킷 사용: {BUCKET_NAME}")
        except:
            print_error(f"버킷을 찾을 수 없습니다: {BUCKET_NAME}")
            return False
        
        # 정적 웹사이트 호스팅 설정
        website_configuration = {
            'IndexDocument': {'Suffix': 'index.html'},
            'ErrorDocument': {'Key': 'index.html'}  # SPA를 위한 설정
        }
        
        s3_client.put_bucket_website(
            Bucket=BUCKET_NAME,
            WebsiteConfiguration=website_configuration
        )
        
        # CORS 설정
        cors_configuration = {
            'CORSRules': [{
                'AllowedHeaders': ['*'],
                'AllowedMethods': ['GET', 'HEAD'],
                'AllowedOrigins': ['*'],
                'MaxAgeSeconds': 3000
            }]
        }
        
        s3_client.put_bucket_cors(
            Bucket=BUCKET_NAME,
            CORSConfiguration=cors_configuration
        )
        
        print_success("S3 버킷 설정 완료")
        return True
        
    except Exception as e:
        print_error(f"S3 버킷 설정 실패: {e}")
        return False

def upload_to_s3(local_path, s3_key):
    """파일을 S3에 업로드"""
    # Path 객체를 문자열로 변환
    local_path_str = str(local_path)
    
    # MIME 타입 결정
    content_type, _ = mimetypes.guess_type(local_path_str)
    
    # JavaScript 파일 MIME 타입 명시적 설정
    if local_path_str.endswith('.js'):
        content_type = 'application/javascript'
    elif local_path_str.endswith('.mjs'):
        content_type = 'application/javascript'
    elif local_path_str.endswith('.css'):
        content_type = 'text/css'
    elif local_path_str.endswith('.html'):
        content_type = 'text/html'
    elif local_path_str.endswith('.json'):
        content_type = 'application/json'
    elif local_path_str.endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico')):
        if content_type is None:
            content_type = 'image/' + local_path_str.split('.')[-1]
    elif content_type is None:
        content_type = 'application/octet-stream'
    
    extra_args = {
        'ContentType': content_type
    }
    
    # HTML, CSS, JS 파일은 캐시 제어 추가
    if local_path_str.endswith(('.html', '.css', '.js')):
        extra_args['CacheControl'] = 'max-age=31536000' if not local_path_str.endswith('.html') else 'no-cache'
    
    s3_client.upload_file(
        local_path_str,
        BUCKET_NAME,
        s3_key,
        ExtraArgs=extra_args
    )

def upload_frontend_files():
    """프론트엔드 파일 업로드"""
    print_info("프론트엔드 파일 업로드 중...")
    
    dist_dir = Path('dist')
    if not dist_dir.exists():
        print_error("dist 디렉토리를 찾을 수 없습니다. 빌드를 먼저 실행하세요.")
        return False
    
    uploaded_count = 0
    
    for file_path in dist_dir.rglob('*'):
        if file_path.is_file():
            relative_path = file_path.relative_to(dist_dir)
            s3_key = f"{FRONTEND_PREFIX}{relative_path}".replace('\\', '/')
            
            try:
                upload_to_s3(file_path, s3_key)
                uploaded_count += 1
                
                if uploaded_count % 10 == 0:
                    print_info(f"{uploaded_count}개 파일 업로드 완료...")
                    
            except Exception as e:
                print_error(f"파일 업로드 실패 ({file_path}): {e}")
    
    print_success(f"총 {uploaded_count}개 파일 업로드 완료")
    return True

def create_or_get_cloudfront_distribution():
    """CloudFront 배포 생성 또는 가져오기"""
    print_info("CloudFront 배포 확인 중...")
    
    try:
        # 기존 배포 확인
        distributions = cloudfront_client.list_distributions()
        
        if 'DistributionList' in distributions and 'Items' in distributions['DistributionList']:
            for dist in distributions['DistributionList']['Items']:
                if BUCKET_NAME in dist['Origins']['Items'][0]['DomainName']:
                    print_info(f"기존 CloudFront 배포 사용: {dist['Id']}")
                    return dist['Id'], dist['DomainName']
        
        # 새 배포 생성
        print_info("새 CloudFront 배포 생성 중...")
        
        origin_domain = f"{BUCKET_NAME}.s3-website-us-east-1.amazonaws.com"
        
        distribution_config = {
            'CallerReference': str(hash(BUCKET_NAME)),
            'Comment': 'Shift Worker Wellness App Distribution',
            'Enabled': True,
            'Origins': {
                'Quantity': 1,
                'Items': [{
                    'Id': f'{BUCKET_NAME}-origin',
                    'DomainName': origin_domain,
                    'CustomOriginConfig': {
                        'HTTPPort': 80,
                        'HTTPSPort': 443,
                        'OriginProtocolPolicy': 'http-only'
                    }
                }]
            },
            'DefaultRootObject': 'index.html',
            'DefaultCacheBehavior': {
                'TargetOriginId': f'{BUCKET_NAME}-origin',
                'ViewerProtocolPolicy': 'redirect-to-https',
                'AllowedMethods': {
                    'Quantity': 2,
                    'Items': ['GET', 'HEAD'],
                    'CachedMethods': {
                        'Quantity': 2,
                        'Items': ['GET', 'HEAD']
                    }
                },
                'ForwardedValues': {
                    'QueryString': False,
                    'Cookies': {'Forward': 'none'}
                },
                'MinTTL': 0,
                'DefaultTTL': 86400,
                'MaxTTL': 31536000,
                'Compress': True
            },
            'CustomErrorResponses': {
                'Quantity': 1,
                'Items': [{
                    'ErrorCode': 404,
                    'ResponsePagePath': '/index.html',
                    'ResponseCode': '200',
                    'ErrorCachingMinTTL': 300
                }]
            },
            'PriceClass': 'PriceClass_100'
        }
        
        response = cloudfront_client.create_distribution(
            DistributionConfig=distribution_config
        )
        
        distribution_id = response['Distribution']['Id']
        domain_name = response['Distribution']['DomainName']
        
        print_success(f"CloudFront 배포 생성 완료: {distribution_id}")
        print_warning("배포가 활성화되기까지 15-20분 정도 소요됩니다.")
        
        return distribution_id, domain_name
        
    except Exception as e:
        print_error(f"CloudFront 배포 생성 실패: {e}")
        return None, None

def invalidate_cloudfront_cache(distribution_id):
    """CloudFront 캐시 무효화"""
    if not distribution_id:
        return
    
    print_info("CloudFront 캐시 무효화 중...")
    
    try:
        cloudfront_client.create_invalidation(
            DistributionId=distribution_id,
            InvalidationBatch={
                'Paths': {
                    'Quantity': 1,
                    'Items': ['/*']
                },
                'CallerReference': str(hash(f'{distribution_id}-{os.urandom(8).hex()}'))
            }
        )
        
        print_success("CloudFront 캐시 무효화 완료")
    except Exception as e:
        print_error(f"캐시 무효화 실패: {e}")

def main():
    """메인 함수"""
    print(f"\n{Colors.BLUE}{'='*50}")
    print("🚀 프론트엔드 배포 시작")
    print(f"{'='*50}{Colors.END}\n")
    
    try:
        # 1. 프론트엔드 빌드
        if not build_frontend():
            sys.exit(1)
        
        # 2. S3 버킷 설정
        if not setup_s3_bucket():
            sys.exit(1)
        
        # 3. 파일 업로드
        if not upload_frontend_files():
            sys.exit(1)
        
        # 4. CloudFront 배포
        distribution_id, domain_name = create_or_get_cloudfront_distribution()
        
        # 5. 캐시 무효화
        if distribution_id:
            invalidate_cloudfront_cache(distribution_id)
        
        print(f"\n{Colors.GREEN}{'='*50}")
        print("🎉 프론트엔드 배포 완료!")
        print(f"{'='*50}{Colors.END}\n")
        
        print_info("배포 정보:")
        print(f"  S3 버킷: {BUCKET_NAME}")
        print(f"  S3 웹사이트 URL: http://{BUCKET_NAME}.s3-website-us-east-1.amazonaws.com/{FRONTEND_PREFIX}index.html")
        
        if domain_name:
            print(f"  CloudFront URL: https://{domain_name}")
            print_warning("CloudFront 배포가 완전히 활성화되기까지 15-20분 소요됩니다.")
        
        print(f"\n{Colors.YELLOW}S3 폴더 구조:{Colors.END}")
        print(f"  - {FRONTEND_PREFIX} : 프론트엔드 정적 파일")
        print(f"  - {AUDIO_PREFIX} : 오디오 파일 (명상, 백색소음)")
        print(f"  - {OCR_PREFIX} : OCR 처리된 스케줄 이미지\n")
        
    except Exception as e:
        print_error(f"배포 실패: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
