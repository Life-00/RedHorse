# Design Document: Bedrock Agent Integration

## Overview

This design document specifies the technical architecture for integrating AWS Bedrock Agent (ShiftSync-Bio-Coach) with the frontend application to provide AI-powered sleep and caffeine recommendations. The system will connect existing frontend API calls through the AI_Services_Lambda to invoke a Bedrock Agent, which in turn calls the BioPathway_Calculator Lambda to retrieve real user schedule data from RDS and apply biorhythm-based recommendation rules.

## Architecture

### System Components

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │ POST /users/{user_id}/sleep-plan
       │ POST /users/{user_id}/caffeine-plan
       ↓
┌──────────────────────┐
│  AI_Services_Lambda  │
│  (Python 3.x)        │
│  - generateSleepPlan │
│  - generateCaffeine  │
└──────┬───────────────┘
       │ invoke_agent()
       ↓
┌─────────────────────────┐
│   Bedrock Agent         │
│   ShiftSync-Bio-Coach   │
│   Agent ID: 1XOE4OAMLR  │
│   Alias: VXOUCFXA2P     │
└──────┬──────────────────┘
       │ get_daily_biorhythm(user_id, target_date)
       ↓
┌──────────────────────────────┐
│  BioPathway_Calculator       │
│  Lambda (Python 3.x)         │
│  - Query RDS schedules       │
│  - Apply BIO_RULES           │
└──────┬───────────────────────┘
       │ SQL Query
       ↓
┌──────────────────┐
│   RDS PostgreSQL │
│   schedules table│
└──────────────────┘
```

### Data Flow

**Sleep Plan Generation:**
1. Frontend calls `aiApi.generateSleepPlan(userId, targetDate)`
2. AI_Services_Lambda receives POST request
3. Lambda invokes Bedrock Agent with prompt: "오늘/내일의 최적 수면 시간을 알려주세요"
4. Bedrock Agent calls `get_daily_biorhythm` function
5. BioPathway_Calculator queries RDS for user schedule
6. BioPathway_Calculator applies BIO_RULES based on shift_type
7. Response flows back through the chain to frontend

**Caffeine Plan Generation:**
1. Frontend calls `aiApi.generateCaffeinePlan(userId, targetDate)`
2. AI_Services_Lambda receives POST request
3. Lambda invokes Bedrock Agent with prompt: "오늘/내일의 카페인 섭취 마감 시간을 알려주세요"
4. Same flow as sleep plan, but extracts coffee_time from response

## Components and Interfaces

### 1. AI_Services_Lambda Handler

**File:** `backend/lambda/ai_services/handler.py`

**Functions:**

```python
def generate_sleep_plan(event, context):
    """
    Generate sleep plan by invoking Bedrock Agent
    
    Args:
        event: API Gateway event with user_id and target_date
        context: Lambda context
        
    Returns:
        API Gateway response with sleep plan data
    """
    pass

def generate_caffeine_plan(event, context):
    """
    Generate caffeine plan by invoking Bedrock Agent
    
    Args:
        event: API Gateway event with user_id and target_date
        context: Lambda context
        
    Returns:
        API Gateway response with caffeine plan data
    """
    pass

def invoke_bedrock_agent(user_id: str, target_date: str, prompt: str) -> dict:
    """
    Invoke Bedrock Agent with specified prompt
    
    Args:
        user_id: User identifier
        target_date: Date for recommendations (YYYY-MM-DD)
        prompt: Korean prompt for agent
        
    Returns:
        Parsed agent response
    """
    pass

def parse_agent_response(response: dict, plan_type: str) -> dict:
    """
    Parse Bedrock Agent response and extract relevant data
    
    Args:
        response: Raw agent response
        plan_type: 'sleep' or 'caffeine'
        
    Returns:
        Structured plan data
    """
    pass
```

**Request Format:**
```json
{
  "pathParameters": {
    "user_id": "user123"
  },
  "body": {
    "target_date": "2024-01-15"
  }
}
```

**Response Format (Success):**
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  "body": {
    "sleep_time": "23:00",
    "shift_type": "D",
    "tip": "밤 11시 이전 취침하여 규칙적인 생체 리듬을 유지하세요.",
    "generated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Response Format (Error):**
```json
{
  "statusCode": 404,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  "body": {
    "error": "NoScheduleFound",
    "message": "No schedule found for the specified date",
    "status_code": 404
  }
}
```

### 2. BioPathway_Calculator Lambda

**File:** `backend/lambda/ShiftSync_BioPathway_Calculator/lambda_function.py`

**Functions:**

```python
def lambda_handler(event, context):
    """
    Main handler for biorhythm calculation
    
    Args:
        event: Contains user_id and target_date
        context: Lambda context
        
    Returns:
        Biorhythm recommendation data
    """
    pass

def get_user_schedule(user_id: str, target_date: str) -> dict:
    """
    Query RDS for user schedule
    
    Args:
        user_id: User identifier
        target_date: Date to query (YYYY-MM-DD)
        
    Returns:
        Schedule record with shift_type
    """
    pass

def apply_bio_rules(shift_type: str) -> dict:
    """
    Apply BIO_RULES based on shift type
    
    Args:
        shift_type: One of 'D', 'E', 'N', 'O'
        
    Returns:
        Dictionary with sleep, coffee, and tip
    """
    pass

def get_db_connection():
    """
    Create database connection using environment variables
    
    Returns:
        psycopg2 connection object
    """
    pass
```

**BIO_RULES Constant:**
```python
BIO_RULES = {
    "D": {
        "sleep": "23:00",
        "coffee": "14:00",
        "tip": "밤 11시 이전 취침하여 규칙적인 생체 리듬을 유지하세요."
    },
    "N": {
        "sleep": "09:00",
        "coffee": "03:00",
        "tip": "퇴근길 햇빛 노출을 최소화하고 즉시 암막 커튼 아래서 수면하세요."
    },
    "E": {
        "sleep": "02:00",
        "coffee": "18:00",
        "tip": "퇴근 후 가벼운 식사를 하고 미온수로 샤워하여 숙면을 유도하세요."
    },
    "O": {
        "sleep": "23:00",
        "coffee": "15:00",
        "tip": "부족한 잠을 보충하되 오후 3시 이후의 긴 낮잠은 피하세요."
    }
}
```

**Input Format:**
```json
{
  "user_id": "user123",
  "target_date": "2024-01-15"
}
```

**Output Format:**
```json
{
  "shift_type": "D",
  "sleep": "23:00",
  "coffee": "14:00",
  "tip": "밤 11시 이전 취침하여 규칙적인 생체 리듬을 유지하세요."
}
```

### 3. Bedrock Agent Configuration

**Agent Details:**
- **Name:** ShiftSync-Bio-Coach
- **Agent ID:** 1XOE4OAMLR
- **Alias ID:** VXOUCFXA2P
- **Region:** us-east-1

**Action Group:**
- **Function Name:** get_daily_biorhythm
- **Lambda:** ShiftSync_BioPathway_Calculator
- **Parameters:**
  - `user_id` (string, required)
  - `target_date` (string, required, format: YYYY-MM-DD)

**Invocation Method:**
```python
import boto3

bedrock_agent = boto3.client(
    'bedrock-agent-runtime',
    region_name=os.environ['BEDROCK_REGION']
)

response = bedrock_agent.invoke_agent(
    agentId=os.environ['BEDROCK_AGENT_ID'],
    agentAliasId=os.environ['BEDROCK_AGENT_ALIAS_ID'],
    sessionId=f"{user_id}_{int(time.time())}",
    inputText=prompt
)
```

### 4. Database Schema

**Table:** schedules

```sql
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    work_date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL,  -- 'day', 'evening', 'night', 'off'
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, work_date)
);
```

**Query Pattern:**
```sql
SELECT shift_type, start_time, end_time
FROM schedules
WHERE user_id = %s AND work_date = %s
ORDER BY created_at DESC
LIMIT 1;
```

**Shift Type Mapping:**
- Database value `'day'` → BIO_RULES key `'D'`
- Database value `'evening'` → BIO_RULES key `'E'`
- Database value `'night'` → BIO_RULES key `'N'`
- Database value `'off'` → BIO_RULES key `'O'`

## Data Models

### SleepPlan

```python
from dataclasses import dataclass
from datetime import datetime

@dataclass
class SleepPlan:
    sleep_time: str  # Format: "HH:MM"
    shift_type: str  # One of: 'D', 'E', 'N', 'O'
    tip: str  # Korean recommendation text
    generated_at: datetime
    
    def to_dict(self) -> dict:
        return {
            'sleep_time': self.sleep_time,
            'shift_type': self.shift_type,
            'tip': self.tip,
            'generated_at': self.generated_at.isoformat()
        }
```

### CaffeinePlan

```python
from dataclasses import dataclass
from datetime import datetime

@dataclass
class CaffeinePlan:
    coffee_time: str  # Format: "HH:MM"
    shift_type: str  # One of: 'D', 'E', 'N', 'O'
    tip: str  # Korean recommendation text
    generated_at: datetime
    
    def to_dict(self) -> dict:
        return {
            'coffee_time': self.coffee_time,
            'shift_type': self.shift_type,
            'tip': self.tip,
            'generated_at': self.generated_at.isoformat()
        }
```

### ScheduleRecord

```python
from dataclasses import dataclass
from datetime import date, time

@dataclass
class ScheduleRecord:
    user_id: str
    work_date: date
    shift_type: str  # Database format: 'day', 'evening', 'night', 'off'
    start_time: time
    end_time: time
    
    def get_bio_rules_key(self) -> str:
        """Convert database shift_type to BIO_RULES key"""
        mapping = {
            'day': 'D',
            'evening': 'E',
            'night': 'N',
            'off': 'O'
        }
        return mapping.get(self.shift_type, 'D')
```

### BedrockAgentResponse

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class BedrockAgentResponse:
    completion: str  # Full agent response text
    session_id: str
    response_metadata: dict
    
    def extract_time(self, time_type: str) -> Optional[str]:
        """
        Extract time from agent response
        
        Args:
            time_type: 'sleep' or 'coffee'
            
        Returns:
            Time string in HH:MM format or None
        """
        pass
```

## Data Models (Continued)

### ErrorResponse

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class ErrorResponse:
    error: str  # Error type identifier
    message: str  # Human-readable error message
    status_code: int  # HTTP status code
    details: Optional[dict] = None  # Additional error context
    
    def to_dict(self) -> dict:
        result = {
            'error': self.error,
            'message': self.message,
            'status_code': self.status_code
        }
        if self.details:
            result['details'] = self.details
        return result
```



## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Database Query and Extraction

*For any* valid user_id and target_date, when the BioPathway_Calculator queries the RDS schedules table, it should successfully execute the query and extract the shift_type from any returned record.

**Validates: Requirements 1.1, 1.2**

### Property 2: BIO_RULES Application

*For any* valid shift_type ('D', 'E', 'N', 'O'), when the BioPathway_Calculator applies BIO_RULES, it should return a dictionary containing sleep time, coffee time, and a non-empty Korean tip that corresponds to that shift type.

**Validates: Requirements 4.1, 4.6**

### Property 3: Sleep Plan Response Structure

*For any* successful sleep plan generation request, the AI_Services_Lambda should return a JSON response containing exactly the fields: sleep_time (string), shift_type (string), tip (string), and generated_at (ISO datetime string).

**Validates: Requirements 2.4, 6.1**

### Property 4: Caffeine Plan Response Structure

*For any* successful caffeine plan generation request, the AI_Services_Lambda should return a JSON response containing exactly the fields: coffee_time (string), shift_type (string), tip (string), and generated_at (ISO datetime string).

**Validates: Requirements 3.4, 6.2**

### Property 5: Agent Parameter Passing

*For any* valid user_id and target_date, when the AI_Services_Lambda invokes the Bedrock Agent, it should pass both user_id and target_date as parameters in the invocation.

**Validates: Requirements 5.5**

### Property 6: Sleep Time Parsing

*For any* valid Bedrock Agent response containing sleep time information, the AI_Services_Lambda should successfully parse and extract the sleep time in HH:MM format.

**Validates: Requirements 2.3**

### Property 7: Caffeine Time Parsing

*For any* valid Bedrock Agent response containing caffeine cutoff information, the AI_Services_Lambda should successfully parse and extract the coffee time in HH:MM format.

**Validates: Requirements 3.3**

### Property 8: Error Response Structure

*For any* error condition (database failure, missing schedule, agent timeout, etc.), the AI_Services_Lambda should return a JSON response containing exactly the fields: error (string), message (string), and status_code (integer).

**Validates: Requirements 6.3**

### Property 9: HTTP Status Code Mapping

*For any* request outcome, the AI_Services_Lambda should return the appropriate HTTP status code: 200 for success, 404 for missing schedule data, 500 for server errors, and other appropriate codes for different error conditions.

**Validates: Requirements 6.4**

### Property 10: CORS Headers Presence

*For any* request to the AI_Services_Lambda endpoints, the response should include CORS headers (at minimum Access-Control-Allow-Origin).

**Validates: Requirements 6.5**

### Property 11: Bedrock Agent Invocation for Sleep Plans

*For any* valid generateSleepPlan request, the AI_Services_Lambda should invoke the Bedrock Agent exactly once with a prompt requesting sleep time recommendations.

**Validates: Requirements 2.1**

### Property 12: Bedrock Agent Invocation for Caffeine Plans

*For any* valid generateCaffeinePlan request, the AI_Services_Lambda should invoke the Bedrock Agent exactly once with a prompt requesting caffeine cutoff recommendations.

**Validates: Requirements 3.1**

## Error Handling

### Error Categories

**1. Database Errors**
- Connection failures
- Query execution errors
- No schedule data found
- Multiple records for same user/date

**Handling Strategy:**
```python
try:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, (user_id, target_date))
    result = cursor.fetchone()
    
    if not result:
        raise NoScheduleFoundError(
            f"No schedule found for user {user_id} on {target_date}"
        )
    
    if cursor.fetchone():  # Check for duplicates
        # Use first result (most recent due to ORDER BY created_at DESC)
        pass
        
except psycopg2.Error as e:
    logger.error(f"Database error: {str(e)}")
    raise DatabaseConnectionError(
        "Failed to connect to database",
        details={"error": str(e)}
    )
finally:
    if conn:
        conn.close()
```

**2. Bedrock Agent Errors**
- Agent invocation timeout
- Unexpected response format
- Agent service unavailable
- Invalid agent configuration

**Handling Strategy:**
```python
try:
    response = bedrock_agent.invoke_agent(
        agentId=agent_id,
        agentAliasId=alias_id,
        sessionId=session_id,
        inputText=prompt
    )
    
    # Parse response
    completion = extract_completion(response)
    
    if not completion:
        raise InvalidAgentResponseError(
            "Agent returned empty response"
        )
        
except ClientError as e:
    error_code = e.response['Error']['Code']
    
    if error_code == 'ThrottlingException':
        raise AgentThrottlingError("Too many requests to Bedrock Agent")
    elif error_code == 'TimeoutError':
        raise AgentTimeoutError("Bedrock Agent invocation timed out")
    else:
        raise AgentInvocationError(
            f"Failed to invoke Bedrock Agent: {error_code}"
        )
```

**3. Configuration Errors**
- Missing environment variables
- Invalid environment variable values
- Missing AWS credentials

**Handling Strategy:**
```python
def validate_config():
    """Validate required environment variables at Lambda initialization"""
    required_vars = [
        'BEDROCK_AGENT_ID',
        'BEDROCK_AGENT_ALIAS_ID',
        'BEDROCK_REGION',
        'DB_HOST',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'DB_PORT'
    ]
    
    missing = [var for var in required_vars if not os.environ.get(var)]
    
    if missing:
        raise ConfigurationError(
            f"Missing required environment variables: {', '.join(missing)}"
        )

# Call at module level
validate_config()
```

**4. Input Validation Errors**
- Invalid user_id format
- Invalid target_date format
- Missing required parameters

**Handling Strategy:**
```python
def validate_input(user_id: str, target_date: str):
    """Validate input parameters"""
    if not user_id or not isinstance(user_id, str):
        raise ValidationError("user_id must be a non-empty string")
    
    try:
        datetime.strptime(target_date, '%Y-%m-%d')
    except ValueError:
        raise ValidationError(
            f"target_date must be in YYYY-MM-DD format, got: {target_date}"
        )
```

### Error Response Format

All errors should be returned in a consistent format:

```python
def create_error_response(error_type: str, message: str, status_code: int, details: dict = None):
    """Create standardized error response"""
    body = {
        'error': error_type,
        'message': message,
        'status_code': status_code
    }
    
    if details:
        body['details'] = details
    
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        'body': json.dumps(body)
    }
```

### Error Status Code Mapping

| Error Type | HTTP Status Code | Error Code String |
|------------|------------------|-------------------|
| No schedule found | 404 | NoScheduleFound |
| Invalid input | 400 | ValidationError |
| Database connection failure | 500 | DatabaseError |
| Bedrock Agent timeout | 504 | AgentTimeout |
| Bedrock Agent throttling | 429 | AgentThrottling |
| Configuration error | 500 | ConfigurationError |
| Unexpected agent response | 500 | InvalidAgentResponse |
| General server error | 500 | InternalServerError |

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of BIO_RULES for each shift type (D, E, N, O)
- Specific prompt strings for sleep and caffeine plans
- Edge cases: missing schedules, database failures, agent timeouts
- Error response formats and status codes
- Configuration validation

**Property-Based Tests** focus on:
- Universal properties that hold across all valid inputs
- Database query behavior for any user_id and target_date
- Response structure consistency for all successful requests
- CORS headers presence in all responses
- Parameter passing for any valid inputs

### Property-Based Testing Configuration

**Library:** Use `hypothesis` for Python property-based testing

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `# Feature: bedrock-agent-integration, Property {N}: {property_text}`

**Example Property Test:**
```python
from hypothesis import given, strategies as st
import pytest

# Feature: bedrock-agent-integration, Property 2: BIO_RULES Application
@given(shift_type=st.sampled_from(['D', 'E', 'N', 'O']))
@pytest.mark.property_test
def test_bio_rules_application(shift_type):
    """
    Property: For any valid shift_type, BIO_RULES should return
    sleep time, coffee time, and Korean tip
    """
    result = apply_bio_rules(shift_type)
    
    assert 'sleep' in result
    assert 'coffee' in result
    assert 'tip' in result
    assert isinstance(result['sleep'], str)
    assert isinstance(result['coffee'], str)
    assert isinstance(result['tip'], str)
    assert len(result['tip']) > 0  # Non-empty Korean tip
    assert is_valid_time_format(result['sleep'])  # HH:MM format
    assert is_valid_time_format(result['coffee'])  # HH:MM format
```

### Unit Test Examples

**Example 1: Specific BIO_RULES Test**
```python
def test_day_shift_bio_rules():
    """Test BIO_RULES for day shift (D)"""
    result = apply_bio_rules('D')
    
    assert result['sleep'] == '23:00'
    assert result['coffee'] == '14:00'
    assert '규칙적인 생체 리듬' in result['tip']
```

**Example 2: Sleep Prompt Test**
```python
def test_sleep_plan_prompt():
    """Test that sleep plan uses correct Korean prompt"""
    with patch('boto3.client') as mock_client:
        generate_sleep_plan({'user_id': 'test', 'target_date': '2024-01-15'})
        
        call_args = mock_client.return_value.invoke_agent.call_args
        assert '최적 수면 시간' in call_args[1]['inputText']
```

**Example 3: No Schedule Error Test**
```python
def test_no_schedule_found_error():
    """Test 404 response when no schedule exists"""
    with patch('get_user_schedule', side_effect=NoScheduleFoundError()):
        response = generate_sleep_plan({
            'user_id': 'test',
            'target_date': '2024-01-15'
        })
        
        assert response['statusCode'] == 404
        body = json.loads(response['body'])
        assert body['error'] == 'NoScheduleFound'
        assert 'No schedule found' in body['message']
```

### Integration Testing

**Database Integration:**
- Test with actual PostgreSQL database (use Docker container for CI/CD)
- Verify connection pooling and cleanup
- Test transaction rollback on errors

**Bedrock Agent Integration:**
- Use AWS SDK mocking for unit tests
- Use actual Bedrock Agent in staging environment
- Verify session management and cleanup

**End-to-End Flow:**
- Test complete flow from API Gateway to database and back
- Verify all components work together correctly
- Test with realistic user scenarios

### Test Coverage Goals

- **Unit Test Coverage:** Minimum 80% code coverage
- **Property Test Coverage:** All 12 correctness properties implemented
- **Integration Test Coverage:** All major integration points tested
- **Edge Case Coverage:** All error scenarios from Requirements 7 tested

### Testing Tools

- **pytest:** Test framework
- **hypothesis:** Property-based testing library
- **moto:** AWS service mocking
- **pytest-cov:** Coverage reporting
- **docker-compose:** Local database testing
