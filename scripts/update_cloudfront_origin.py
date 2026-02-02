#!/usr/bin/env python3
"""
CloudFront Origin Path 업데이트 스크립트
Origin Path를 /frontend로 설정하여 루트 URL로 앱 접근 가능하게 함
"""

import boto3
import json
import time

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
cloudfront_client = boto3.client('cloudfront', region_name='us-east-1')

# 설정
BUCKET_NAME = 'redhorse-s3-frontend-0126'
DISTRIBUTION_ID = 'E2Q1463DCOE70L'

def update_cloudfront_origin_path():
    """CloudFront Origin Path를 /frontend로 업데이트"""
    try:
        print_info(f"CloudFront 배포 설정 가져오는 중: {DISTRIBUTION_ID}")
        
        # 현재 배포 설정 가져오기
        response = cloudfront_client.get_distribution_config(Id=DISTRIBUTION_ID)
        config = response['DistributionConfig']
        etag = response['ETag']
        
        print_info(f"현재 Origin Path: {config['Origins']['Items'][0].get('OriginPath', '(없음)')}")
        
        # Origin Path 업데이트 (빈 문자열로 설정하여 S3 루트를 가리킴)
        config['Origins']['Items'][0]['OriginPath'] = ''
        
        print_info("CloudFront 배포 설정 업데이트 중...")
        
        # 배포 설정 업데이트
        update_response = cloudfront_client.update_distribution(
            Id=DISTRIBUTION_ID,
            DistributionConfig=config,
            IfMatch=etag
        )
        
        print_success(f"Origin Path가 빈 문자열(S3 루트)로 업데이트되었습니다")
        print_info(f"배포 상태: {update_response['Distribution']['Status']}")
        
        # 캐시 무효화
        print_info("CloudFront 캐시 무효화 중...")
        
        invalidation_response = cloudfront_client.create_invalidation(
            DistributionId=DISTRIBUTION_ID,
            InvalidationBatch={
                'Paths': {
                    'Quantity': 1,
                    'Items': ['/*']
                },
                'CallerReference': str(time.time())
            }
        )
        
        print_success("CloudFront 캐시 무효화 완료")
        print_warning("변경사항이 완전히 적용되기까지 5-10분 소요됩니다")
        
        return True
        
    except Exception as e:
        print_error(f"CloudFront 업데이트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """메인 함수"""
    print(f"\n{Colors.BLUE}{'='*50}")
    print("🔧 CloudFront Origin Path 업데이트")
    print(f"{'='*50}{Colors.END}\n")
    
    try:
        if update_cloudfront_origin_path():
            print(f"\n{Colors.GREEN}{'='*50}")
            print("🎉 CloudFront 설정 업데이트 완료!")
            print(f"{'='*50}{Colors.END}\n")
            
            print_info("이제 다음 URL로 앱에 접근할 수 있습니다:")
            print(f"  CloudFront: https://d3q7g22jyyymgd.cloudfront.net/")
            print(f"  (이전: https://d3q7g22jyyymgd.cloudfront.net/frontend/index.html)")
            print()
            print_warning("변경사항이 완전히 적용되기까지 5-10분 정도 기다려주세요")
        else:
            print_error("CloudFront 설정 업데이트 실패")
            return 1
            
    except Exception as e:
        print_error(f"오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())
