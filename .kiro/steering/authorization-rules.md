---
inclusion: always
---

# 권한 관리 및 인증 규칙

## 인증 토큰 처리

**Cognito JWT 토큰 기반**
- 모든 API 요청은 `Authorization: Bearer <JWT>` 헤더 필수
- JWT에서 `sub` 클레임을 사용하여 사용자 식별
- 클라이언트가 전송하는 userId는 무시하고 토큰의 sub만 신뢰

```typescript
// 모든 Lambda 함수에서 공통 사용
const authService = new AuthService();
const userId = await authService.getUserIdFromToken(event.requestContext.authorizer.claims.sub);
```

## 권한 레벨 정의

**role 클레임 기반 권한 구분**
- `user`: 일반 사용자 (본인 데이터만 접근)
- `b2b_admin`: B2B 관리자 (소속 조직 익명 집계 데이터만 접근)
- `system_admin`: 시스템 관리자 (시스템 관리 기능 접근)

```typescript
interface CognitoJWTClaims {
  sub: string;           // 사용자 고유 ID
  email: string;         // 이메일
  role: 'user' | 'b2b_admin' | 'system_admin';
  orgId?: string;        // 조직 ID (B2B 사용자만)
}
```

## 리소스 소유권 체크

**"내 데이터만" 접근 원칙**
- 모든 데이터 조회/수정 시 소유권 검증 필수
- Cognito sub → user_id 매핑 후 해당 user_id로만 데이터 접근
- Cross-user access 완전 차단

```typescript
class AuthGuard {
  static async requireUser(event: APIGatewayProxyEvent): Promise<string> {
    const cognitoSub = event.requestContext.authorizer?.claims?.sub;
    if (!cognitoSub) {
      throw new UnauthorizedError('Missing authentication token');
    }

    // Cognito sub → user_id 매핑
    const userId = await authService.getUserIdFromToken(cognitoSub);
    if (!userId) {
      throw new UnauthorizedError('User not found');
    }

    return userId;
  }

  static async requireB2BAdmin(event: APIGatewayProxyEvent): Promise<{ userId: string; orgId: string }> {
    const claims = event.requestContext.authorizer?.claims;
    if (claims?.role !== 'b2b_admin') {
      throw new ForbiddenError('B2B admin role required');
    }

    const userId = await this.requireUser(event);
    const orgId = claims.orgId;
    if (!orgId) {
      throw new ForbiddenError('Organization ID required');
    }

    return { userId, orgId };
  }
}
```

## 조직별 데이터 격리

**orgId 기반 테넌시**
- B2B 사용자는 JWT의 orgId와 요청 데이터의 orgId 일치 검증
- 조직 간 데이터 접근 완전 차단
- 익명 집계 데이터도 조직별로 격리

```typescript
// B2B 통계 조회 시 권한 검증
async function getB2BStats(event: APIGatewayProxyEvent) {
  const { userId, orgId } = await AuthGuard.requireB2BAdmin(event);
  
  // 요청된 orgId와 JWT의 orgId 일치 검증
  const requestedOrgId = event.queryStringParameters?.orgId;
  if (requestedOrgId !== orgId) {
    throw new ForbiddenError('Access denied to requested organization');
  }

  // 해당 조직의 데이터만 조회
  return await b2bService.getStats(orgId);
}
```

## 공통 인증 가드 구현

**모든 Lambda 진입점에서 강제 호출**
```typescript
// 사용자 API 예시
export async function userHandler(event: APIGatewayProxyEvent) {
  const userId = await AuthGuard.requireUser(event);
  
  // 이후 모든 DB 쿼리는 이 userId만 사용
  const userProfile = await userService.getProfile(userId);
  return success(userProfile);
}

// B2B API 예시
export async function b2bHandler(event: APIGatewayProxyEvent) {
  const { userId, orgId } = await AuthGuard.requireB2BAdmin(event);
  
  // 조직별 데이터만 접근
  const stats = await b2bService.getStats(orgId);
  return success(stats);
}
```

## 데이터베이스 쿼리 패턴

**사용자 식별 표준 패턴**
```sql
-- 1. Cognito sub로 user_id 조회
SELECT user_id FROM users WHERE cognito_sub = $1;

-- 2. 해당 user_id로만 데이터 접근
SELECT * FROM shift_schedules WHERE user_id = $2;

-- 3. B2B 데이터는 orgId 추가 필터
SELECT * FROM b2b_stats_aggregates WHERE org_id = $3;
```

## 권한 에러 처리

**표준 에러 응답**
```typescript
class UnauthorizedError extends Error {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
}

class ForbiddenError extends Error {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
}

// 에러 응답 예시
{
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "해당 리소스에 접근할 권한이 없습니다"
  },
  "correlationId": "req-12345-abcde"
}
```

## 보안 체크리스트

**필수 검증 항목**
- [ ] JWT 토큰 유효성 검증
- [ ] Cognito sub → user_id 매핑 확인
- [ ] 리소스 소유권 검증 (user_id 일치)
- [ ] B2B 요청 시 orgId 일치 검증
- [ ] Cross-user access 차단 확인
- [ ] 적절한 에러 메시지 반환