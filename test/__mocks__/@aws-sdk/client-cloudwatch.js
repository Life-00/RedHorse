// AWS CloudWatch SDK 모킹
const StandardUnit = {
  Count: 'Count',
  Milliseconds: 'Milliseconds',
  Seconds: 'Seconds',
  Bytes: 'Bytes',
  Percent: 'Percent'
};

const CloudWatchClient = jest.fn().mockImplementation(() => ({
  send: jest.fn().mockResolvedValue({})
}));

const PutMetricDataCommand = jest.fn().mockImplementation((params) => params);

module.exports = {
  CloudWatchClient,
  PutMetricDataCommand,
  StandardUnit
};