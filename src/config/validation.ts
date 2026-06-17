import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('debug'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),

  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

  S3_ENDPOINT: Joi.string().default('http://minio:9000'),
  S3_ACCESS_KEY: Joi.string().default('nabdh_minio'),
  S3_SECRET_KEY: Joi.string().default('nabdh_minio_secret'),
  S3_BUCKET: Joi.string().default('nabdh-documents'),
  S3_REGION: Joi.string().default('us-east-1'),

  PAYMOB_API_KEY: Joi.string().default('stub'),
  FAWRY_MERCHANT_CODE: Joi.string().default('stub'),
  FCM_SERVER_KEY: Joi.string().default('stub'),
  SMS_PROVIDER: Joi.string().default('stub'),
  OSRM_BASE_URL: Joi.string().default('http://router.project-osrm.org'),

  COMMISSION_RATE_DEFAULT: Joi.number().default(0.18),
  SOS_PRICE_MULTIPLIER: Joi.number().default(1.5),
  NURSE_MIN_PREPAID_BALANCE: Joi.number().default(100),
  NURSE_VERIFICATION_SLA_HOURS: Joi.number().default(72),
  NURSE_SEARCH_RADIUS_KM: Joi.number().default(15),
});
