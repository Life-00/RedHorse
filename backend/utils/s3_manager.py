import boto3
import os
from datetime import datetime
from typing import Optional, Dict, Any
import uuid
from botocore.exceptions import ClientError

class S3Manager:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.bucket_name = 'redhorse-s3-frontend-0126'
        self.cloudfront_domain = None  # CloudFront 도메인 설정 후 추가
    
    def upload_schedule_image(self, user_id: str, file_content: bytes, 
                            file_name: str, content_type: str = 'image/jpeg') -> Dict[str, Any]:
        """
        OCR용 근무표 이미지를 S3에 업로드
        
        Args:
            user_id: 사용자 ID
            file_content: 파일 내용 (bytes)
            file_name: 원본 파일명
            content_type: MIME 타입
            
        Returns:
            업로드 결과 정보
        """
        try:
            # 고유한 파일명 생성
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_filename = f"{timestamp}_{uuid.uuid4().hex[:8]}_{file_name}"
            
            # S3 키 생성
            s3_key = f"schedule-images/uploads/{user_id}/{unique_filename}"
            
            # S3에 업로드
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                Metadata={
                    'user_id': user_id,
                    'original_filename': file_name,
                    'upload_timestamp': timestamp
                }
            )
            
            # 업로드된 파일 URL 생성
            file_url = f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
            
            return {
                'success': True,
                's3_key': s3_key,
                'file_url': file_url,
                'unique_filename': unique_filename,
                'message': '이미지 업로드 완료'
            }
            
        except ClientError as e:
            return {
                'success': False,
                'error': str(e),
                'message': '이미지 업로드 실패'
            }
    
    def get_audio_streaming_url(self, s3_key: str) -> Optional[str]:
        """
        오디오 파일의 스트리밍 URL 생성
        
        Args:
            s3_key: S3 객체 키
            
        Returns:
            스트리밍 URL (CloudFront 또는 S3 직접 URL)
        """
        try:
            if self.cloudfront_domain:
                # CloudFront 도메인이 설정된 경우
                return f"https://{self.cloudfront_domain}/{s3_key}"
            else:
                # S3 직접 URL 사용
                return f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
                
        except Exception as e:
            print(f"URL 생성 실패: {e}")
            return None
    
    def delete_schedule_image(self, s3_key: str) -> bool:
        """
        S3에서 근무표 이미지 삭제
        
        Args:
            s3_key: 삭제할 S3 객체 키
            
        Returns:
            삭제 성공 여부
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
            
        except ClientError as e:
            print(f"파일 삭제 실패: {e}")
            return False
    
    def list_user_schedule_images(self, user_id: str) -> list:
        """
        특정 사용자의 업로드된 근무표 이미지 목록 조회
        
        Args:
            user_id: 사용자 ID
            
        Returns:
            이미지 파일 목록
        """
        try:
            prefix = f"schedule-images/uploads/{user_id}/"
            
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    files.append({
                        's3_key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'].isoformat(),
                        'file_url': f"https://{self.bucket_name}.s3.amazonaws.com/{obj['Key']}"
                    })
            
            return files
            
        except ClientError as e:
            print(f"파일 목록 조회 실패: {e}")
            return []
    
    def generate_presigned_upload_url(self, user_id: str, file_name: str, 
                                    content_type: str = 'image/jpeg', 
                                    expiration: int = 3600) -> Optional[Dict[str, Any]]:
        """
        클라이언트에서 직접 업로드할 수 있는 presigned URL 생성
        
        Args:
            user_id: 사용자 ID
            file_name: 파일명
            content_type: MIME 타입
            expiration: URL 만료 시간 (초)
            
        Returns:
            Presigned URL 정보
        """
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_filename = f"{timestamp}_{uuid.uuid4().hex[:8]}_{file_name}"
            s3_key = f"schedule-images/uploads/{user_id}/{unique_filename}"
            
            presigned_url = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key,
                    'ContentType': content_type
                },
                ExpiresIn=expiration
            )
            
            return {
                'upload_url': presigned_url,
                's3_key': s3_key,
                'unique_filename': unique_filename
            }
            
        except ClientError as e:
            print(f"Presigned URL 생성 실패: {e}")
            return None

# 사용 예시
if __name__ == "__main__":
    s3_manager = S3Manager()
    
    # 테스트용 - 실제 사용 시에는 Lambda 함수에서 호출
    print("S3Manager 초기화 완료")
    print(f"버킷명: {s3_manager.bucket_name}")