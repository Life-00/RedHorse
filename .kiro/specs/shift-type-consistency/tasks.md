# 교대 근무 유형 일관성 개선 - 작업 목록

## 1. 공통 유틸리티 함수 구현

- [x] 1.1 프론트엔드 유틸리티 파일 생성
  - [x] 1.1.1 `src/utils/shiftTypeUtils.ts` 파일 생성
  - [x] 1.1.2 `WORK_TYPE_SHIFT_MAPPING` 상수 정의
  - [x] 1.1.3 `getAllowedShiftTypes()` 함수 구현
  - [x] 1.1.4 `isValidShiftType()` 함수 구현
  - [x] 1.1.5 `formatTimeToHHMM()` 함수 구현

## 2. 백엔드 검증 로직 구현

- [x] 2.1 스케줄 관리 Lambda 함수 업데이트
  - [x] 2.1.1 `backend/lambda/schedule_management/handler.py`에 `WORK_TYPE_SHIFT_MAPPING` 상수 추가
  - [x] 2.1.2 `get_allowed_shift_types()` 함수 구현
  - [x] 2.1.3 `validate_shift_type()` 함수 구현
  - [x] 2.1.4 `create_schedule()` 메서드에 검증 로직 추가
  - [x] 2.1.5 `update_schedule()` 메서드에 검증 로직 추가

- [ ] 2.2 허용 교대 타입 조회 API 추가 (선택사항)
  - [ ] 2.2.1 `GET /users/{user_id}/allowed-shift-types` 엔드포인트 구현
  - [ ] 2.2.2 API Gateway 라우팅 설정

## 3. 프론트엔드: 근무표 등록 모달 개선

- [x] 3.1 ScheduleRegisterModal 컴포넌트 수정
  - [x] 3.1.1 `src/components/schedule/ScheduleRegisterModal.tsx` 파일 수정
  - [x] 3.1.2 `shiftTypeUtils`에서 `getAllowedShiftTypes` import
  - [x] 3.1.3 `availableShifts` useMemo 로직을 `getAllowedShiftTypes` 사용하도록 수정
  - [x] 3.1.4 "초저녁" 레이블을 "초저녁"으로 통일 (기존 "중간"에서 변경)
  - [x] 3.1.5 동적 그리드 레이아웃 조정 (3개 또는 4개 버튼)

## 4. 프론트엔드: 근무표 페이지 개선

- [x] 4.1 SchedulePage 컴포넌트 수정
  - [x] 4.1.1 `src/pages/schedule/SchedulePage.tsx` 파일 수정
  - [x] 4.1.2 `shiftTypeUtils`에서 `getAllowedShiftTypes` import
  - [x] 4.1.3 `legendItems` useMemo 추가하여 동적 범례 생성
  - [x] 4.1.4 범례 렌더링 부분을 `legendItems.map()`으로 수정
  - [x] 4.1.5 `cycleShift()` 함수를 work_type 기반으로 수정

## 5. 프론트엔드: 홈 화면 개선

- [x] 5.1 HomeDashboard 컴포넌트 수정
  - [x] 5.1.1 `src/pages/home/HomeDashboard.tsx` 파일 수정
  - [x] 5.1.2 `shiftTypeUtils`에서 `formatTimeToHHMM` import
  - [x] 5.1.3 `getScheduleInfo()` 함수에 시간 포맷팅 로직 추가
  - [x] 5.1.4 오늘 날짜 표시 정확성 확인
  - [x] 5.1.5 근무 타입 레이블 정확성 확인

## 6. 백엔드 배포

- [ ] 6.1 Lambda 함수 배포
  - [ ] 6.1.1 `schedule_management` Lambda 함수 배포
  - [ ] 6.1.2 CloudWatch Logs에서 배포 확인
  - [ ] 6.1.3 API Gateway 테스트

## 7. 프론트엔드 배포

- [ ] 7.1 프론트엔드 빌드 및 배포
  - [ ] 7.1.1 로컬에서 빌드 테스트 (`npm run build`)
  - [ ] 7.1.2 프로덕션 배포
  - [ ] 7.1.3 배포 후 동작 확인

## 8. 테스트

- [ ] 8.1 2교대 사용자 테스트
  - [ ] 8.1.1 온보딩에서 2교대 선택
  - [ ] 8.1.2 근무표 등록 모달에서 주간/야간/휴무만 표시 확인
  - [ ] 8.1.3 주간 근무 등록 성공 확인
  - [ ] 8.1.4 야간 근무 등록 성공 확인
  - [ ] 8.1.5 월간 달력 범례에 초저녁 미표시 확인
  - [ ] 8.1.6 홈 화면에서 오늘 근무 정보 정확성 확인

- [ ] 8.2 3교대 사용자 테스트
  - [ ] 8.2.1 온보딩에서 3교대 선택
  - [ ] 8.2.2 근무표 등록 모달에서 4가지 타입 모두 표시 확인
  - [ ] 8.2.3 모든 타입 등록 성공 확인
  - [ ] 8.2.4 월간 달력 범례에 4가지 타입 모두 표시 확인

- [ ] 8.3 고정 야간 사용자 테스트
  - [ ] 8.3.1 온보딩에서 고정 야간 선택
  - [ ] 8.3.2 근무표 등록 모달에서 야간/휴무만 표시 확인
  - [ ] 8.3.3 야간 근무 등록 성공 확인

- [ ] 8.4 홈 화면 시간 포맷팅 테스트
  - [ ] 8.4.1 DB에 "08:00:00" 형식 데이터 저장
  - [ ] 8.4.2 홈 화면에 "08:00" 형식으로 표시 확인
  - [ ] 8.4.3 야간 근무 시간 표시 확인 (예: "22:00 ~ 07:00")

- [ ] 8.5 백엔드 검증 테스트
  - [ ] 8.5.1 2교대 사용자가 evening 타입 생성 시도 → 에러 확인
  - [ ] 8.5.2 고정 야간 사용자가 day 타입 생성 시도 → 에러 확인
  - [ ] 8.5.3 에러 메시지 명확성 확인

## 9. 데이터 정리 (선택사항)

- [ ] 9.1 기존 불일치 데이터 마이그레이션
  - [ ] 9.1.1 마이그레이션 스크립트 작성
  - [ ] 9.1.2 테스트 환경에서 마이그레이션 실행
  - [ ] 9.1.3 프로덕션 데이터 백업
  - [ ] 9.1.4 프로덕션 마이그레이션 실행
  - [ ] 9.1.5 마이그레이션 결과 검증

## 10. 문서화

- [ ] 10.1 API 문서 업데이트
  - [ ] 10.1.1 스케줄 생성 API 검증 규칙 문서화
  - [ ] 10.1.2 에러 응답 예시 추가

- [ ] 10.2 사용자 가이드 업데이트 (선택사항)
  - [ ] 10.2.1 근무 유형별 사용 가능한 교대 타입 안내
  - [ ] 10.2.2 FAQ 추가

## 11. 모니터링 설정

- [ ] 11.1 CloudWatch 알림 설정
  - [ ] 11.1.1 스케줄 생성 검증 실패 알림
  - [ ] 11.1.2 에러율 임계값 설정

- [ ] 11.2 대시보드 생성
  - [ ] 11.2.1 스케줄 생성 성공/실패 메트릭
  - [ ] 11.2.2 근무 유형별 사용 통계
