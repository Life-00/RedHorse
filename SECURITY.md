# 🔐 보안 가이드

## ⚠️ 중요한 보안 사항

### 🚨 **절대 하지 말아야 할 것들**
- ❌ AWS 액세스 키를 코드에 하드코딩
- ❌ .env 파일을 Git에 커밋
- ❌ 액세스 키를 채팅/이메일로 공유
- ❌ 공개 저장소에 자격 증명 업로드

### ✅ **올바른 보안 관리**

#### 1. 환경변수 사용
```bash
# .env 파일에 저장 (Git에 커밋하지 않음)
AWS_ACCESS_KEY_ID=YOUR_ACTUAL_ACCESS_KEY_HERE
AWS_SECRET_ACCESS_KEY=YOUR_ACTUAL_SECRET_ACCESS_KEY_HERE
```

#### 2. .gitignore 설정
```
# 환경변수 파일 제외
.env
.env.local
.env.production
```

#### 3. 배포 전 체크리스트
- [ ] .env 파일이 .gitignore에 포함되어 있는가?
- [ ] 코드에 하드코딩된 키가 없는가?
- [ ] AWS IAM 권한이 최소한으로 설정되어 있는가?

## 🛠️ **환경변수 설정 방법**

### Windows (deploy.bat)
1. `.env.example`을 복사하여 `.env` 생성
2. AWS 자격 증명 입력
3. `deploy.bat` 실행

### Linux/Mac (deploy-simple.sh)
1. `.env.example`을 복사하여 `.env` 생성
2. AWS 자격 증명 입력
3. `chmod +x deploy-simple.sh`
4. `./deploy-simple.sh` 실행

## 🔑 **AWS IAM 권한 설정**

최소 권한 원칙에 따라 다음 권한만 부여:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:CreateBucket",
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutBucketWebsite",
                "s3:PutBucketPolicy",
                "s3:PutPublicAccessBlock"
            ],
            "Resource": [
                "arn:aws:s3:::shifthealth-app-*",
                "arn:aws:s3:::shifthealth-app-*/*"
            ]
        }
    ]
}
```

## 🚨 **보안 사고 대응**

### 액세스 키가 노출된 경우:
1. **즉시 AWS 콘솔에서 키 비활성화**
2. **새로운 액세스 키 생성**
3. **노출된 키로 생성된 리소스 확인**
4. **CloudTrail 로그 확인**

### 연락처
보안 문제 발견 시 즉시 보고해주세요.

---
**⚠️ 이 가이드를 반드시 숙지하고 따라주세요!**