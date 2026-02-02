# Requirements Document

## Introduction

This document specifies the requirements for integrating AWS Bedrock Agent (ShiftSync-Bio-Coach) with the frontend application to provide AI-powered sleep and caffeine recommendations for shift workers. The integration will connect existing frontend API calls to a Bedrock Agent that uses real user schedule data from RDS to generate personalized biorhythm-based recommendations.

## Glossary

- **Bedrock_Agent**: AWS Bedrock Agent service instance (ShiftSync-Bio-Coach) that provides AI-powered recommendations
- **BioPathway_Calculator**: AWS Lambda function that calculates biorhythm recommendations based on shift type
- **AI_Services_Lambda**: AWS Lambda function that handles frontend API requests and invokes the Bedrock Agent
- **RDS**: AWS Relational Database Service (PostgreSQL) storing user schedule data
- **Shift_Type**: Classification of work shift (D=day, E=evening, N=night, O=off)
- **Sleep_Plan**: Personalized recommendation for optimal sleep timing based on work schedule
- **Caffeine_Plan**: Personalized recommendation for caffeine intake cutoff time
- **Target_Date**: The date for which recommendations are being requested
- **Caffeine_Half_Life**: The time it takes for caffeine concentration to reduce by half (5 hours)

## Requirements

### Requirement 1: RDS Schedule Data Integration

**User Story:** As a shift worker, I want the system to use my actual work schedule, so that I receive accurate personalized recommendations based on my real shifts.

#### Acceptance Criteria

1. WHEN the BioPathway_Calculator receives a request with user_id and target_date, THE BioPathway_Calculator SHALL query the RDS schedules table for matching records
2. WHEN a schedule record exists for the user_id and target_date, THE BioPathway_Calculator SHALL extract the shift_type from the database record
3. WHEN no schedule record exists for the user_id and target_date, THE BioPathway_Calculator SHALL return an error indicating no schedule data available
4. THE BioPathway_Calculator SHALL use the database connection parameters from environment variables
5. WHEN the database query fails, THE BioPathway_Calculator SHALL return a descriptive error message

### Requirement 2: Sleep Plan Generation

**User Story:** As a shift worker, I want to receive AI-powered sleep recommendations, so that I can optimize my sleep schedule around my work shifts.

#### Acceptance Criteria

1. WHEN the frontend calls generateSleepPlan() with user_id and target_date, THE AI_Services_Lambda SHALL invoke the Bedrock_Agent with a sleep-focused prompt
2. WHEN the Bedrock_Agent is invoked for sleep recommendations, THE AI_Services_Lambda SHALL include the prompt "오늘/내일의 최적 수면 시간을 알려주세요"
3. WHEN the Bedrock_Agent returns a response, THE AI_Services_Lambda SHALL parse the sleep time from the response
4. WHEN the sleep plan is successfully generated, THE AI_Services_Lambda SHALL return a structured response containing sleep_time, shift_type, and recommendation_tip
5. WHEN the Bedrock_Agent invocation fails, THE AI_Services_Lambda SHALL return an error response with appropriate error details

### Requirement 3: Caffeine Plan Generation

**User Story:** As a shift worker, I want to know when to stop consuming caffeine, so that it doesn't interfere with my sleep quality.

#### Acceptance Criteria

1. WHEN the frontend calls generateCaffeinePlan() with user_id and target_date, THE AI_Services_Lambda SHALL invoke the Bedrock_Agent with a caffeine-focused prompt
2. WHEN the Bedrock_Agent is invoked for caffeine recommendations, THE AI_Services_Lambda SHALL include the prompt "오늘/내일의 카페인 섭취 마감 시간을 알려주세요"
3. WHEN the Bedrock_Agent returns a response, THE AI_Services_Lambda SHALL parse the caffeine cutoff time from the response
4. WHEN the caffeine plan is successfully generated, THE AI_Services_Lambda SHALL return a structured response containing coffee_time, shift_type, and recommendation_tip
5. THE BioPathway_Calculator SHALL consider the Caffeine_Half_Life of 5 hours when calculating cutoff times using BIO_RULES

### Requirement 4: Biorhythm Calculation Logic

**User Story:** As a shift worker, I want recommendations that follow proven biorhythm principles, so that the advice is scientifically sound and effective.

#### Acceptance Criteria

1. WHEN the BioPathway_Calculator receives a shift_type, THE BioPathway_Calculator SHALL apply the corresponding BIO_RULES for that shift type
2. WHEN the shift_type is "D" (day), THE BioPathway_Calculator SHALL return sleep time "23:00" and coffee time "14:00"
3. WHEN the shift_type is "N" (night), THE BioPathway_Calculator SHALL return sleep time "09:00" and coffee time "03:00"
4. WHEN the shift_type is "E" (evening), THE BioPathway_Calculator SHALL return sleep time "02:00" and coffee time "18:00"
5. WHEN the shift_type is "O" (off), THE BioPathway_Calculator SHALL return sleep time "23:00" and coffee time "15:00"
6. FOR ALL shift types, THE BioPathway_Calculator SHALL include an appropriate recommendation tip in Korean

### Requirement 5: Bedrock Agent Invocation

**User Story:** As a system administrator, I want the Lambda functions to properly invoke the Bedrock Agent, so that the AI service is correctly integrated.

#### Acceptance Criteria

1. THE AI_Services_Lambda SHALL use boto3 bedrock-agent-runtime client to invoke the Bedrock_Agent
2. WHEN invoking the Bedrock_Agent, THE AI_Services_Lambda SHALL use the BEDROCK_AGENT_ID from environment variables
3. WHEN invoking the Bedrock_Agent, THE AI_Services_Lambda SHALL use the BEDROCK_AGENT_ALIAS_ID from environment variables
4. WHEN invoking the Bedrock_Agent, THE AI_Services_Lambda SHALL specify the BEDROCK_REGION from environment variables
5. THE AI_Services_Lambda SHALL pass user_id and target_date as parameters to the Bedrock_Agent
6. WHEN the Bedrock_Agent invocation times out, THE AI_Services_Lambda SHALL return a timeout error response

### Requirement 6: API Response Structure

**User Story:** As a frontend developer, I want consistent API response structures, so that I can reliably parse and display the recommendations.

#### Acceptance Criteria

1. WHEN a sleep plan is successfully generated, THE AI_Services_Lambda SHALL return a JSON response with fields: sleep_time, shift_type, tip, and generated_at
2. WHEN a caffeine plan is successfully generated, THE AI_Services_Lambda SHALL return a JSON response with fields: coffee_time, shift_type, tip, and generated_at
3. WHEN an error occurs, THE AI_Services_Lambda SHALL return a JSON response with fields: error, message, and status_code
4. THE AI_Services_Lambda SHALL set appropriate HTTP status codes (200 for success, 404 for no schedule, 500 for server errors)
5. THE AI_Services_Lambda SHALL include CORS headers in all responses

### Requirement 7: Error Handling and Edge Cases

**User Story:** As a shift worker, I want clear error messages when something goes wrong, so that I understand why I'm not receiving recommendations.

#### Acceptance Criteria

1. WHEN a user has no schedule data for the requested date, THE AI_Services_Lambda SHALL return a 404 status with message "No schedule found for the specified date"
2. WHEN the database connection fails, THE BioPathway_Calculator SHALL return an error indicating database connectivity issues
3. WHEN the Bedrock_Agent returns an unexpected response format, THE AI_Services_Lambda SHALL log the error and return a generic error message
4. WHEN required environment variables are missing, THE Lambda functions SHALL fail gracefully with descriptive error messages
5. WHEN the RDS query returns multiple records for the same user_id and target_date, THE BioPathway_Calculator SHALL use the most recently created record

### Requirement 8: Environment Configuration

**User Story:** As a system administrator, I want proper environment configuration, so that the system can be deployed across different environments.

#### Acceptance Criteria

1. THE AI_Services_Lambda SHALL read BEDROCK_AGENT_ID from environment variables
2. THE AI_Services_Lambda SHALL read BEDROCK_AGENT_ALIAS_ID from environment variables
3. THE AI_Services_Lambda SHALL read BEDROCK_REGION from environment variables
4. THE BioPathway_Calculator SHALL read database connection parameters (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT) from environment variables
5. WHEN any required environment variable is missing, THE Lambda function SHALL raise a configuration error at initialization
