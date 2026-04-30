// scripts/popular-banco.ts

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { convert as htmlToText } from 'html-to-text';
import { supabaseAdmin } from '@/lib/supabase/server';
import { gerarEmbeddingsLote } from '@/lib/langchain/embeddings';

const PREFIXO_LOG = '[PopularBanco]';
const ARQUIVO_VAGAS = join(
  process.cwd(),
  'dados',
  'vagas',
  'sinteticas',
  'vagas_tuning.jsonl',
);
const TAMANHO_LOTE = 10;

/**
 * Estrutura crua do arquivo .jsonl (vagas raspadas).
 */
interface VagaCrua {
  title: string;
  content: string; // HTML
}

/**
 * Estrutura normalizada para inserção no banco.
 */
interface VagaNormalizada {
  titulo: string;
  area: string;
  descricao: string;
}

/**
 * Mapeamento de palavras-chave → área.
 * A primeira chave que casar (case-insensitive) define a área.
 * Mantenha as áreas alinhadas com o tipo `Vaga` em src/tipos/vaga.ts.
 */
const MAPA_AREAS: Array<{ palavras: string[]; area: string }> = [
  {
    palavras: [
      'analista de dados',
      'cientista de dados',
      'engenheiro de dados',
      'data analyst',
      'data scientist',
      'data engineer',
      'analytics',
      'bi ',
      'power bi',
    ],
    area: 'Dados',
  },
  {
    palavras: [
      'desenvolvedor',
      'desenvolvedora',
      'programador',
      'engenheiro de software',
      'frontend',
      'backend',
      'full stack',
      'fullstack',
      'devops',
      'mobile',
      'qa ',
      'tester',
      'sre',
      'cloud',
      'sysadmin',
    ],
    area: 'Tecnologia',
  },
  {
    palavras: [
      'product manager',
      'product owner',
      'gerente de produto',
      'product designer',
      'ux designer',
      'ui designer',
      'pesquisador ux',
    ],
    area: 'Produto',
  },
  {
    palavras: [
      'designer gráfico',
      'designer visual',
      'motion designer',
      'ilustrador',
    ],
    area: 'Design',
  },
  {
    palavras: [
      'marketing',
      'growth',
      'social media',
      'mídia',
      'tráfego',
      'seo ',
      'copywriter',
      'redator',
    ],
    area: 'Marketing',
  },
  {
    palavras: [
      'comercial',
      'vendedor',
      'vendedora',
      'consultor',
      'consultora',
      'sdr',
      'pré-vendas',
      'closer',
      'account executive',
    ],
    area: 'Vendas',
  },
  {
    palavras: [
      'rh ',
      'recursos humanos',
      'recrutador',
      'recrutadora',
      'people',
      'pessoas',
      'talent',
    ],
    area: 'Recursos Humanos',
  },
  {
    palavras: [
      'enfermeiro',
      'enfermeira',
      'médico',
      'médica',
      'fisioterapeuta',
      'farmacêutico',
      'técnico de enfermagem',
    ],
    area: 'Saúde',
  },
  {
    palavras: [
      'advogado',
      'advogada',
      'paralegal',
      'jurídico',
      'jurídica',
    ],
    area: 'Jurídico',
  },
  {
    palavras: [
      'financeiro',
      'contábil',
      'contador',
      'contadora',
      'controller',
      'fp&a',
    ],
    area: 'Financeiro',
  },
  {
    palavras: [
      'logística',
      'logistico',
      'auxiliar de logística',
      'almoxarife',
      'estoquista',
      'motorista',
      'auxiliar de produção',
    ],
    area: 'Logística e Operações',
  },
  {
    palavras: [
      'atendente',
      'recepcionista',
      'sac',
      'customer success',
      'customer service',
      'suporte ao cliente',
    ],
    area: 'Atendimento',
  },
  {
    palavras: [
      'professor',
      'professora',
      'tutor',
      'coordenador acadêmico',
      'coordenadora acadêmica',
    ],
    area: 'Educação',
  },
];

/**
 * Inferir a área a partir do título da vaga.
 */
function inferirArea(titulo: string): string {
  const tituloLower = titulo.toLowerCase();
  for (const { palavras, area } of MAPA_AREAS) {
    if (palavras.some((palavra) => tituloLower.includes(palavra))) {
      return area;
    }
  }
  return 'Outros';
}

/**
 * Converte HTML em texto limpo, preservando listas e quebras de parágrafo.
 */
function limparHtml(html: string): string {
  return htmlToText(html, {
    wordwrap: false,
    selectors: [
      // Remove links — só queremos o texto
      { selector: 'a', options: { ignoreHref: true } },
      // Remove imagens
      { selector: 'img', format: 'skip' },
      // Remove blocos de "Ler mais" comuns em blogs raspados
      { selector: 'div.ler-mais-bloco_MP', format: 'skip' },
    ],
  })
    .replace(/\n{3,}/g, '\n\n') // colapsa múltiplas quebras
    .trim();
}

/**
 * Carrega vagas do arquivo .jsonl, normalizando o formato.
 */
function carregarVagas(): VagaNormalizada[] {
  console.log(`${PREFIXO_LOG} Lendo arquivo: ${ARQUIVO_VAGAS}`);

  if (!existsSync(ARQUIVO_VAGAS)) {
    throw new Error(`Arquivo não encontrado: ${ARQUIVO_VAGAS}`);
  }

  const conteudo = readFileSync(ARQUIVO_VAGAS, 'utf-8');
  const linhas = conteudo
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  console.log(`${PREFIXO_LOG} ${linhas.length} linha(s) encontrada(s).`);

  const vagas: VagaNormalizada[] = [];
  let descartadas = 0;

  for (let i = 0; i < linhas.length; i++) {
    try {
      const cru = JSON.parse(linhas[i]) as VagaCrua;

      if (!cru.title || !cru.content) {
        descartadas++;
        console.warn(`${PREFIXO_LOG} ⚠️  Linha ${i + 1}: faltam campos. Ignorada.`);
        continue;
      }

      const descricaoLimpa = limparHtml(cru.content);

      if (descricaoLimpa.length < 100) {
        descartadas++;
        console.warn(
          `${PREFIXO_LOG} ⚠️  Linha ${i + 1}: descrição muito curta (${descricaoLimpa.length} chars). Ignorada.`,
        );
        continue;
      }

      vagas.push({
        titulo: cru.title.trim(),
        area: inferirArea(cru.title),
        descricao: descricaoLimpa,
      });
    } catch (erro) {
      descartadas++;
      const msg = erro instanceof Error ? erro.message : String(erro);
      console.error(`${PREFIXO_LOG} ❌ Erro na linha ${i + 1}: ${msg}`);
    }
  }

  console.log(
    `${PREFIXO_LOG} ${vagas.length} válida(s), ${descartadas} descartada(s).`,
  );

  // Estatísticas por área (útil para validar a heurística)
  const porArea = vagas.reduce<Record<string, number>>((acc, v) => {
    acc[v.area] = (acc[v.area] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`${PREFIXO_LOG} Distribuição por área:`);
  for (const [area, count] of Object.entries(porArea).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  - ${area}: ${count}`);
  }

  return vagas;
}

async function main() {
  console.log(`${PREFIXO_LOG} Iniciando população do banco vetorial...`);

  // 1. Carrega e normaliza vagas
  const vagas = carregarVagas();

  if (vagas.length === 0) {
    console.warn(`${PREFIXO_LOG} Nenhuma vaga válida. Saindo.`);
    return;
  }

  // 2. Limpa a tabela
  console.log(`\n${PREFIXO_LOG} Limpando tabela existente...`);
  const { error: erroDelete } = await supabaseAdmin
    .from('vagas')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (erroDelete) {
    console.error(`${PREFIXO_LOG} Erro ao limpar tabela:`, erroDelete);
    process.exit(1);
  }

  // 3. Processa em lotes
  let totalInseridas = 0;

  for (let i = 0; i < vagas.length; i += TAMANHO_LOTE) {
    const lote = vagas.slice(i, i + TAMANHO_LOTE);
    const numeroLote = Math.floor(i / TAMANHO_LOTE) + 1;
    const totalLotes = Math.ceil(vagas.length / TAMANHO_LOTE);

    console.log(
      `${PREFIXO_LOG} Lote ${numeroLote}/${totalLotes} — ${lote.length} vaga(s)...`,
    );

    const textos = lote.map(
      (v) => `${v.titulo}\nÁrea: ${v.area}\n\n${v.descricao}`,
    );

    const embeddings = await gerarEmbeddingsLote(textos);

  const registros = lote.map((vaga, idx) => ({
    titulo: vaga.titulo,
    area: vaga.area,
    descricao: vaga.descricao,
    embedding: embeddings[idx],
  }));

    const { error } = await supabaseAdmin.from('vagas').insert(registros);

    if (error) {
      console.error(`${PREFIXO_LOG} Erro ao inserir lote ${numeroLote}:`, error);
      process.exit(1);
    }

    totalInseridas += lote.length;
    console.log(`${PREFIXO_LOG} ✅ ${totalInseridas}/${vagas.length}`);
  }

  console.log(`\n${PREFIXO_LOG} 🎉 Banco populado com ${totalInseridas} vaga(s)!`);
}

main().catch((erro) => {
  console.error(`${PREFIXO_LOG} Erro fatal:`, erro);
  process.exit(1);
});