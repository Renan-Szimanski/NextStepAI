// src/lib/r2/operacoes.ts
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2Client, BUCKET_NAME } from './cliente'

/**
 * Gera uma URL assinada para upload de um arquivo no R2.
 * @param chave - Caminho/nome do objeto no bucket (ex: curriculos/usuario123/1234567890-meu-curriculo.pdf)
 * @param tipoConteudo - Tipo MIME (ex: 'application/pdf')
 * @returns URL assinada válida por 5 minutos
 */
export async function gerarUrlUpload(chave: string, tipoConteudo: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: chave,
    ContentType: tipoConteudo,
  })

  // URL válida por 5 minutos (300 segundos)
  return getSignedUrl(r2Client, command, { expiresIn: 300 })
}

/**
 * Gera uma URL assinada para leitura de um arquivo no R2.
 * @param chave - Caminho/nome do objeto
 * @returns URL assinada válida por 1 hora
 */
export async function gerarUrlLeitura(chave: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: chave,
  })
  // URL válida por 1 hora (3600 segundos)
  return getSignedUrl(r2Client, command, { expiresIn: 3600 })
}

/**
 * Deleta um arquivo do R2.
 * @param chave - Caminho/nome do objeto
 */
export async function deletarArquivo(chave: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: chave,
  })
  await r2Client.send(command)
}