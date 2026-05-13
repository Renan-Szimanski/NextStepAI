import 'dotenv/config'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function testar() {
  const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: 'teste.txt',
    ContentType: 'text/plain',
  });
  const url = await getSignedUrl(client, command, { expiresIn: 60 });
  console.log('✅ URL gerada com sucesso:', url);
}

testar().catch(console.error);