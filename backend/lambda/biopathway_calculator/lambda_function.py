import json
import os
import pg8000
from datetime import datetime

# BIO_RULES: 근무 유형별 바이오리듬 규칙
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

# Shift type mapping: database format -> BIO_RULES key
SHIFT_TYPE_MAPPING = {
    'day': 'D',
    'evening': 'E',
    'night': 'N',
    'off': 'O'
}


def get_db_connection():
    """
    Create database connection using environment variables
    
    Returns:
        pg8000 connection object
    """
    try:
        conn = pg8000.connect(
            host=os.environ['DB_HOST'],
            port=int(os.environ.get('DB_PORT', '5432')),
            database=os.environ['DB_NAME'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            ssl_context=True  # Enable SSL for RDS
        )
        return conn
    except Exception as e:
        print(f"❌ Database connection error: {str(e)}")
        raise


def get_user_schedule(user_id: str, target_date: str):
    """
    Query RDS for user schedule
    
    Args:
        user_id: User identifier
        target_date: Date to query (YYYY-MM-DD)
        
    Returns:
        Dictionary with shift_type or None if not found
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT shift_type, start_time, end_time
            FROM schedules
            WHERE user_id = %s AND work_date = %s
            ORDER BY created_at DESC
            LIMIT 1
        """
        
        print(f"🔍 Querying schedule for user_id={user_id}, date={target_date}")
        cursor.execute(query, (user_id, target_date))
        result = cursor.fetchone()
        
        if not result:
            print(f"⚠️  No schedule found for user {user_id} on {target_date}")
            return None
        
        shift_type_db, start_time, end_time = result
        print(f"✅ Found schedule: shift_type={shift_type_db}")
        
        return {
            'shift_type': shift_type_db,
            'start_time': str(start_time) if start_time else None,
            'end_time': str(end_time) if end_time else None
        }
        
    except Exception as e:
        print(f"❌ Error querying schedule: {str(e)}")
        raise
    finally:
        if conn:
            conn.close()


def apply_bio_rules(shift_type: str):
    """
    Apply BIO_RULES based on shift type
    
    Args:
        shift_type: One of 'D', 'E', 'N', 'O'
        
    Returns:
        Dictionary with sleep, coffee, and tip
    """
    # Map database shift_type to BIO_RULES key
    bio_key = SHIFT_TYPE_MAPPING.get(shift_type, shift_type)
    
    # Get rules, default to 'D' if not found
    rules = BIO_RULES.get(bio_key, BIO_RULES['D'])
    
    print(f"📋 Applied BIO_RULES for shift_type={shift_type} (key={bio_key})")
    
    return {
        'sleep': rules['sleep'],
        'coffee': rules['coffee'],
        'tip': rules['tip'],
        'shift_type': bio_key
    }


def lambda_handler(event, context):
    """
    Main handler for biorhythm calculation
    
    Args:
        event: Contains user_id and target_date (or parameters array from Bedrock Agent)
        context: Lambda context
        
    Returns:
        Biorhythm recommendation data
    """
    print(f"📥 Received event: {json.dumps(event)}")
    
    try:
        # Handle Bedrock Agent format (parameters array)
        if 'parameters' in event:
            parameters = event.get('parameters', [])
            user_id = next((p['value'] for p in parameters if p['name'] == 'user_id'), None)
            target_date = next((p['value'] for p in parameters if p['name'] == 'target_date'), None)
        else:
            # Handle direct invocation format
            user_id = event.get('user_id')
            target_date = event.get('target_date')
        
        if not user_id or not target_date:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'ValidationError',
                    'message': 'user_id and target_date are required'
                }, ensure_ascii=False)
            }
        
        print(f"👤 Processing request for user_id={user_id}, target_date={target_date}")
        
        # Query user schedule from RDS
        schedule = get_user_schedule(user_id, target_date)
        
        if not schedule:
            return {
                'statusCode': 404,
                'body': json.dumps({
                    'error': 'NoScheduleFound',
                    'message': f'No schedule found for user {user_id} on {target_date}'
                }, ensure_ascii=False)
            }
        
        # Apply BIO_RULES
        bio_result = apply_bio_rules(schedule['shift_type'])
        
        # Prepare response
        response_data = {
            'date': target_date,
            'shift': bio_result['shift_type'],
            'sleep': bio_result['sleep'],
            'coffee': bio_result['coffee'],
            'tip': bio_result['tip']
        }
        
        print(f"✅ Successfully generated biorhythm data: {json.dumps(response_data, ensure_ascii=False)}")
        
        # Return format for Bedrock Agent
        if 'parameters' in event:
            return {
                'messageVersion': '1.0',
                'response': {
                    'actionGroup': event.get('actionGroup', 'GetBioPathwayAction'),
                    'function': event.get('function', 'get_daily_biorhythm'),
                    'functionResponse': {
                        'responseBody': {
                            'TEXT': {
                                'body': json.dumps(response_data, ensure_ascii=False)
                            }
                        }
                    }
                }
            }
        else:
            # Direct invocation format
            return {
                'statusCode': 200,
                'body': json.dumps(response_data, ensure_ascii=False)
            }
        
    except Exception as e:
        print(f"❌ Error in lambda_handler: {str(e)}")
        error_response = {
            'error': 'InternalServerError',
            'message': str(e)
        }
        
        if 'parameters' in event:
            return {
                'messageVersion': '1.0',
                'response': {
                    'actionGroup': event.get('actionGroup', 'GetBioPathwayAction'),
                    'function': event.get('function', 'get_daily_biorhythm'),
                    'functionResponse': {
                        'responseBody': {
                            'TEXT': {
                                'body': json.dumps(error_response, ensure_ascii=False)
                            }
                        }
                    }
                }
            }
        else:
            return {
                'statusCode': 500,
                'body': json.dumps(error_response, ensure_ascii=False)
            }
