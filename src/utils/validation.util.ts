import { ValidationResult, ValidationError, ShiftSchedule } from '../types/common';
import { TimeService } from '../services/time.service';

/**
 * 검증 유틸리티
 * 입력 데이터 검증 및 비즈니스 규칙 확인
 */
export class ValidationUtil {
  /**
   * 검증 결과 생성
   */
  private static createResult(errors: ValidationError[]): ValidationResult {
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 검증 에러 생성
   */
  private static createError(
    field: string,
    rule: string,
    message: string
  ): ValidationError {
    return { field, rule, message };
  }

  /**
   * 필수 필드 검증
   */
  static validateRequired(
    value: any,
    fieldName: string,
    errors: ValidationError[]
  ): void {
    if (value === undefined || value === null || value === '') {
      errors.push(this.createError(
        fieldName,
        'required',
        `${fieldName}은(는) 필수 항목입니다`
      ));
    }
  }

  /**
   * 문자열 길이 검증
   */
  static validateStringLength(
    value: string,
    fieldName: string,
    minLength?: number,
    maxLength?: number,
    errors: ValidationError[] = []
  ): void {
    if (typeof value !== 'string') {
      errors.push(this.createError(
        fieldName,
        'type',
        `${fieldName}은(는) 문자열이어야 합니다`
      ));
      return;
    }

    if (minLength !== undefined && value.length < minLength) {
      errors.push(this.createError(
        fieldName,
        'min_length',
        `${fieldName}은(는) 최소 ${minLength}자 이상이어야 합니다`
      ));
    }

    if (maxLength !== undefined && value.length > maxLength) {
      errors.push(this.createError(
        fieldName,
        'max_length',
        `${fieldName}은(는) 최대 ${maxLength}자 이하여야 합니다`
      ));
    }
  }

  /**
   * 숫자 범위 검증
   */
  static validateNumberRange(
    value: number,
    fieldName: string,
    min?: number,
    max?: number,
    errors: ValidationError[] = []
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(this.createError(
        fieldName,
        'type',
        `${fieldName}은(는) 유효한 숫자여야 합니다`
      ));
      return;
    }

    if (min !== undefined && value < min) {
      errors.push(this.createError(
        fieldName,
        'min_value',
        `${fieldName}은(는) ${min} 이상이어야 합니다`
      ));
    }

    if (max !== undefined && value > max) {
      errors.push(this.createError(
        fieldName,
        'max_value',
        `${fieldName}은(는) ${max} 이하여야 합니다`
      ));
    }
  }

  /**
   * 이메일 형식 검증
   */
  static validateEmail(
    email: string,
    fieldName: string = 'email',
    errors: ValidationError[] = []
  ): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      errors.push(this.createError(
        fieldName,
        'email_format',
        '유효한 이메일 형식이 아닙니다'
      ));
    }
  }

  /**
   * UUID 형식 검증
   */
  static validateUUID(
    uuid: string,
    fieldName: string,
    errors: ValidationError[] = []
  ): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuid)) {
      errors.push(this.createError(
        fieldName,
        'uuid_format',
        '유효한 UUID 형식이 아닙니다'
      ));
    }
  }

  /**
   * 날짜 형식 검증 (YYYY-MM-DD)
   */
  static validateDate(
    date: string,
    fieldName: string,
    errors: ValidationError[] = []
  ): void {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!dateRegex.test(date)) {
      errors.push(this.createError(
        fieldName,
        'date_format',
        'YYYY-MM-DD 형식의 날짜여야 합니다'
      ));
      return;
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      errors.push(this.createError(
        fieldName,
        'date_invalid',
        '유효한 날짜가 아닙니다'
      ));
    }
  }

  /**
   * ISO 8601 날짜시간 형식 검증
   */
  static validateDateTime(
    dateTime: string,
    fieldName: string,
    errors: ValidationError[] = []
  ): void {
    try {
      const parsed = new Date(dateTime);
      if (isNaN(parsed.getTime())) {
        throw new Error('Invalid date');
      }

      // ISO 8601 형식 확인 (기본적인 패턴)
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$/;
      if (!iso8601Regex.test(dateTime)) {
        errors.push(this.createError(
          fieldName,
          'datetime_format',
          'ISO 8601 형식의 날짜시간이어야 합니다 (예: 2024-01-26T15:30:00+09:00)'
        ));
      }
    } catch (error) {
      errors.push(this.createError(
        fieldName,
        'datetime_invalid',
        '유효한 날짜시간이 아닙니다'
      ));
    }
  }

  /**
   * Enum 값 검증
   */
  static validateEnum<T>(
    value: T,
    allowedValues: T[],
    fieldName: string,
    errors: ValidationError[] = []
  ): void {
    if (!allowedValues.includes(value)) {
      errors.push(this.createError(
        fieldName,
        'enum_value',
        `${fieldName}은(는) 다음 값 중 하나여야 합니다: ${allowedValues.join(', ')}`
      ));
    }
  }

  /**
   * 사용자 프로필 검증
   */
  static validateUserProfile(profile: Partial<{
    shiftType: string;
    commuteMin: number;
    wearableConnected: boolean;
  }>): ValidationResult {
    const errors: ValidationError[] = [];

    // 교대 유형 검증
    if (profile.shiftType !== undefined) {
      this.validateEnum(
        profile.shiftType,
        ['TWO_SHIFT', 'THREE_SHIFT', 'FIXED_NIGHT', 'IRREGULAR'],
        'shiftType',
        errors
      );
    }

    // 통근 시간 검증
    if (profile.commuteMin !== undefined) {
      this.validateNumberRange(profile.commuteMin, 'commuteMin', 0, 240, errors);
    }

    // 웨어러블 연결 상태 검증
    if (profile.wearableConnected !== undefined && typeof profile.wearableConnected !== 'boolean') {
      errors.push(this.createError(
        'wearableConnected',
        'type',
        'wearableConnected는 boolean 값이어야 합니다'
      ));
    }

    return this.createResult(errors);
  }

  /**
   * 근무표 검증
   */
  static validateShiftSchedule(schedule: Partial<ShiftSchedule>): ValidationResult {
    const errors: ValidationError[] = [];

    // 날짜 검증
    if (schedule.date) {
      this.validateDate(schedule.date, 'date', errors);
    }

    // 근무 유형 검증
    if (schedule.shiftType) {
      this.validateEnum(
        schedule.shiftType,
        ['DAY', 'MID', 'NIGHT', 'OFF'],
        'shiftType',
        errors
      );
    }

    // OFF가 아닌 경우 시작/종료 시간 필수
    if (schedule.shiftType && schedule.shiftType !== 'OFF') {
      if (!schedule.startAt) {
        errors.push(this.createError(
          'startAt',
          'required_for_work',
          '근무일인 경우 시작 시간이 필요합니다'
        ));
      } else {
        this.validateDateTime(schedule.startAt, 'startAt', errors);
      }

      if (!schedule.endAt) {
        errors.push(this.createError(
          'endAt',
          'required_for_work',
          '근무일인 경우 종료 시간이 필요합니다'
        ));
      } else {
        this.validateDateTime(schedule.endAt, 'endAt', errors);
      }

      // 근무 시간 유효성 검증
      if (schedule.startAt && schedule.endAt && errors.length === 0) {
        const validation = TimeService.validateWorkHours(schedule.startAt, schedule.endAt);
        
        if (!validation.isValid) {
          errors.push(this.createError(
            'workHours',
            'invalid_duration',
            `근무 시간은 4시간 이상 16시간 이하여야 합니다 (현재: ${validation.hours.toFixed(1)}시간)`
          ));
        }
      }
    }

    // OFF인 경우 시작/종료 시간 없어야 함
    if (schedule.shiftType === 'OFF') {
      if (schedule.startAt) {
        errors.push(this.createError(
          'startAt',
          'not_allowed_for_off',
          '휴무일에는 시작 시간을 설정할 수 없습니다'
        ));
      }

      if (schedule.endAt) {
        errors.push(this.createError(
          'endAt',
          'not_allowed_for_off',
          '휴무일에는 종료 시간을 설정할 수 없습니다'
        ));
      }
    }

    // 통근 시간 검증
    if (schedule.commuteMin !== undefined) {
      this.validateNumberRange(schedule.commuteMin, 'commuteMin', 0, 240, errors);
    }

    // 메모 길이 검증
    if (schedule.note) {
      this.validateStringLength(schedule.note, 'note', undefined, 200, errors);
    }

    return this.createResult(errors);
  }

  /**
   * 파일 업로드 요청 검증
   */
  static validateFileUploadRequest(request: {
    fileType?: string;
    contentType?: string;
    fileSize?: number;
  }): ValidationResult {
    const errors: ValidationError[] = [];

    // 파일 타입 검증
    if (request.fileType) {
      this.validateEnum(
        request.fileType,
        ['SHIFT_SCHEDULE', 'WEARABLE_DATA', 'ATTACHMENT'],
        'fileType',
        errors
      );
    }

    // 콘텐츠 타입 검증
    if (request.contentType) {
      const allowedTypes = [
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/json',
        'application/pdf',
        'text/plain',
        'image/png',
        'image/jpeg',
        'image/jpg'
      ];

      if (!allowedTypes.includes(request.contentType)) {
        errors.push(this.createError(
          'contentType',
          'unsupported_type',
          '지원하지 않는 파일 형식입니다'
        ));
      }
    }

    // 파일 크기 검증
    if (request.fileSize !== undefined) {
      const maxSizes = {
        'SHIFT_SCHEDULE': 5 * 1024 * 1024,    // 5MB
        'WEARABLE_DATA': 2 * 1024 * 1024,     // 2MB
        'ATTACHMENT': 10 * 1024 * 1024        // 10MB
      };

      const maxSize = maxSizes[request.fileType as keyof typeof maxSizes] || 10 * 1024 * 1024;

      if (request.fileSize <= 0) {
        errors.push(this.createError(
          'fileSize',
          'invalid_size',
          '파일 크기가 유효하지 않습니다'
        ));
      } else if (request.fileSize > maxSize) {
        errors.push(this.createError(
          'fileSize',
          'too_large',
          `파일 크기가 너무 큽니다 (최대: ${Math.round(maxSize / 1024 / 1024)}MB)`
        ));
      }
    }

    return this.createResult(errors);
  }

  /**
   * 페이지네이션 매개변수 검증
   */
  static validatePaginationParams(params: {
    limit?: number;
    cursorDate?: string;
    cursorId?: string;
  }): ValidationResult {
    const errors: ValidationError[] = [];

    // 페이지 크기 검증
    if (params.limit !== undefined) {
      this.validateNumberRange(params.limit, 'limit', 1, 100, errors);
    }

    // 커서 날짜 검증
    if (params.cursorDate) {
      this.validateDate(params.cursorDate, 'cursorDate', errors);
    }

    // 커서 ID 검증
    if (params.cursorId) {
      this.validateUUID(params.cursorId, 'cursorId', errors);
    }

    // 커서 일관성 검증 (둘 다 있거나 둘 다 없어야 함)
    if ((params.cursorDate && !params.cursorId) || (!params.cursorDate && params.cursorId)) {
      errors.push(this.createError(
        'cursor',
        'incomplete_cursor',
        'cursorDate와 cursorId는 함께 제공되어야 합니다'
      ));
    }

    return this.createResult(errors);
  }

  /**
   * 날짜 범위 검증
   */
  static validateDateRange(fromDate: string, toDate: string): ValidationResult {
    const errors: ValidationError[] = [];

    // 개별 날짜 형식 검증
    this.validateDate(fromDate, 'fromDate', errors);
    this.validateDate(toDate, 'toDate', errors);

    if (errors.length === 0) {
      const from = new Date(fromDate);
      const to = new Date(toDate);

      // 시작일이 종료일보다 늦으면 안됨
      if (from > to) {
        errors.push(this.createError(
          'dateRange',
          'invalid_range',
          '시작 날짜가 종료 날짜보다 늦을 수 없습니다'
        ));
      }

      // 범위가 너무 크면 안됨 (최대 1년)
      const daysDiff = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
      if (daysDiff > 365) {
        errors.push(this.createError(
          'dateRange',
          'range_too_large',
          '날짜 범위는 최대 1년까지 가능합니다'
        ));
      }
    }

    return this.createResult(errors);
  }

  /**
   * 온보딩 요청 검증
   */
  static validateOnboardingRequest(request: {
    shiftType?: string;
    commuteMin?: number;
    wearableSettings?: {
      enabled?: boolean;
      deviceType?: string;
    };
  }): ValidationResult {
    const errors: ValidationError[] = [];

    // 필수 필드 검증
    this.validateRequired(request.shiftType, 'shiftType', errors);
    this.validateRequired(request.commuteMin, 'commuteMin', errors);

    // 프로필 검증
    const profileValidation = this.validateUserProfile({
      shiftType: request.shiftType,
      commuteMin: request.commuteMin
    });
    errors.push(...profileValidation.errors);

    // 웨어러블 설정 검증
    if (request.wearableSettings) {
      if (typeof request.wearableSettings.enabled !== 'boolean') {
        errors.push(this.createError(
          'wearableSettings.enabled',
          'type',
          'wearableSettings.enabled는 boolean 값이어야 합니다'
        ));
      }

      if (request.wearableSettings.deviceType) {
        this.validateEnum(
          request.wearableSettings.deviceType,
          ['APPLE_HEALTH', 'GOOGLE_FIT'],
          'wearableSettings.deviceType',
          errors
        );
      }
    }

    return this.createResult(errors);
  }
}