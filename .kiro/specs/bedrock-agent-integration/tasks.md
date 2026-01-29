# Implementation Plan: Bedrock Agent Integration

## Overview

This implementation plan breaks down the Bedrock Agent integration into discrete coding tasks. The approach follows an incremental pattern: first updating the BioPathway_Calculator to use real RDS data, then implementing the AI_Services_Lambda handlers to invoke the Bedrock Agent, and finally wiring everything together with proper error handling and testing.

## Tasks

- [ ] 1. Update BioPathway_Calculator Lambda for RDS integration
  - [x] 1.1 Add database connection logic to BioPathway_Calculator
    - Import psycopg2 and implement get_db_connection() function
    - Read database credentials from environment variables (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT)
    - Add connection pooling and proper cleanup
    - _Requirements: 1.4, 8.4_
  
  - [x] 1.2 Implement get_user_schedule() function
    - Write SQL query to fetch schedule by user_id and target_date
    - Add ORDER BY created_at DESC LIMIT 1 to handle duplicate records
    - Return ScheduleRecord with shift_type extracted from database
    - _Requirements: 1.1, 1.2, 7.5_
  
  - [x] 1.3 Add shift_type mapping logic
    - Create mapping function from database values ('day', 'evening', 'night', 'off') to BIO_RULES keys ('D', 'E', 'N', 'O')
    - Update apply_bio_rules() to use mapped shift_type
    - _Requirements: 4.1_
  
  - [x] 1.4 Update lambda_handler to use RDS instead of mock data
    - Replace mock data with call to get_user_schedule()
    - Pass retrieved shift_type to apply_bio_rules()
    - Return structured response with sleep, coffee, and tip
    - _Requirements: 1.1, 1.2, 4.1_
  
  - [x] 1.5 Write property test for database query and extraction
    - **Property 1: Database Query and Extraction**
    - **Validates: Requirements 1.1, 1.2**
  
  - [x] 1.6 Write property test for BIO_RULES application
    - **Property 2: BIO_RULES Application**
    - **Validates: Requirements 4.1, 4.6**
  
  - [x] 1.7 Write unit tests for specific shift types
    - Test D shift returns sleep "23:00" and coffee "14:00"
    - Test N shift returns sleep "09:00" and coffee "03:00"
    - Test E shift returns sleep "02:00" and coffee "18:00"
    - Test O shift returns sleep "23:00" and coffee "15:00"
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  
  - [x] 1.8 Write edge case tests for error handling
    - Test no schedule found returns appropriate error
    - Test database connection failure handling
    - Test multiple records returns most recent
    - _Requirements: 1.3, 1.5, 7.2, 7.5_

- [ ] 2. Implement AI_Services_Lambda core functions
  - [x] 2.1 Create Bedrock Agent invocation helper
    - Import boto3 and create bedrock-agent-runtime client
    - Implement invoke_bedrock_agent() function with agent_id, alias_id, session_id, and prompt parameters
    - Read BEDROCK_AGENT_ID, BEDROCK_AGENT_ALIAS_ID, and BEDROCK_REGION from environment variables
    - Add timeout handling and error catching
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 2.2 Implement response parsing logic
    - Create parse_agent_response() function to extract completion text
    - Add regex or string parsing to extract time values in HH:MM format
    - Handle cases where agent response doesn't contain expected data
    - _Requirements: 2.3, 3.3_
  
  - [x] 2.3 Create response formatting helpers
    - Implement create_success_response() for 200 responses with CORS headers
    - Implement create_error_response() for error responses with CORS headers
    - Ensure all responses include Access-Control-Allow-Origin header
    - _Requirements: 6.3, 6.4, 6.5_
  
  - [x] 2.4 Write property test for agent parameter passing
    - **Property 5: Agent Parameter Passing**
    - **Validates: Requirements 5.5**
  
  - [x] 2.5 Write property tests for response parsing
    - **Property 6: Sleep Time Parsing**
    - **Property 7: Caffeine Time Parsing**
    - **Validates: Requirements 2.3, 3.3**
  
  - [x] 2.6 Write property test for CORS headers
    - **Property 10: CORS Headers Presence**
    - **Validates: Requirements 6.5**

- [ ] 3. Checkpoint - Verify core infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement generate_sleep_plan handler
  - [x] 4.1 Create generate_sleep_plan() function in handler.py
    - Parse user_id from path parameters and target_date from request body
    - Validate input parameters (non-empty user_id, valid date format)
    - Create Korean prompt: "오늘/내일의 최적 수면 시간을 알려주세요"
    - Call invoke_bedrock_agent() with prompt
    - _Requirements: 2.1, 2.2_
  
  - [x] 4.2 Add response processing for sleep plans
    - Parse agent response to extract sleep_time
    - Extract shift_type and tip from BioPathway_Calculator response
    - Create SleepPlan object with sleep_time, shift_type, tip, and generated_at
    - Return formatted JSON response with 200 status
    - _Requirements: 2.3, 2.4_
  
  - [x] 4.3 Add error handling for sleep plan generation
    - Catch NoScheduleFoundError and return 404 response
    - Catch AgentTimeoutError and return 504 response
    - Catch all other exceptions and return 500 response
    - Log all errors with appropriate context
    - _Requirements: 2.5, 7.1, 5.6_
  
  - [x] 4.4 Write property test for sleep plan response structure
    - **Property 3: Sleep Plan Response Structure**
    - **Validates: Requirements 2.4, 6.1**
  
  - [x] 4.5 Write property test for Bedrock Agent invocation
    - **Property 11: Bedrock Agent Invocation for Sleep Plans**
    - **Validates: Requirements 2.1**
  
  - [x] 4.6 Write unit test for sleep prompt
    - Verify prompt contains "최적 수면 시간"
    - _Requirements: 2.2_

- [ ] 5. Implement generate_caffeine_plan handler
  - [x] 5.1 Create generate_caffeine_plan() function in handler.py
    - Parse user_id from path parameters and target_date from request body
    - Validate input parameters (non-empty user_id, valid date format)
    - Create Korean prompt: "오늘/내일의 카페인 섭취 마감 시간을 알려주세요"
    - Call invoke_bedrock_agent() with prompt
    - _Requirements: 3.1, 3.2_
  
  - [x] 5.2 Add response processing for caffeine plans
    - Parse agent response to extract coffee_time
    - Extract shift_type and tip from BioPathway_Calculator response
    - Create CaffeinePlan object with coffee_time, shift_type, tip, and generated_at
    - Return formatted JSON response with 200 status
    - _Requirements: 3.3, 3.4_
  
  - [x] 5.3 Add error handling for caffeine plan generation
    - Catch NoScheduleFoundError and return 404 response
    - Catch AgentTimeoutError and return 504 response
    - Catch all other exceptions and return 500 response
    - Log all errors with appropriate context
    - _Requirements: 7.1, 5.6_
  
  - [x] 5.4 Write property test for caffeine plan response structure
    - **Property 4: Caffeine Plan Response Structure**
    - **Validates: Requirements 3.4, 6.2**
  
  - [x] 5.5 Write property test for Bedrock Agent invocation
    - **Property 12: Bedrock Agent Invocation for Caffeine Plans**
    - **Validates: Requirements 3.1**
  
  - [x] 5.6 Write unit test for caffeine prompt
    - Verify prompt contains "카페인 섭취 마감 시간"
    - _Requirements: 3.2_

- [ ] 6. Add configuration validation and error handling
  - [x] 6.1 Create validate_config() function
    - Check all required environment variables are present
    - Validate BEDROCK_AGENT_ID, BEDROCK_AGENT_ALIAS_ID, BEDROCK_REGION
    - Validate database connection parameters
    - Raise ConfigurationError with descriptive message if any are missing
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 6.2 Add custom exception classes
    - Create NoScheduleFoundError, DatabaseConnectionError, AgentTimeoutError, AgentInvocationError, ConfigurationError, ValidationError
    - Each exception should include message and optional details dict
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 6.3 Implement input validation helper
    - Create validate_input() function for user_id and target_date
    - Check user_id is non-empty string
    - Check target_date matches YYYY-MM-DD format
    - Raise ValidationError for invalid inputs
    - _Requirements: 7.4_
  
  - [x] 6.4 Write property test for error response structure
    - **Property 8: Error Response Structure**
    - **Validates: Requirements 6.3**
  
  - [x] 6.5 Write property test for HTTP status code mapping
    - **Property 9: HTTP Status Code Mapping**
    - **Validates: Requirements 6.4**
  
  - [x] 6.6 Write edge case tests for error scenarios
    - Test missing environment variables
    - Test invalid date format
    - Test agent unexpected response format
    - _Requirements: 7.3, 7.4_

- [ ] 7. Checkpoint - Verify error handling
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Update Lambda deployment configuration
  - [x] 8.1 Update BioPathway_Calculator requirements.txt
    - Add psycopg2-binary for PostgreSQL connection
    - Pin versions for all dependencies
  
  - [x] 8.2 Update AI_Services_Lambda requirements.txt
    - Add boto3 (if not already present)
    - Add any additional dependencies for parsing
    - Pin versions for all dependencies
  
  - [x] 8.3 Update deployment scripts
    - Ensure deploy_lambda.py includes both BioPathway_Calculator and AI_Services_Lambda
    - Add environment variable configuration for both Lambdas
    - Verify VPC configuration for RDS access

- [ ] 9. Create integration test suite
  - [x] 9.1 Write end-to-end integration tests
    - Test complete flow from API Gateway to database and back
    - Use Docker container for local PostgreSQL testing
    - Mock Bedrock Agent for integration tests
    - Verify all components work together correctly
  
  - [x] 9.2 Write database integration tests
    - Test actual database connection and queries
    - Test transaction handling and cleanup
    - Test connection pooling behavior

- [ ] 10. Final checkpoint and documentation
  - [x] 10.1 Update environment variable documentation
    - Document all required environment variables in backend/.env.example
    - Add comments explaining each variable's purpose
  
  - [x] 10.2 Verify all tests pass
    - Run full test suite with pytest
    - Verify property tests run minimum 100 iterations
    - Check test coverage meets 80% minimum
  
  - [x] 10.3 Final integration verification
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows an incremental approach: database integration → agent invocation → error handling → testing
