#!/usr/bin/env node

/**
 * 데이터베이스 마이그레이션 스크립트
 * PostgreSQL 스키마 생성 및 업데이트
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../services/database.service';
import { Logger } from '../services/logger.service';

const logger = Logger.create('migration-script', 'database-migration');

async function runMigration() {
  try {
    logger.info('Starting database migration');

    // 스키마 파일 읽기
    const schemaPath = join(__dirname, '../database/schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');

    // 스키마 실행
    logger.info('Executing schema creation');
    await db.query(schemaSql);

    logger.info('Database migration completed successfully');
    
    // 연결 종료
    await db.close();
    
    process.exit(0);
  } catch (error) {
    logger.error('Database migration failed', error as Error);
    
    // 연결 종료
    try {
      await db.close();
    } catch (closeError) {
      logger.error('Failed to close database connection', closeError as Error);
    }
    
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  runMigration();
}