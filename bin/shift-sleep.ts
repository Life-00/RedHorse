#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ShiftSleepStack } from '../lib/shift-sleep-stack';

const app = new cdk.App();

// 개발 환경 - us-east-1 리전 사용
new ShiftSleepStack(app, 'ShiftSleepDev', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1' // 버지니아 북부 리전 사용
  },
  stage: 'dev',
  enableDetailedMonitoring: false,
  logRetentionDays: 7
});

// 스테이징 환경
new ShiftSleepStack(app, 'ShiftSleepStaging', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
  },
  stage: 'staging',
  enableDetailedMonitoring: true,
  logRetentionDays: 30
});

// 프로덕션 환경
new ShiftSleepStack(app, 'ShiftSleepProd', {
  env: {
    account: process.env.PROD_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
  },
  stage: 'prod',
  enableDetailedMonitoring: true,
  logRetentionDays: 90,
  enableBackup: true,
  enableMultiAZ: true
});