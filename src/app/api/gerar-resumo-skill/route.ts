// src/app/api/gerar-resumo-skill/route.ts
import { NextResponse } from 'next/server';
import { criarLLM } from '@/lib/langchain/llm';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export const runtime = 'nodejs';
export const maxDuration = 30;

const PROMPT_SISTEMA = `Você é um especialista em tecnologia e educação. 
Gere um resumo detalhado sobre a habilidade solicitada no seguinte formato MARKDOWN:

## O que é e por que aprender?
(Explicação concisa do que é a tecnologia/framework/ferramenta e sua importância no mercado)

## O que focar primeiro?
- Item 1
- Item 2
- Item 3

## Como praticar?
- Sugestão prática 1
- Sugestão prática 2

## Pré-requisitos
- Item 1, Item 2, Item 3

Use **negrito** para termos importantes. Mantenha tom profissional, porém acessível.`;

export async function POST(req: Request) {
  try {
    const { skill } = await req.json();
    if (!skill || typeof skill !== 'string') {
      return NextResponse.json({ error: 'Skill inválida' }, { status: 400 });
    }

    const llm = criarLLM('principal');
    const resposta = await llm.invoke([
      new SystemMessage(PROMPT_SISTEMA),
      new HumanMessage(`Gere um resumo para a habilidade: ${skill}`),
    ]);

    const conteudo = resposta.content.toString();
    return NextResponse.json({ resumo: conteudo });
  } catch (error) {
    console.error('[gerar-resumo-skill] erro:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar resumo. Tente novamente.' },
      { status: 500 }
    );
  }
}