/**
 * 시간 처리 서비스
 * 내부 계산: UTC epoch 기반
 * 외부 출력: KST ISO 8601 (+09:00) 형식
 * 
 * 설계 원칙:
 * - 모든 내부 계산은 UTC epoch (Date 객체) 사용
 * - 데이터베이스 저장은 TIMESTAMPTZ 타입으로 ISO 8601 그대로 저장
 * - 최종 출력만 KST로 변환하여 ISO 8601 (+09:00) 형식 반환
 */
export class TimeService {
  private static readonly KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 9시간을 밀리초로

  /**
   * 현재 시간을 KST ISO 8601 형식으로 반환
   * @returns KST ISO 8601 문자열 (예: "2024-01-26T15:30:00+09:00")
   */
  static nowKST(): string {
    return this.formatToKST(new Date());
  }

  /**
   * UTC Date 객체를 KST ISO 8601 형식으로 변환
   * @param date UTC Date 객체
   * @returns KST ISO 8601 문자열
   */
  static formatToKST(date: Date): string {
    // Intl.DateTimeFormat을 사용한 안전한 시간대 변환
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    const second = parts.find(p => p.type === 'second')?.value;
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
  }

  /**
   * KST ISO 8601 문자열을 UTC Date 객체로 변환
   * @param kstString KST ISO 8601 문자열
   * @returns UTC Date 객체
   */
  static parseFromKST(kstString: string): Date {
    // ISO 8601 문자열을 Date 객체로 변환 (자동으로 UTC로 처리됨)
    return new Date(kstString);
  }

  /**
   * 날짜 문자열을 YYYY-MM-DD 형식으로 반환 (KST 기준)
   * @param date UTC Date 객체 (선택적, 기본값: 현재 시간)
   * @returns YYYY-MM-DD 형식 문자열
   */
  static formatDateKST(date?: Date): string {
    const targetDate = date || new Date();
    const kstString = this.formatToKST(targetDate);
    return kstString.split('T')[0]; // YYYY-MM-DD 부분만 추출
  }

  /**
   * 시간 더하기 (내부 계산용)
   * @param date 기준 Date 객체
   * @param hours 더할 시간 수
   * @returns 새로운 Date 객체
   */
  static addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  /**
   * 시간 빼기 (내부 계산용)
   * @param date 기준 Date 객체
   * @param hours 뺄 시간 수
   * @returns 새로운 Date 객체
   */
  static subtractHours(date: Date, hours: number): Date {
    return new Date(date.getTime() - hours * 60 * 60 * 1000);
  }

  /**
   * 분 더하기 (내부 계산용)
   * @param date 기준 Date 객체
   * @param minutes 더할 분 수
   * @returns 새로운 Date 객체
   */
  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  /**
   * 분 빼기 (내부 계산용)
   * @param date 기준 Date 객체
   * @param minutes 뺄 분 수
   * @returns 새로운 Date 객체
   */
  static subtractMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() - minutes * 60 * 1000);
  }

  /**
   * 일 더하기 (내부 계산용)
   * @param date 기준 Date 객체
   * @param days 더할 일 수
   * @returns 새로운 Date 객체
   */
  static addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * 일 빼기 (내부 계산용)
   * @param date 기준 Date 객체
   * @param days 뺄 일 수
   * @returns 새로운 Date 객체
   */
  static subtractDays(date: Date, days: number): Date {
    return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
  }

  /**
   * 두 시간 사이의 차이 계산 (시간 단위)
   * @param startDate 시작 시간
   * @param endDate 종료 시간
   * @returns 시간 차이 (시간 단위)
   */
  static getHoursDifference(startDate: Date, endDate: Date): number {
    return (endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000);
  }

  /**
   * 두 시간 사이의 차이 계산 (분 단위)
   * @param startDate 시작 시간
   * @param endDate 종료 시간
   * @returns 시간 차이 (분 단위)
   */
  static getMinutesDifference(startDate: Date, endDate: Date): number {
    return (endDate.getTime() - startDate.getTime()) / (60 * 1000);
  }

  /**
   * 특정 날짜의 시작 시간 (00:00:00) 반환 (KST 기준)
   * @param date 기준 날짜 (YYYY-MM-DD 형식 또는 Date 객체)
   * @returns 해당 날짜 00:00:00 KST의 UTC Date 객체
   */
  static getStartOfDayKST(date: string | Date): Date {
    let dateStr: string;
    
    if (date instanceof Date) {
      dateStr = this.formatDateKST(date);
    } else {
      dateStr = date;
    }
    
    // KST 기준 00:00:00으로 설정
    return this.parseFromKST(`${dateStr}T00:00:00+09:00`);
  }

  /**
   * 특정 날짜의 종료 시간 (23:59:59) 반환 (KST 기준)
   * @param date 기준 날짜 (YYYY-MM-DD 형식 또는 Date 객체)
   * @returns 해당 날짜 23:59:59 KST의 UTC Date 객체
   */
  static getEndOfDayKST(date: string | Date): Date {
    let dateStr: string;
    
    if (date instanceof Date) {
      dateStr = this.formatDateKST(date);
    } else {
      dateStr = date;
    }
    
    // KST 기준 23:59:59으로 설정
    return this.parseFromKST(`${dateStr}T23:59:59+09:00`);
  }

  /**
   * 배치 작업용 날짜 계산 (실행 시점 기준)
   * EventBridge 스케줄러에서 사용
   * @returns 오늘과 내일 날짜 (KST 기준)
   */
  static getBatchDates(): { today: string; tomorrow: string } {
    const now = new Date();
    const today = this.formatDateKST(now);
    const tomorrow = this.formatDateKST(this.addDays(now, 1));
    
    return { today, tomorrow };
  }

  /**
   * 근무 시간 유효성 검증
   * @param startAt 시작 시간 (ISO 8601)
   * @param endAt 종료 시간 (ISO 8601)
   * @returns 유효성 검증 결과
   */
  static validateWorkHours(startAt: string, endAt: string): {
    isValid: boolean;
    hours: number;
    crossesDate: boolean;
  } {
    const start = this.parseFromKST(startAt);
    const end = this.parseFromKST(endAt);
    
    // 야간 근무 (날짜 넘어가는 경우) 처리
    let actualEnd = end;
    if (end <= start) {
      // 다음날로 간주
      actualEnd = this.addDays(end, 1);
    }
    
    const hours = this.getHoursDifference(start, actualEnd);
    const crossesDate = end <= start;
    
    return {
      isValid: hours >= 4 && hours <= 16, // 4-16시간 제한
      hours,
      crossesDate
    };
  }

  /**
   * 시간대별 근무 유형 판단
   * @param startAt 시작 시간 (ISO 8601)
   * @returns 근무 유형 추정
   */
  static inferShiftType(startAt: string): 'DAY' | 'MID' | 'NIGHT' {
    const start = this.parseFromKST(startAt);
    const kstHour = parseInt(this.formatToKST(start).split('T')[1].split(':')[0]);
    
    if (kstHour >= 6 && kstHour < 14) {
      return 'DAY';   // 06:00-13:59
    } else if (kstHour >= 14 && kstHour < 22) {
      return 'MID';   // 14:00-21:59
    } else {
      return 'NIGHT'; // 22:00-05:59
    }
  }

  /**
   * 수면창 겹침 검증
   * @param sleep1Start 수면창1 시작
   * @param sleep1End 수면창1 종료
   * @param sleep2Start 수면창2 시작
   * @param sleep2End 수면창2 종료
   * @returns 겹침 여부
   */
  static checkSleepOverlap(
    sleep1Start: Date,
    sleep1End: Date,
    sleep2Start: Date,
    sleep2End: Date
  ): boolean {
    return sleep1Start < sleep2End && sleep2Start < sleep1End;
  }

  /**
   * 캐시 TTL 계산 (48시간 후 만료)
   * @param baseTime 기준 시간 (선택적, 기본값: 현재 시간)
   * @returns 만료 시간 (UTC Date 객체)
   */
  static calculateCacheTTL(baseTime?: Date): Date {
    const base = baseTime || new Date();
    return this.addHours(base, 48); // ADR-003: 48시간 TTL
  }

  /**
   * 활성 사용자 기준 시간 계산 (7일 전)
   * @param baseTime 기준 시간 (선택적, 기본값: 현재 시간)
   * @returns 7일 전 시간 (UTC Date 객체)
   */
  static getActiveUserThreshold(baseTime?: Date): Date {
    const base = baseTime || new Date();
    return this.subtractDays(base, 7); // ADR-009: 7일 기준
  }

  /**
   * 시간 범위 생성 (날짜 범위 조회용)
   * @param fromDate 시작 날짜 (YYYY-MM-DD)
   * @param toDate 종료 날짜 (YYYY-MM-DD)
   * @returns 시작/종료 UTC Date 객체
   */
  static createDateRange(fromDate: string, toDate: string): {
    start: Date;
    end: Date;
  } {
    return {
      start: this.getStartOfDayKST(fromDate),
      end: this.getEndOfDayKST(toDate)
    };
  }

  /**
   * 현재 시간이 특정 시간 범위 내에 있는지 확인
   * @param startTime 시작 시간 (HH:MM 형식, KST)
   * @param endTime 종료 시간 (HH:MM 형식, KST)
   * @param currentTime 현재 시간 (선택적, 기본값: 현재 시간)
   * @returns 범위 내 여부
   */
  static isWithinTimeRange(
    startTime: string,
    endTime: string,
    currentTime?: Date
  ): boolean {
    const now = currentTime || new Date();
    const nowKST = this.formatToKST(now);
    const currentHourMin = nowKST.split('T')[1].substring(0, 5); // HH:MM
    
    // 시간 비교 (24시간 형식)
    if (startTime <= endTime) {
      // 같은 날 범위 (예: 09:00-17:00)
      return currentHourMin >= startTime && currentHourMin <= endTime;
    } else {
      // 날짜 넘어가는 범위 (예: 22:00-06:00)
      return currentHourMin >= startTime || currentHourMin <= endTime;
    }
  }

  /**
   * 디버그용 시간 정보 출력
   * @param date UTC Date 객체
   * @returns 시간 정보 객체
   */
  static getTimeInfo(date: Date): {
    utc: string;
    kst: string;
    epoch: number;
    dateKST: string;
  } {
    return {
      utc: date.toISOString(),
      kst: this.formatToKST(date),
      epoch: date.getTime(),
      dateKST: this.formatDateKST(date)
    };
  }
}