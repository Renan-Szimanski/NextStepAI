// src\app\api\curriculo\processar\route.ts

import { auth } from '@/lib/auth';
import { buscarCurriculo, atualizarTextoCurriculo } from '@/lib/supabase/curriculo';
import { gerarUrlLeitura } from '@/lib/r2/operacoes';
import { getDocumentProxy, extractText } from 'unpdf';
import { criarLLM } from '@/lib/langchain/llm';
import type { DadosCurriculo } from '@/tipos/curriculo';

// Esta rota é chamada após o upload do currículo (fire-and-forget)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DADOS_VAZIO: DadosCurriculo = {
  formacao: [],
  experiencias: [],
  habilidades: [],
  idiomas: [],
};

export async function POST() {
  const sessao = await auth();
  if (!sessao?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const usuarioId = (sessao.user as { id?: string }).id ?? sessao.user.email;
  if (!usuarioId) {
    return new Response('Invalid session', { status: 401 });
  }

  const curriculo = await buscarCurriculo(usuarioId);
  if (!curriculo) {
    return new Response('No resume found', { status: 404 });
  }

  // Se já foi processado, retorna imediatamente
  if (curriculo.textoExtraido && curriculo.textoExtraido.length > 100) {
    return new Response('Already processed', { status: 200 });
  }

  // Processamento em background (sem bloquear a resposta)
  (async () => {
    try {
      console.log('[background] Iniciando processamento do currículo para', usuarioId);
      
      // 1. Extrair texto do PDF
      const url = await gerarUrlLeitura(curriculo.chaveR2);
      const fetchRes = await fetch(url);
      const buffer = await fetchRes.arrayBuffer();
      const pdfUint8 = new Uint8Array(buffer);
      const pdfDoc = await getDocumentProxy(pdfUint8);
      const { text } = await extractText(pdfDoc, { mergePages: true });
      const textoLimpo = text.replace(/\n{3,}/g, '\n\n').trim();
      
      if (textoLimpo.length < 100) {
        console.warn('[background] Texto extraído muito curto, ignorando');
        return;
      }
      
      // Salva texto extraído (usando DADOS_VAZIO como fallback)
      await atualizarTextoCurriculo(
        curriculo.id,
        textoLimpo,
        curriculo.dadosEstruturados || DADOS_VAZIO
      );
      console.log('[background] Texto extraído e salvo');
      
      // 2. Estruturar dados (chamada ao LLM)
      const llm = criarLLM('principal');
      const promptSistema = `Você é um parser de currículos. Extraia SOMENTE os dados presentes no texto fornecido. NÃO invente ou infira informações ausentes.

Responda APENAS com um objeto JSON válido, sem texto adicional, sem \`\`\`json, sem explicações. Use null para campos ausentes.

Esquema esperado:
{
  "nome": string | null,
  "email": string | null,
  "telefone": string | null,
  "formacao": string[],
  "experiencias": [
    {
      "cargo": string,
      "empresa": string,
      "periodo": string | null,
      "descricao": string | null
    }
  ],
  "habilidades": string[],
  "idiomas": string[],
  "resumo": string | null
}`;

      const resposta = await llm.invoke([
        { role: 'system', content: promptSistema },
        { role: 'user', content: `Texto do currículo:\n${textoLimpo.slice(0, 8000)}` },
      ]);
      
      const conteudo = typeof resposta.content === 'string' ? resposta.content : String(resposta.content);
      let limpo = conteudo.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const match = limpo.match(/\{[\s\S]*\}/);
      if (match) limpo = match[0];
      const dados = JSON.parse(limpo) as DadosCurriculo;
      
      const dadosEstruturados: DadosCurriculo = {
        nome: dados.nome ?? undefined,
        email: dados.email ?? undefined,
        telefone: dados.telefone ?? undefined,
        formacao: Array.isArray(dados.formacao) ? dados.formacao : [],
        experiencias: Array.isArray(dados.experiencias) ? dados.experiencias.map(exp => ({
          cargo: exp.cargo ?? '',
          empresa: exp.empresa ?? '',
          periodo: exp.periodo ?? undefined,
          descricao: exp.descricao ?? undefined,
        })) : [],
        habilidades: Array.isArray(dados.habilidades) ? dados.habilidades : [],
        idiomas: Array.isArray(dados.idiomas) ? dados.idiomas : [],
        resumo: dados.resumo ?? undefined,
      };
      
      await atualizarTextoCurriculo(curriculo.id, textoLimpo, dadosEstruturados);
      console.log('[background] Dados estruturados salvos com sucesso');
    } catch (err) {
      console.error('[background] Falha no processamento assíncrono:', err);
    }
  })();

  // Retorna imediatamente, sem esperar o processamento
  return new Response('Processing started in background', { status: 202 });
}