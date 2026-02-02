import json
import os
import boto3
from datetime import datetime, date, time, timedelta
from typing import Dict, Any, Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import random
import uuid
import re

# 로깅 설정
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Bedrock Agent 클라이언트는 필요할 때 초기화 (lazy initialization)
_bedrock_agent_runtime = None


# ============================================================================
# Custom Exception Classes (Task 6.2)
# ============================================================================

class NoScheduleFoundError(Exception):
    """Raised when no schedule is found for the user on the specified date"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class DatabaseConnectionError(Exception):
    """Raised when database connection fails"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class AgentTimeoutError(Exception):
    """Raised when Bedrock Agent invocation times out"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class AgentInvocationError(Exception):
    """Raised when Bedrock Agent invocation fails"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ConfigurationError(Exception):
    """Raised when required configuration is missing or invalid"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(Exception):
    """Raised when input validation fails"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)

def get_bedrock_client():
    """Bedrock Agent Runtime 클라이언트 가져오기 (lazy initialization)"""
    global _bedrock_agent_runtime
    if _bedrock_agent_runtime is None:
        _bedrock_agent_runtime = boto3.client(
            'bedrock-agent-runtime',
            region_name=os.environ.get('BEDROCK_REGION', 'us-east-1')
        )
    return _bedrock_agent_runtime


# ============================================================================
# Configuration Validation (Task 6.1)
# ============================================================================

def validate_config():
    """
    Validate that all required environment variables are present
    
    Raises:
        ConfigurationError: If any required configuration is missing
    """
    required_vars = {
        'BEDROCK_AGENT_ID': 'Bedrock Agent ID',
        'BEDROCK_AGENT_ALIAS_ID': 'Bedrock Agent Alias ID',
        'BEDROCK_REGION': 'Bedrock Region',
        'DB_HOST': 'Database Host',
        'DB_NAME': 'Database Name',
        'DB_USER': 'Database User',
        'DB_PASSWORD': 'Database Password'
    }
    
    missing_vars = []
    for var, description in required_vars.items():
        if not os.environ.get(var):
            missing_vars.append(f"{var} ({description})")
    
    if missing_vars:
        raise ConfigurationError(
            f"Missing required environment variables: {', '.join(missing_vars)}",
            {'missing_variables': missing_vars}
        )
    
    logger.info("✅ Configuration validation passed")


# ============================================================================
# Input Validation (Task 6.3)
# ============================================================================

def validate_input(user_id: str, target_date: str):
    """
    Validate user_id and target_date inputs
    
    Args:
        user_id: User identifier
        target_date: Date string in YYYY-MM-DD format
        
    Raises:
        ValidationError: If inputs are invalid
    """
    # Validate user_id
    if not user_id or not isinstance(user_id, str) or len(user_id.strip()) == 0:
        raise ValidationError(
            "user_id must be a non-empty string",
            {'field': 'user_id', 'value': user_id}
        )
    
    # Validate target_date format (YYYY-MM-DD)
    if not target_date or not isinstance(target_date, str):
        raise ValidationError(
            "target_date must be a non-empty string",
            {'field': 'target_date', 'value': target_date}
        )
    
    # Check date format using regex
    date_pattern = r'^\d{4}-\d{2}-\d{2}$'
    if not re.match(date_pattern, target_date):
        raise ValidationError(
            "target_date must be in YYYY-MM-DD format",
            {'field': 'target_date', 'value': target_date, 'expected_format': 'YYYY-MM-DD'}
        )
    
    # Try to parse the date to ensure it's valid
    try:
        datetime.strptime(target_date, '%Y-%m-%d')
    except ValueError as e:
        raise ValidationError(
            f"Invalid date: {target_date}",
            {'field': 'target_date', 'value': target_date, 'error': str(e)}
        )
    
    logger.info(f"✅ Input validation passed: user_id={user_id}, target_date={target_date}")


# ============================================================================
# Bedrock Agent Integration Functions (Task 2.1, 2.2, 2.3)
# ============================================================================

def invoke_bedrock_agent(user_id: str, target_date: str, prompt: str, use_bio_coach: bool = False) -> Dict[str, Any]:
    """
    Invoke Bedrock Agent with specified prompt (Task 2.1)
    
    Args:
        user_id: User identifier
        target_date: Date for recommendations (YYYY-MM-DD)
        prompt: Korean prompt for agent
        use_bio_coach: If True, use Bio-Coach agent for sleep/caffeine recommendations
        
    Returns:
        Parsed agent response with biorhythm data
        
    Raises:
        Exception: If agent invocation fails
    """
    try:
        # Get Bedrock Agent configuration
        if use_bio_coach:
            # Use Bio-Coach Agent for sleep/caffeine recommendations
            agent_id = os.environ.get('BEDROCK_BIO_AGENT_ID')
            agent_alias_id = os.environ.get('BEDROCK_BIO_AGENT_ALIAS_ID')
            agent_name = "Bio-Coach"
        else:
            # Use RAG Chatbot Agent for general chat
            agent_id = os.environ.get('BEDROCK_AGENT_ID')
            agent_alias_id = os.environ.get('BEDROCK_AGENT_ALIAS_ID')
            agent_name = "RAG Chatbot"
        
        if not agent_id or not agent_alias_id:
            raise ValueError(f"{agent_name} Agent ID and Alias ID must be set")
        
        # Generate session ID
        session_id = f"{user_id}_{int(datetime.now().timestamp())}"
        
        logger.info(f"🚀 Invoking {agent_name} Agent: agent_id={agent_id}, alias_id={agent_alias_id}, session_id={session_id}")
        logger.info(f"📝 Prompt: {prompt}")
        logger.info(f"📅 Target date: {target_date}")
        
        # Get Bedrock client
        bedrock_client = get_bedrock_client()
        
        # Invoke agent
        response = bedrock_client.invoke_agent(
            agentId=agent_id,
            agentAliasId=agent_alias_id,
            sessionId=session_id,
            inputText=f"{prompt} (날짜: {target_date}, 사용자: {user_id})"
        )
        
        # Parse response stream
        completion_text = ""
        event_stream = response.get('completion')
        
        if not event_stream:
            raise ValueError("No completion stream in Bedrock Agent response")
        
        for event in event_stream:
            if 'chunk' in event:
                chunk = event['chunk']
                if 'bytes' in chunk:
                    text = chunk['bytes'].decode('utf-8')
                    completion_text += text
        
        logger.info(f"✅ {agent_name} Agent response: {completion_text[:200]}...")
        
        # Parse the response to extract biorhythm data
        parsed_data = parse_agent_response(completion_text, user_id, target_date)
        
        return parsed_data
        
    except Exception as e:
        logger.error(f"❌ Bedrock Agent invocation error: {type(e).__name__}: {e}")
        raise


def parse_agent_response(response_text: str, user_id: str, target_date: str) -> Dict[str, Any]:
    """
    Parse Bedrock Agent response and extract biorhythm data (Task 2.2)
    
    Args:
        response_text: Raw agent response text
        user_id: User identifier
        target_date: Target date
        
    Returns:
        Structured biorhythm data with sleep_time, coffee_time, shift_type, tip
    """
    import re
    import json as json_lib
    
    try:
        # Try to parse as JSON first (if agent returns structured data)
        try:
            data = json_lib.loads(response_text)
            if isinstance(data, dict) and 'sleep' in data:
                return {
                    'sleep_time': data.get('sleep'),
                    'coffee_time': data.get('coffee'),
                    'shift_type': data.get('shift'),
                    'tip': data.get('tip', ''),
                    'date': target_date
                }
        except json_lib.JSONDecodeError:
            pass
        
        # Extract time patterns (HH:MM format) with context
        # Look for sleep-related keywords near times
        sleep_keywords = ['수면', '잠', 'sleep', '취침', '자는']
        caffeine_keywords = ['카페인', '커피', 'caffeine', 'coffee', '중단', '마감']
        
        # Find all times with their context
        time_pattern = r'(.{0,20})\b([0-2]?[0-9]):([0-5][0-9])\b(.{0,20})'
        time_matches = re.findall(time_pattern, response_text, re.IGNORECASE)
        
        sleep_time = None
        coffee_time = None
        
        # Analyze each time with context
        for before, hour, minute, after in time_matches:
            time_str = f"{hour.zfill(2)}:{minute}"
            context = (before + after).lower()
            
            # Check if this is a sleep time
            if any(keyword in context for keyword in sleep_keywords):
                if not sleep_time:  # Take first sleep time found
                    sleep_time = time_str
            
            # Check if this is a caffeine time
            elif any(keyword in context for keyword in caffeine_keywords):
                if not coffee_time:  # Take first caffeine time found
                    coffee_time = time_str
        
        # Fallback: if we couldn't identify times by context, use position
        if not sleep_time or not coffee_time:
            times = re.findall(r'\b([0-2]?[0-9]):([0-5][0-9])\b', response_text)
            if not sleep_time and len(times) > 1:
                # Second time is more likely to be sleep time
                sleep_time = f"{times[1][0].zfill(2)}:{times[1][1]}"
            if not coffee_time and len(times) > 0:
                # First time is more likely to be caffeine time
                coffee_time = f"{times[0][0].zfill(2)}:{times[0][1]}"
        
        # Final defaults
        sleep_time = sleep_time or "23:00"
        coffee_time = coffee_time or "14:00"
        
        # Extract shift type
        shift_pattern = r'(주간|야간|초저녁|휴무|day|night|evening|off|D|E|N|O)'
        shift_matches = re.findall(shift_pattern, response_text, re.IGNORECASE)
        
        # Map Korean to shift type
        shift_mapping = {
            '주간': 'D', 'day': 'D', 'D': 'D',
            '야간': 'N', 'night': 'N', 'N': 'N',
            '초저녁': 'E', 'evening': 'E', 'E': 'E',
            '휴무': 'O', 'off': 'O', 'O': 'O'
        }
        
        shift_type = 'D'  # Default
        if shift_matches:
            shift_type = shift_mapping.get(shift_matches[0].lower(), 'D')
        
        # Extract tip (everything after certain keywords)
        tip = response_text
        for keyword in ['팁:', '권장사항:', '조언:', 'tip:', 'advice:']:
            if keyword in response_text.lower():
                tip = response_text.split(keyword, 1)[1].strip()
                break
        
        return {
            'sleep_time': sleep_time,
            'coffee_time': coffee_time,
            'shift_type': shift_type,
            'tip': tip[:500],  # Limit tip length
            'date': target_date
        }
        
    except Exception as e:
        logger.error(f"❌ Error parsing agent response: {e}")
        # Return default values
        return {
            'sleep_time': "23:00",
            'coffee_time': "14:00",
            'shift_type': "D",
            'tip': "규칙적인 수면 패턴을 유지하세요.",
            'date': target_date
        }


def create_success_response(status_code: int, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create success response with CORS headers (Task 2.3)
    
    Args:
        status_code: HTTP status code (200, 201, etc.)
        data: Response data
        
    Returns:
        API Gateway response format
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(data, ensure_ascii=False, default=str)
    }


def create_error_response(status_code: int, error_type: str, message: str, details: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Create error response with CORS headers (Task 2.3)
    
    Args:
        status_code: HTTP status code (400, 404, 500, etc.)
        error_type: Error type identifier
        message: Human-readable error message
        details: Optional additional error context
        
    Returns:
        API Gateway response format
    """
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
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, ensure_ascii=False)
    }

class DatabaseManager:
    def __init__(self):
        self.db_config = {
            'host': os.environ['DB_HOST'],
            'port': os.environ.get('DB_PORT', '5432'),
            'database': os.environ.get('DB_NAME', 'rhythm_fairy'),
            'user': os.environ.get('DB_USER', 'postgres'),
            'password': os.environ['DB_PASSWORD']
        }
    
    def get_connection(self):
        """데이터베이스 연결"""
        return psycopg2.connect(**self.db_config)
    
    def execute_query(self, query: str, params: tuple = None) -> list:
        """SELECT 쿼리 실행"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                return [dict(row) for row in cursor.fetchall()]
    
    def execute_update(self, query: str, params: tuple = None) -> int:
        """INSERT/UPDATE/DELETE 쿼리 실행"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                conn.commit()
                return cursor.rowcount
    
    def execute_insert_returning(self, query: str, params: tuple = None) -> Optional[Dict]:
        """INSERT 쿼리 실행 후 결과 반환"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                conn.commit()
                result = cursor.fetchone()
                return dict(result) if result else None

class AIService:
    def __init__(self):
        self.db = DatabaseManager()
    
    def generate_sleep_plan(self, user_id: str, plan_date: str) -> Dict[str, Any]:
        """
        수면 계획 생성 (Bedrock Agent 사용) 및 DB 저장
        
        Uses Bedrock Agent to generate personalized sleep recommendations
        based on user's work schedule and saves to database.
        """
        try:
            # Invoke Bedrock Agent with sleep-focused prompt
            prompt = (
                f"사용자 {user_id}의 {plan_date} 수면 계획을 생성해주세요. "
                f"다음 정보를 포함해주세요:\n"
                f"1. 권장 수면 시작 시간 (HH:MM 형식)\n"
                f"2. 권장 수면 종료 시간 (HH:MM 형식)\n"
                f"3. 낮잠이 필요한 경우 낮잠 시간\n"
                f"4. 교대 근무 유형에 맞는 수면 팁\n"
                f"사용자의 근무 스케줄을 고려하여 생체 리듬에 최적화된 계획을 제공해주세요."
            )
            
            logger.info(f"🛏️  Generating sleep plan for user={user_id}, date={plan_date}")
            
            try:
                # Call Bio-Coach Agent (use_bio_coach=True)
                agent_response = invoke_bedrock_agent(user_id, plan_date, prompt, use_bio_coach=True)
                
                sleep_time = agent_response.get('sleep_time', '23:00')
                shift_type = agent_response.get('shift_type', 'D')
                tip = agent_response.get('tip', '규칙적인 수면 패턴을 유지하세요.')
                
                logger.info(f"✅ Sleep plan generated: sleep_time={sleep_time}, shift_type={shift_type}")
                
            except Exception as agent_error:
                logger.warning(f"⚠️  Bedrock Agent failed, using fallback: {agent_error}")
                # Fallback to schedule-based logic
                schedule_query = """
                SELECT shift_type, start_time, end_time FROM schedules 
                WHERE user_id = %s AND work_date = %s
                """
                schedules = self.db.execute_query(schedule_query, (user_id, plan_date))
                
                if schedules and schedules[0]['shift_type'] == 'night':
                    # 야간 근무: 퇴근 후 아침에 수면 (08:00 - 16:00)
                    sleep_time = "08:00"
                    shift_type = "N"
                    tip = "야간 근무 후 충분한 주간 수면을 취하세요. 퇴근 후 바로 암막 커튼을 치고 수면하는 것이 중요합니다."
                elif schedules and schedules[0]['shift_type'] == 'evening':
                    # 저녁 근무: 늦은 밤 수면 (02:00 - 10:00)
                    sleep_time = "02:00"
                    shift_type = "E"
                    tip = "저녁 근무 후 늦은 취침과 충분한 아침 수면을 권장합니다."
                else:
                    # 주간 근무 또는 휴무: 일반적인 수면 시간 (23:00 - 07:00)
                    sleep_time = "23:00"
                    shift_type = "D"
                    tip = "밤 11시 이전 취침하여 규칙적인 생체 리듬을 유지하세요."
            
            # Calculate sleep window based on shift type
            # Convert sleep_time to sleep window (start and end times)
            from datetime import datetime as dt, timedelta
            
            try:
                # Parse sleep_time (e.g., "09:00")
                sleep_hour, sleep_minute = map(int, sleep_time.split(':'))
                
                # Calculate sleep duration (8 hours recommended)
                sleep_duration_hours = 8
                
                # Calculate end time (sleep_time + duration)
                sleep_start = dt.strptime(sleep_time, '%H:%M')
                sleep_end = sleep_start + timedelta(hours=sleep_duration_hours)
                
                main_sleep_start = sleep_start.strftime('%H:%M')
                main_sleep_end = sleep_end.strftime('%H:%M')
                
                # Nap recommendations based on shift type
                nap_start = None
                nap_end = None
                if shift_type == 'N':  # Night shift - recommend pre-work nap
                    # 야간 근무 전 저녁 낮잠 (출근 전 20:00-20:30)
                    nap_start = '20:00'
                    nap_end = '20:30'
                elif shift_type == 'E':  # Evening shift - recommend afternoon nap
                    # 저녁 근무 전 오후 낮잠
                    nap_start = '15:00'
                    nap_end = '15:30'
                # Day shift (D) - no nap needed
                
            except Exception as parse_error:
                logger.warning(f"Sleep time parsing error: {parse_error}, using defaults")
                main_sleep_start = '23:00'
                main_sleep_end = '07:00'
                nap_start = None
                nap_end = None
            
            # Save to database
            try:
                # Convert time strings to TIMESTAMP WITH TIME ZONE
                # Format: plan_date + time
                main_sleep_start_ts = f"{plan_date} {main_sleep_start}:00"
                main_sleep_end_ts = f"{plan_date} {main_sleep_end}:00"
                
                # Handle next day for sleep end time
                if main_sleep_end < main_sleep_start:
                    # Sleep crosses midnight
                    next_day = dt.strptime(plan_date, '%Y-%m-%d') + timedelta(days=1)
                    main_sleep_end_ts = f"{next_day.strftime('%Y-%m-%d')} {main_sleep_end}:00"
                
                nap_start_ts = f"{plan_date} {nap_start}:00" if nap_start else None
                nap_end_ts = f"{plan_date} {nap_end}:00" if nap_end else None
                
                # Insert or update sleep plan
                upsert_query = """
                INSERT INTO sleep_plans (
                    user_id, plan_date, main_sleep_start, main_sleep_end, 
                    main_sleep_duration, nap_start, nap_end, nap_duration, rationale
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, plan_date) 
                DO UPDATE SET
                    main_sleep_start = EXCLUDED.main_sleep_start,
                    main_sleep_end = EXCLUDED.main_sleep_end,
                    main_sleep_duration = EXCLUDED.main_sleep_duration,
                    nap_start = EXCLUDED.nap_start,
                    nap_end = EXCLUDED.nap_end,
                    nap_duration = EXCLUDED.nap_duration,
                    rationale = EXCLUDED.rationale,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, user_id, plan_date, 
                          main_sleep_start, main_sleep_end, main_sleep_duration,
                          nap_start, nap_end, nap_duration, rationale,
                          created_at, updated_at
                """
                
                result = self.db.execute_insert_returning(
                    upsert_query,
                    (
                        user_id, plan_date, main_sleep_start_ts, main_sleep_end_ts,
                        sleep_duration_hours * 60,  # Convert to minutes
                        nap_start_ts, nap_end_ts,
                        30 if nap_start else None,  # 30 minutes nap
                        tip
                    )
                )
                
                if result:
                    logger.info(f"✅ Sleep plan saved to database: id={result['id']}")
                    # Convert TIMESTAMP to time strings for response
                    result['main_sleep_start'] = result['main_sleep_start'].strftime('%H:%M') if result['main_sleep_start'] else None
                    result['main_sleep_end'] = result['main_sleep_end'].strftime('%H:%M') if result['main_sleep_end'] else None
                    result['nap_start'] = result['nap_start'].strftime('%H:%M') if result['nap_start'] else None
                    result['nap_end'] = result['nap_end'].strftime('%H:%M') if result['nap_end'] else None
                    result['created_at'] = result['created_at'].isoformat() if result['created_at'] else None
                    result['updated_at'] = result['updated_at'].isoformat() if result['updated_at'] else None
                    result['main_sleep_duration'] = result['main_sleep_duration'] / 60  # Convert to hours
                    result['nap_duration'] = result['nap_duration'] / 60 if result['nap_duration'] else None
                    return result
                    
            except Exception as db_error:
                logger.error(f"❌ Failed to save sleep plan to database: {db_error}")
                # Continue with in-memory response if DB save fails
            
            # Return structured response matching frontend expectations (fallback if DB save fails)
            return {
                'id': None,
                'user_id': user_id,
                'plan_date': plan_date,
                'main_sleep_start': main_sleep_start,
                'main_sleep_end': main_sleep_end,
                'main_sleep_duration': sleep_duration_hours,
                'nap_start': nap_start,
                'nap_end': nap_end,
                'nap_duration': 0.5 if nap_start else None,  # 30 minutes
                'rationale': tip,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Sleep plan generation error: {e}")
            raise
    
    def get_sleep_plan(self, user_id: str, plan_date: str) -> Optional[Dict[str, Any]]:
        """수면 계획 조회"""
        try:
            query = """
            SELECT id, user_id, plan_date, 
                   main_sleep_start,
                   main_sleep_end,
                   main_sleep_duration / 60.0 as main_sleep_duration,
                   nap_start,
                   nap_end,
                   nap_duration / 60.0 as nap_duration,
                   rationale, created_at, updated_at
            FROM sleep_plans 
            WHERE user_id = %s AND plan_date = %s
            """
            results = self.db.execute_query(query, (user_id, plan_date))
            
            if results:
                result = results[0]
                # Convert TIMESTAMP to time strings (HH:MM format)
                result['main_sleep_start'] = result['main_sleep_start'].strftime('%H:%M') if result['main_sleep_start'] else None
                result['main_sleep_end'] = result['main_sleep_end'].strftime('%H:%M') if result['main_sleep_end'] else None
                result['nap_start'] = result['nap_start'].strftime('%H:%M') if result['nap_start'] else None
                result['nap_end'] = result['nap_end'].strftime('%H:%M') if result['nap_end'] else None
                result['created_at'] = result['created_at'].isoformat() if result['created_at'] else None
                result['updated_at'] = result['updated_at'].isoformat() if result['updated_at'] else None
                return result
            
            return None
        except Exception as e:
            logger.error(f"수면 계획 조회 오류: {e}")
            raise
    
    def generate_caffeine_plan(self, user_id: str, plan_date: str) -> Dict[str, Any]:
        """
        카페인 계획 생성 (Bedrock Agent 사용) 및 DB 저장
        
        Uses Bedrock Agent to generate personalized caffeine cutoff recommendations
        based on user's work schedule and sleep time and saves to database.
        """
        try:
            # Invoke Bedrock Agent with caffeine-focused prompt
            prompt = (
                f"사용자 {user_id}의 {plan_date} 카페인 섭취 계획을 생성해주세요. "
                f"다음 정보를 포함해주세요:\n"
                f"1. 카페인 섭취 마감 시간 (HH:MM 형식)\n"
                f"2. 권장 최대 섭취량 (mg)\n"
                f"3. 교대 근무 유형별 카페인 섭취 전략\n"
                f"4. 수면의 질을 보장하기 위한 카페인 관리 팁\n"
                f"사용자의 근무 스케줄과 수면 시간을 고려하여 최적의 계획을 제공해주세요."
            )
            
            logger.info(f"☕ Generating caffeine plan for user={user_id}, date={plan_date}")
            
            try:
                # Call Bio-Coach Agent (use_bio_coach=True)
                agent_response = invoke_bedrock_agent(user_id, plan_date, prompt, use_bio_coach=True)
                
                coffee_time = agent_response.get('coffee_time', '14:00')
                shift_type = agent_response.get('shift_type', 'D')
                tip = agent_response.get('tip', '오후 2시 이후 카페인 섭취를 피하세요.')
                
                logger.info(f"✅ Caffeine plan generated: coffee_time={coffee_time}, shift_type={shift_type}")
                
            except Exception as agent_error:
                logger.warning(f"⚠️  Bedrock Agent failed, using fallback: {agent_error}")
                # Fallback to schedule-based logic
                schedule_query = """
                SELECT shift_type FROM schedules 
                WHERE user_id = %s AND work_date = %s
                """
                schedules = self.db.execute_query(schedule_query, (user_id, plan_date))
                
                if schedules and schedules[0]['shift_type'] == 'night':
                    coffee_time = "03:00"
                    shift_type = "N"
                    tip = "야간 근무 초반에만 카페인을 섭취하고, 새벽 3시 이후에는 피하세요."
                elif schedules and schedules[0]['shift_type'] == 'evening':
                    coffee_time = "18:00"
                    shift_type = "E"
                    tip = "저녁 근무 전 적당한 카페인 섭취 후 야간에는 피하세요."
                else:
                    coffee_time = "14:00"
                    shift_type = "D"
                    tip = "오후 2시 이후 카페인 섭취를 피해 야간 수면의 질을 보장하세요."
            
            # Save to database
            try:
                # Insert or update caffeine plan
                upsert_query = """
                INSERT INTO caffeine_plans (
                    user_id, plan_date, cutoff_time, max_intake_mg, 
                    recommendations, alternative_methods
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, plan_date) 
                DO UPDATE SET
                    cutoff_time = EXCLUDED.cutoff_time,
                    max_intake_mg = EXCLUDED.max_intake_mg,
                    recommendations = EXCLUDED.recommendations,
                    alternative_methods = EXCLUDED.alternative_methods,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, user_id, plan_date, cutoff_time, max_intake_mg,
                          recommendations, alternative_methods, created_at, updated_at
                """
                
                result = self.db.execute_insert_returning(
                    upsert_query,
                    (
                        user_id, plan_date, coffee_time, 400,  # 400mg standard
                        tip, '물, 가벼운 스트레칭, 짧은 산책'
                    )
                )
                
                if result:
                    logger.info(f"✅ Caffeine plan saved to database: id={result['id']}")
                    # Convert TIME to string for response
                    result['cutoff_time'] = result['cutoff_time'].strftime('%H:%M') if result['cutoff_time'] else None
                    result['created_at'] = result['created_at'].isoformat() if result['created_at'] else None
                    result['updated_at'] = result['updated_at'].isoformat() if result['updated_at'] else None
                    return result
                    
            except Exception as db_error:
                logger.error(f"❌ Failed to save caffeine plan to database: {db_error}")
                # Continue with in-memory response if DB save fails
            
            # Return structured response matching frontend expectations (fallback if DB save fails)
            return {
                'id': None,
                'user_id': user_id,
                'plan_date': plan_date,
                'cutoff_time': coffee_time,
                'max_intake_mg': 400,  # Standard recommendation
                'recommendations': tip,
                'alternative_methods': '물, 가벼운 스트레칭, 짧은 산책',
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Caffeine plan generation error: {e}")
            raise
    
    def get_caffeine_plan(self, user_id: str, plan_date: str) -> Optional[Dict[str, Any]]:
        """카페인 계획 조회"""
        try:
            query = """
            SELECT id, user_id, plan_date, 
                   cutoff_time,
                   max_intake_mg, recommendations, alternative_methods, 
                   created_at, updated_at
            FROM caffeine_plans 
            WHERE user_id = %s AND plan_date = %s
            """
            results = self.db.execute_query(query, (user_id, plan_date))
            
            if results:
                result = results[0]
                # Convert TIME to string (HH:MM format)
                result['cutoff_time'] = result['cutoff_time'].strftime('%H:%M') if result['cutoff_time'] else None
                result['created_at'] = result['created_at'].isoformat() if result['created_at'] else None
                result['updated_at'] = result['updated_at'].isoformat() if result['updated_at'] else None
                return result
            
            return None
        except Exception as e:
            logger.error(f"카페인 계획 조회 오류: {e}")
            raise
    
    def chat_with_ai(self, user_id: str, message: str) -> Dict[str, Any]:
        """AI 챗봇 상담 (Bedrock Agent 사용)"""
        try:
            # Bedrock Agent 설정
            agent_id = os.environ.get('BEDROCK_AGENT_ID')
            agent_alias_id = os.environ.get('BEDROCK_AGENT_ALIAS_ID')
            
            if not agent_id or not agent_alias_id:
                logger.warning("Bedrock Agent 설정이 없습니다. 더미 응답을 사용합니다.")
                return self._chat_with_dummy_ai(user_id, message)
            
            # 세션 ID 생성 (사용자별 고유 세션)
            session_id = f"{user_id}-{datetime.now().strftime('%Y%m%d')}"
            
            logger.info(f"Bedrock Agent 호출 시작: agent_id={agent_id}, alias_id={agent_alias_id}, session_id={session_id}")
            
            # Bedrock Agent 클라이언트 가져오기 (타임아웃 설정)
            bedrock_client = boto3.client(
                'bedrock-agent-runtime',
                region_name=os.environ.get('BEDROCK_REGION', 'us-east-1'),
                config=boto3.session.Config(
                    connect_timeout=30,  # VPC 엔드포인트 연결을 위해 증가
                    read_timeout=90,
                    retries={'max_attempts': 2}  # 재시도 추가
                )
            )
            
            logger.info("Bedrock Agent invoke_agent 호출 중...")
            logger.info(f"요청 파라미터: agentId={agent_id}, agentAliasId={agent_alias_id}, sessionId={session_id}")
            
            # Bedrock Agent 호출
            response = bedrock_client.invoke_agent(
                agentId=agent_id,
                agentAliasId=agent_alias_id,
                sessionId=session_id,
                inputText=message,
                enableTrace=True  # 디버깅을 위해 trace 활성화
            )
            
            logger.info(f"Bedrock Agent 응답 수신: {list(response.keys())}")
            logger.info("스트림 처리 시작...")
            
            # 응답 스트림 처리
            ai_response = ""
            event_stream = response.get('completion')
            
            if not event_stream:
                logger.error("Bedrock Agent 응답에 completion 스트림이 없습니다")
                return self._chat_with_dummy_ai(user_id, message)
            
            chunk_count = 0
            error_occurred = False
            
            try:
                for event in event_stream:
                    chunk_count += 1
                    logger.info(f"스트림 청크 {chunk_count} 수신: {list(event.keys())}")
                    
                    # trace 이벤트 로깅
                    if 'trace' in event:
                        trace = event['trace']
                        logger.info(f"Trace 이벤트: {trace}")
                    
                    # chunk 이벤트 처리
                    if 'chunk' in event:
                        chunk = event['chunk']
                        logger.info(f"Chunk 내용: {list(chunk.keys())}")
                        
                        if 'bytes' in chunk:
                            text = chunk['bytes'].decode('utf-8')
                            ai_response += text
                            logger.info(f"텍스트 청크 ({len(text)}자): {text[:100]}...")
                    
                    # 오류 이벤트 확인
                    if 'internalServerException' in event:
                        logger.error(f"Internal Server Exception: {event['internalServerException']}")
                        error_occurred = True
                    
                    if 'validationException' in event:
                        logger.error(f"Validation Exception: {event['validationException']}")
                        error_occurred = True
                    
                    if 'accessDeniedException' in event:
                        logger.error(f"Access Denied Exception: {event['accessDeniedException']}")
                        error_occurred = True
                        
            except Exception as stream_error:
                logger.error(f"스트림 처리 중 오류: {type(stream_error).__name__}: {stream_error}", exc_info=True)
                error_occurred = True
            
            logger.info(f"스트림 처리 완료: {chunk_count}개 청크, {len(ai_response)}자, 오류={error_occurred}")
            
            if error_occurred or not ai_response:
                logger.warning("Bedrock Agent 응답이 비어있거나 오류 발생. 더미 응답 사용")
                return self._chat_with_dummy_ai(user_id, message)
            
            # 채팅 기록 저장
            query = """
            INSERT INTO chat_history (user_id, message, response)
            VALUES (%s, %s, %s)
            RETURNING id, user_id, message, response, created_at
            """
            
            return self.db.execute_insert_returning(query, (user_id, message, ai_response))
            
        except Exception as e:
            logger.error(f"Bedrock Agent 호출 오류: {type(e).__name__}: {e}", exc_info=True)
            # 오류 발생 시 더미 응답 사용
            return self._chat_with_dummy_ai(user_id, message)
    
    def _chat_with_dummy_ai(self, user_id: str, message: str) -> Dict[str, Any]:
        """AI 챗봇 상담 (더미 데이터 - 백업용)"""
        try:
            # 더미 AI 응답 생성
            dummy_responses = [
                "교대근무로 인한 피로는 자연스러운 현상입니다. 규칙적인 수면 패턴을 유지하는 것이 중요해요.",
                "수면의 질을 높이기 위해 침실을 어둡고 시원하게 유지하고, 카페인 섭취 시간을 조절해보세요.",
                "교대근무 전후로 가벼운 운동이나 스트레칭을 하면 몸의 리듬을 조절하는 데 도움이 됩니다.",
                "충분한 수분 섭취와 균형 잡힌 식사로 에너지 레벨을 안정적으로 유지하세요.",
                "스트레스 관리를 위해 명상이나 깊은 호흡 연습을 해보시는 것을 추천드립니다."
            ]
            
            # 키워드 기반 간단한 응답 선택
            if any(keyword in message.lower() for keyword in ['수면', '잠', '피곤']):
                response = "수면 관련 고민이시군요. " + dummy_responses[0]
            elif any(keyword in message.lower() for keyword in ['카페인', '커피', '각성']):
                response = "카페인 관련 질문이시네요. " + dummy_responses[1]
            elif any(keyword in message.lower() for keyword in ['운동', '스트레칭', '활동']):
                response = "운동에 대한 질문이군요. " + dummy_responses[2]
            elif any(keyword in message.lower() for keyword in ['스트레스', '걱정', '불안']):
                response = "스트레스 관리가 필요하시군요. " + dummy_responses[4]
            else:
                response = random.choice(dummy_responses)
            
            # 채팅 기록 저장
            query = """
            INSERT INTO chat_history (user_id, message, response)
            VALUES (%s, %s, %s)
            RETURNING id, user_id, message, response, created_at
            """
            
            return self.db.execute_insert_returning(query, (user_id, message, response))
        except Exception as e:
            logger.error(f"더미 AI 챗봇 오류: {e}")
            raise
    
    def get_chat_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """채팅 기록 조회"""
        try:
            query = """
            SELECT id, user_id, message, response, created_at
            FROM chat_history 
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """
            return self.db.execute_query(query, (user_id, limit))
        except Exception as e:
            logger.error(f"채팅 기록 조회 오류: {e}")
            raise

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """API 응답 생성"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, ensure_ascii=False, default=str)
    }

def extract_user_id_from_event(event: Dict[str, Any]) -> str:
    """이벤트에서 사용자 ID 추출"""
    try:
        # Cognito 인증 후 사용자 ID
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')
        
        if not user_id:
            # 개발/테스트용 - path parameter에서 추출
            user_id = event.get('pathParameters', {}).get('user_id')
        
        return user_id
    except Exception as e:
        logger.error(f"사용자 ID 추출 오류: {e}")
        return None

def lambda_handler(event, context):
    """Lambda 메인 핸들러"""
    try:
        logger.info(f"이벤트 수신: {json.dumps(event)}")
        
        # HTTP 메서드 및 경로 추출 (API Gateway v2 형식 지원)
        http_method = event.get('requestContext', {}).get('http', {}).get('method', event.get('httpMethod', ''))
        raw_path = event.get('rawPath', event.get('path', ''))
        
        # /prod 접두사 제거 (API Gateway stage)
        path = raw_path.replace('/prod', '', 1) if raw_path.startswith('/prod') else raw_path
        
        # CORS preflight 처리
        if http_method == 'OPTIONS':
            return create_response(200, {'message': 'CORS preflight'})
        
        # AI 서비스 초기화
        ai_service = AIService()
        
        # 라우팅
        if http_method == 'POST' and '/sleep-plans' in path:
            # POST /users/{user_id}/sleep-plans - 수면 계획 생성
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            plan_date = body.get('plan_date')
            if not plan_date:
                return create_response(400, {'error': 'plan_date 필드가 필요합니다'})
            
            sleep_plan = ai_service.generate_sleep_plan(user_id, plan_date)
            return create_response(201, {'sleep_plan': sleep_plan})
        
        elif http_method == 'GET' and '/sleep-plans' in path:
            # GET /users/{user_id}/sleep-plans?date=YYYY-MM-DD - 수면 계획 조회
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            query_params = event.get('queryStringParameters') or {}
            plan_date = query_params.get('date')
            if not plan_date:
                return create_response(400, {'error': 'date 쿼리 파라미터가 필요합니다'})
            
            sleep_plan = ai_service.get_sleep_plan(user_id, plan_date)
            if not sleep_plan:
                return create_response(404, {'error': '수면 계획을 찾을 수 없습니다'})
            
            return create_response(200, {'sleep_plan': sleep_plan})
        
        elif http_method == 'POST' and '/caffeine-plans' in path:
            # POST /users/{user_id}/caffeine-plans - 카페인 계획 생성
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            plan_date = body.get('plan_date')
            if not plan_date:
                return create_response(400, {'error': 'plan_date 필드가 필요합니다'})
            
            caffeine_plan = ai_service.generate_caffeine_plan(user_id, plan_date)
            return create_response(201, {'caffeine_plan': caffeine_plan})
        
        elif http_method == 'GET' and '/caffeine-plans' in path:
            # GET /users/{user_id}/caffeine-plans?date=YYYY-MM-DD - 카페인 계획 조회
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            query_params = event.get('queryStringParameters') or {}
            plan_date = query_params.get('date')
            if not plan_date:
                return create_response(400, {'error': 'date 쿼리 파라미터가 필요합니다'})
            
            caffeine_plan = ai_service.get_caffeine_plan(user_id, plan_date)
            if not caffeine_plan:
                return create_response(404, {'error': '카페인 계획을 찾을 수 없습니다'})
            
            return create_response(200, {'caffeine_plan': caffeine_plan})
        
        elif http_method == 'POST' and '/chat' in path:
            # POST /users/{user_id}/chat - AI 챗봇 상담
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            message = body.get('message')
            if not message:
                return create_response(400, {'error': 'message 필드가 필요합니다'})
            
            chat_result = ai_service.chat_with_ai(user_id, message)
            return create_response(201, {'chat': chat_result})
        
        elif http_method == 'GET' and '/chat' in path:
            # GET /users/{user_id}/chat - 채팅 기록 조회
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            query_params = event.get('queryStringParameters') or {}
            limit = int(query_params.get('limit', 20))
            
            chat_history = ai_service.get_chat_history(user_id, limit)
            return create_response(200, {'chat_history': chat_history})
        
        else:
            return create_response(404, {'error': '지원하지 않는 경로입니다'})
    
    except Exception as e:
        logger.error(f"Lambda 실행 오류: {e}")
        return create_response(500, {'error': '서버 내부 오류가 발생했습니다'})