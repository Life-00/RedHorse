@echo off
setlocal enabledelayedexpansion

REM ShiftHealth 간단 배포 스크립트 (Windows)
echo 🚀 ShiftHealth 배포 시작...

REM .env 파일에서 환경변수 로드
if not exist .env (
    echo ❌ .env 파일이 없습니다.
    echo .env.example을 복사하여 .env 파일을 만들고 AWS 자격 증명을 입력하세요.
    pause
    exit /b 1
)

echo 📋 환경변수 로드 중...
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" (
        set "%%a=%%b"
    )
)

REM 필수 환경변수 확인
if "%AWS_ACCESS_KEY_ID%"=="" (
    echo ❌ AWS_ACCESS_KEY_ID가 설정되지 않았습니다.
    echo .env 파일에서 AWS 자격 증명을 확인하세요.
    pause
    exit /b 1
)

if "%AWS_SECRET_ACCESS_KEY%"=="" (
    echo ❌ AWS_SECRET_ACCESS_KEY가 설정되지 않았습니다.
    echo .env 파일에서 AWS 자격 증명을 확인하세요.
    pause
    exit /b 1
)

echo ✅ AWS 자격 증명 로드 완료

REM 타임스탬프로 고유한 버킷 이름 생성
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%%MM%%DD%%HH%%Min%%Sec%"

if "%S3_BUCKET_PREFIX%"=="" set S3_BUCKET_PREFIX=shifthealth-app
set BUCKET_NAME=%S3_BUCKET_PREFIX%-%timestamp%
echo 버킷 이름: %BUCKET_NAME%

REM AWS CLI 설치 확인
aws --version >nul 2>&1
if errorlevel 1 (
    echo ❌ AWS CLI가 설치되지 않았습니다.
    echo 다음 링크에서 AWS CLI를 설치하세요: https://aws.amazon.com/cli/
    pause
    exit /b 1
)

REM 1. S3 버킷 생성
echo 📦 S3 버킷 생성 중...
aws s3 mb s3://%BUCKET_NAME% --region %AWS_DEFAULT_REGION%
if errorlevel 1 (
    echo ❌ 버킷 생성 실패
    pause
    exit /b 1
)

REM 2. 정적 웹사이트 호스팅 설정
echo 🌐 정적 웹사이트 호스팅 설정 중...
aws s3 website s3://%BUCKET_NAME% --index-document index.html --error-document index.html

REM 3. 퍼블릭 액세스 허용
echo 🔓 퍼블릭 액세스 설정 중...
aws s3api put-public-access-block --bucket %BUCKET_NAME% --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

REM 4. 버킷 정책 설정
echo 📋 버킷 정책 설정 중...
(
echo {
echo     "Version": "2012-10-17",
echo     "Statement": [
echo         {
echo             "Sid": "PublicReadGetObject",
echo             "Effect": "Allow",
echo             "Principal": "*",
echo             "Action": "s3:GetObject",
echo             "Resource": "arn:aws:s3:::%BUCKET_NAME%/*"
echo         }
echo     ]
echo }
) > bucket-policy.json

aws s3api put-bucket-policy --bucket %BUCKET_NAME% --policy file://bucket-policy.json
del bucket-policy.json

REM 5. 파일 업로드
echo 📤 파일 업로드 중...
aws s3 sync build/ s3://%BUCKET_NAME% --delete

REM 6. 웹사이트 URL 출력
set WEBSITE_URL=http://%BUCKET_NAME%.s3-website-%AWS_DEFAULT_REGION%.amazonaws.com

echo.
echo ✅ 배포 완료!
echo 🌐 웹사이트 URL: %WEBSITE_URL%
echo 📊 S3 콘솔: https://s3.console.aws.amazon.com/s3/buckets/%BUCKET_NAME%
echo.

REM 브라우저에서 열기
echo 🔗 브라우저에서 열기...
start %WEBSITE_URL%

echo 배포가 완료되었습니다. 위 URL로 접속하여 앱을 확인하세요.
pause