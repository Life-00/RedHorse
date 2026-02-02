/**
 * 교대 근무 유형 관련 유틸리티 함수
 * 
 * 온보딩에서 선택한 work_type을 기반으로 허용되는 shift_type을 관리합니다.
 */

export type WorkType = '2shift' | '3shift' | 'fixed_night' | 'irregular';
export type ShiftType = 'day' | 'evening' | 'night' | 'off';

/**
 * 근무 유형별 허용 교대 타입 매핑
 * 
 * - 2shift: 주간/야간 2교대 (주간, 야간, 휴무)
 * - 3shift: 주간/초저녁/야간 3교대 (주간, 초저녁, 야간, 휴무)
 * - fixed_night: 고정 야간 근무 (야간, 휴무)
 * - irregular: 불규칙 근무 (모든 타입 허용)
 */
export const WORK_TYPE_SHIFT_MAPPING: Record<WorkType, ShiftType[]> = {
  '2shift': ['day', 'night', 'off'],
  '3shift': ['day', 'evening', 'night', 'off'],
  'fixed_night': ['night', 'off'],
  'irregular': ['day', 'evening', 'night', 'off']
};

/**
 * 근무 유형에 따라 허용되는 교대 타입 반환
 * 
 * @param workType - 사용자의 근무 유형 (2shift, 3shift, fixed_night, irregular)
 * @returns 허용되는 교대 타입 배열
 * 
 * @example
 * getAllowedShiftTypes('2shift') // ['day', 'night', 'off']
 * getAllowedShiftTypes('3shift') // ['day', 'evening', 'night', 'off']
 */
export function getAllowedShiftTypes(workType: WorkType | string): ShiftType[] {
  return WORK_TYPE_SHIFT_MAPPING[workType as WorkType] || 
         WORK_TYPE_SHIFT_MAPPING.irregular;
}

/**
 * 교대 타입이 근무 유형에 맞는지 검증
 * 
 * @param workType - 사용자의 근무 유형
 * @param shiftType - 검증할 교대 타입
 * @returns 유효하면 true, 아니면 false
 * 
 * @example
 * isValidShiftType('2shift', 'day') // true
 * isValidShiftType('2shift', 'evening') // false
 */
export function isValidShiftType(workType: WorkType | string, shiftType: ShiftType): boolean {
  const allowedTypes = getAllowedShiftTypes(workType);
  return allowedTypes.includes(shiftType);
}

/**
 * 시간 문자열을 HH:MM 형식으로 포맷팅
 * 
 * DB에서 가져온 시간 데이터(HH:MM:SS 또는 HH:MM)를 
 * 사용자에게 표시하기 위한 HH:MM 형식으로 변환합니다.
 * 
 * @param timeString - 시간 문자열 (HH:MM:SS 또는 HH:MM 형식)
 * @returns HH:MM 형식의 시간 문자열, null이면 빈 문자열
 * 
 * @example
 * formatTimeToHHMM('08:00:00') // '08:00'
 * formatTimeToHHMM('14:30') // '14:30'
 * formatTimeToHHMM(null) // ''
 */
export function formatTimeToHHMM(timeString: string | null): string {
  if (!timeString) return '';
  
  // HH:MM:SS 또는 HH:MM 형식을 HH:MM으로 변환
  const parts = timeString.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  
  return timeString;
}

/**
 * 교대 타입별 한글 레이블
 */
export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  day: '주간',
  evening: '초저녁',
  night: '야간',
  off: '휴무'
};

/**
 * 교대 타입별 상세 레이블 (근무 포함)
 */
export const SHIFT_TYPE_FULL_LABELS: Record<ShiftType, string> = {
  day: '주간 근무',
  evening: '초저녁 근무',
  night: '야간 근무',
  off: '휴무'
};
