// src/lib/r2/cliente.ts
import { S3Client } from '@aws-sdk/client-s3'

if (!process.env.R2_ENDPOINT) {
  throw new Error('Variável de ambiente R2_ENDPOINT não definida')
}
if (!process.env.R2_ACCESS_KEY_ID) {
  throw new Error('Variável de ambiente R2_ACCESS_KEY_ID não definida')
}
if (!process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error('Variável de ambiente R2_SECRET_ACCESS_KEY não definida')
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'nextstepai-curriculos'