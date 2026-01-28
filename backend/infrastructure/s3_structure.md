# S3 버킷 구조 설계

## 버킷 이름: redhorse-s3-frontend-0126

### 폴더 구조:
```
redhorse-s3-frontend-0126/
├── frontend/                    # 기존 프론트엔드 파일들
├── audio/                       # 오디오 파일들
│   ├── meditation/             # 명상 오디오
│   │   ├── meditation_1.mp3
│   │   ├── meditation_2.mp3
│   │   ├── meditation_3.mp3
│   │   └── meditation_4.mp3
│   └── whitenoise/             # 백색소음 오디오
│       ├── rain.mp3
│       ├── ocean.mp3
│       ├── forest.mp3
│       ├── cafe.mp3
│       └── fan.mp3
├── schedule-images/            # OCR용 근무표 이미지
│   └── uploads/               # 사용자 업로드 이미지
│       └── {user_id}/         # 사용자별 폴더
│           └── {timestamp}_{filename}
└── temp/                      # 임시 파일들
    └── ocr-processing/        # OCR 처리 중인 파일들
```

### 접근 권한:
- audio/: 공개 읽기 (CloudFront 배포)
- schedule-images/: 인증된 사용자만 업로드/읽기
- temp/: Lambda 함수만 접근