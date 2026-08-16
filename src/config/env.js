import 'dotenv/config';

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databasePath: process.env.DATABASE_PATH || './data/bhasha-trade.sqlite',
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES || 10)
});
