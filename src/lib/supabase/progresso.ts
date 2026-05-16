// src/lib/supabase/progresso.ts

/**
 * Funções server-side para gerenciamento de progresso do usuário no Supabase.
 * Utiliza supabaseAdmin (service role) - adequado para rotas de API e agentes.
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type NivelProgresso = 
  | 'nao_iniciado' 
  | 'iniciado' 
  | 'intermediario' 
  | 'avancado' 
  | 'dominado';

export interface ProgressoUsuario {
  id: string;
  usuarioId: string;
  habilidade: string;
  nivel: NivelProgresso;
  porcentagem: number;
  notas: string | null;
  githubUrl: string | null;
  linguagensDetectadas: Record<string, number> | null;
  ultimoAcessoGithub: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RegistrarProgressoInput {
  usuarioId: string;
  habilidade: string;
  nivel?: NivelProgresso;
  porcentagem?: number;
  notas?: string;
  githubUrl?: string;
}

// Tipo que representa a estrutura retornada pelo Supabase (evita `any`)
type ProgressoUsuarioRow = {
  id: string;
  usuario_id: string;
  habilidade: string;
  nivel: NivelProgresso;
  porcentagem: number;
  notas: string | null;
  github_url: string | null;
  linguagens_detectadas: Record<string, number> | null;
  ultimo_acesso_github: string | null;
  criado_em: string;
  atualizado_em: string;
};

/**
 * Mapeia uma linha do Supabase para a interface ProgressoUsuario.
 */
function mapearParaProgressoUsuario(data: ProgressoUsuarioRow): ProgressoUsuario {
  return {
    id: data.id,
    usuarioId: data.usuario_id,
    habilidade: data.habilidade,
    nivel: data.nivel,
    porcentagem: data.porcentagem,
    notas: data.notas,
    githubUrl: data.github_url,
    linguagensDetectadas: data.linguagens_detectadas,
    ultimoAcessoGithub: data.ultimo_acesso_github,
    criadoEm: data.criado_em,
    atualizadoEm: data.atualizado_em,
  };
}

/**
 * Registra ou atualiza o progresso de uma habilidade.
 * Se já existir, atualiza. Se não, cria novo registro.
 */
export async function registrarProgresso(
  input: RegistrarProgressoInput
): Promise<ProgressoUsuario> {
  const { usuarioId, habilidade, nivel, porcentagem, notas, githubUrl } = input;

  // Verifica se já existe
  const { data: existente } = await supabaseAdmin
    .from('progresso_usuario')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('habilidade', habilidade)
    .single<ProgressoUsuarioRow>();

  if (existente) {
    // Atualiza registro existente
    const { data, error } = await supabaseAdmin
      .from('progresso_usuario')
      .update({
        nivel: nivel ?? existente.nivel,
        porcentagem: porcentagem ?? existente.porcentagem,
        notas: notas ?? existente.notas,
        github_url: githubUrl ?? existente.github_url,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', existente.id)
      .select('*')
      .single<ProgressoUsuarioRow>();

    if (error) {
      console.error('[registrarProgresso] Erro ao atualizar:', error);
      throw new Error('Falha ao atualizar progresso.');
    }

    return mapearParaProgressoUsuario(data);
  } else {
    // Cria novo registro
    const { data, error } = await supabaseAdmin
      .from('progresso_usuario')
      .insert({
        usuario_id: usuarioId,
        habilidade,
        nivel: nivel ?? 'nao_iniciado',
        porcentagem: porcentagem ?? 0,
        notas: notas ?? null,
        github_url: githubUrl ?? null,
      })
      .select('*')
      .single<ProgressoUsuarioRow>();

    if (error) {
      console.error('[registrarProgresso] Erro ao criar:', error);
      throw new Error('Falha ao registrar progresso.');
    }

    return mapearParaProgressoUsuario(data);
  }
}

/**
 * Atualiza linguagens detectadas via GitHub.
 */
export async function atualizarLinguagensGitHub(
  usuarioId: string,
  habilidade: string,
  linguagens: Record<string, number>,
  githubUrl: string
): Promise<ProgressoUsuario> {
  const { data, error } = await supabaseAdmin
    .from('progresso_usuario')
    .update({
      linguagens_detectadas: linguagens,
      ultimo_acesso_github: new Date().toISOString(),
      github_url: githubUrl,
      atualizado_em: new Date().toISOString(),
    })
    .eq('usuario_id', usuarioId)
    .eq('habilidade', habilidade)
    .select('*')
    .single<ProgressoUsuarioRow>();

  if (error) {
    console.error('[atualizarLinguagensGitHub] Erro:', error);
    throw new Error('Falha ao atualizar linguagens do GitHub.');
  }

  return mapearParaProgressoUsuario(data);
}

/**
 * Consulta o progresso de uma habilidade específica.
 */
export async function consultarProgressoHabilidade(
  usuarioId: string,
  habilidade: string
): Promise<ProgressoUsuario | null> {
  const { data, error } = await supabaseAdmin
    .from('progresso_usuario')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('habilidade', habilidade)
    .single<ProgressoUsuarioRow>();

  if (error && error.code !== 'PGRST116') {
    console.error('[consultarProgressoHabilidade] Erro:', error);
    throw new Error('Falha ao consultar progresso.');
  }

  if (!data) return null;

  return mapearParaProgressoUsuario(data);
}

/**
 * Lista todo o progresso do usuário.
 */
export async function listarProgressoUsuario(
  usuarioId: string
): Promise<ProgressoUsuario[]> {
  const { data, error } = await supabaseAdmin
    .from('progresso_usuario')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('atualizado_em', { ascending: false });

  if (error) {
    console.error('[listarProgressoUsuario] Erro:', error);
    throw new Error('Falha ao listar progresso.');
  }

  return (data as ProgressoUsuarioRow[]).map(mapearParaProgressoUsuario);
}

/**
 * Obtém resumo do progresso (quantas habilidades em cada nível).
 */
export async function getResumoProgresso(usuarioId: string): Promise<{
  total: number;
  porNivel: Record<NivelProgresso, number>;
  porcentagemMedia: number;
}> {
  const progresso = await listarProgressoUsuario(usuarioId);

  const porNivel: Record<NivelProgresso, number> = {
    nao_iniciado: 0,
    iniciado: 0,
    intermediario: 0,
    avancado: 0,
    dominado: 0,
  };

  let somaPorcentagem = 0;

  for (const item of progresso) {
    porNivel[item.nivel]++;
    somaPorcentagem += item.porcentagem;
  }

  return {
    total: progresso.length,
    porNivel,
    porcentagemMedia: progresso.length > 0 ? Math.round(somaPorcentagem / progresso.length) : 0,
  };
}

/**
 * Atualiza apenas o status de concluído de uma habilidade.
 * Usado pelo checkbox do diagrama.
 */
export async function toggleConcluidoHabilidade(
  usuarioId: string,
  habilidade: string,
  concluido: boolean
): Promise<ProgressoUsuario> {
  const { data, error } = await supabaseAdmin
    .from('progresso_usuario')
    .upsert({
      usuario_id: usuarioId,
      habilidade,
      nivel: concluido ? 'dominado' : 'iniciado',
      porcentagem: concluido ? 100 : 0,
      atualizado_em: new Date().toISOString(),
    } as Partial<ProgressoUsuarioRow>, // Evita `any` usando o tipo
    {
      onConflict: 'usuario_id,habilidade',
    })
    .select('*')
    .single<ProgressoUsuarioRow>();

  if (error) {
    console.error('[toggleConcluidoHabilidade] Erro:', error);
    throw new Error('Falha ao atualizar status da habilidade.');
  }

  return mapearParaProgressoUsuario(data);
}