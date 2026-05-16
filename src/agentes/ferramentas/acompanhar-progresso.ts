// src/agentes/ferramentas/acompanhar-progresso.ts

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { 
  extrairOwnerERepo, 
  buscarInfoRepositorio, 
  inferirNivelProficiencia,
} from '@/lib/github/analyzer';

/**
 * Ferramenta para acompanhar progresso do usuário:
 * - Registrar progresso em uma habilidade
 * - Consultar progresso
 * - Analisar repositório GitHub e extrair habilidades
 */
export const acompanharProgressoTool = tool(
  async (input) => {
    const { acao, habilidade, nivel, porcentagem, githubUrl, usuarioId } = input;

    // Ação 1: Registrar progresso
    if (acao === 'registrar' && habilidade) {
      // Aqui você deve salvar no banco de dados (exemplo simplificado)
      console.log(`[Progresso] Usuário ${usuarioId || 'anon'} registrou ${habilidade}: ${nivel} (${porcentagem}%)`);
      return `✅ Progresso registrado: **${habilidade}** - ${nivel} (${porcentagem}%)`;
    }

    // Ação 2: Consultar progresso
    if (acao === 'consultar') {
      // Buscar do banco de dados (exemplo simulado)
      if (habilidade) {
        return `📊 Seu progresso em **${habilidade}** é **Intermediário (60%)**. Quer atualizar?`;
      } else {
        return `📊 Você tem 5 habilidades registradas: React (80%), TypeScript (60%), Node.js (40%), SQL (70%), Docker (30%).`;
      }
    }

    // Ação 3: Analisar GitHub (a que você precisa)
    if (acao === 'analisar_github' && githubUrl) {
      const repoInfo = extrairOwnerERepo(githubUrl);
      if (!repoInfo) {
        return `❌ URL do GitHub inválida. Use o formato: https://github.com/usuario/repositorio`;
      }

      const { owner, repo } = repoInfo;
      
      // Buscar informações do repositório
      const dadosRepo = await buscarInfoRepositorio(owner, repo);
      if (!dadosRepo) {
        return `❌ Não foi possível acessar o repositório **${owner}/${repo}**. Verifique se ele é público e o nome está correto.`;
      }

      // Inferir nível de proficiência e habilidades
      const analise = inferirNivelProficiencia(dadosRepo);
      
      // Formatar resposta amigável
      let resposta = `🔍 **Análise do repositório:** ${githubUrl}\n\n`;
      resposta += `📦 **Nome:** ${dadosRepo.name}\n`;
      if (dadosRepo.description) resposta += `📝 **Descrição:** ${dadosRepo.description}\n`;
      resposta += `⭐ **Stars:** ${dadosRepo.stargazerCount} | **Forks:** ${dadosRepo.forkCount}\n`;
      resposta += `🛠️ **Linguagens principais:** ${dadosRepo.languages.map(l => l.name).join(', ') || 'Não identificadas'}\n`;
      resposta += `📊 **Nível de proficiência sugerido:** **${analise.nivel}**\n`;
      resposta += `💡 **Justificativa:** ${analise.justificativa}\n\n`;
      resposta += `**Habilidades detectadas:**\n${analise.habilidadesDetectadas.map(h => `- ${h}`).join('\n')}\n\n`;
      resposta += `Deseja registrar essas habilidades no seu progresso? Posso fazer isso para você.`;

      return resposta;
    }

    return `❌ Ação desconhecida ou parâmetros inválidos. Use acao = 'registrar', 'consultar' ou 'analisar_github' com os campos corretos.`;
  },
  {
    name: 'acompanhar_progresso',
    description: `Ferramenta para registrar, consultar ou analisar progresso do usuário.
Ações possíveis:
- registrar: { acao: 'registrar', habilidade: string, nivel: 'iniciante'|'intermediario'|'avancado', porcentagem: number, usuarioId?: string }
- consultar: { acao: 'consultar', habilidade?: string }
- analisar_github: { acao: 'analisar_github', githubUrl: string }`,
    schema: z.object({
      acao: z.enum(['registrar', 'consultar', 'analisar_github']),
      habilidade: z.string().optional(),
      nivel: z.enum(['iniciante', 'intermediario', 'avancado']).optional(),
      porcentagem: z.number().min(0).max(100).optional(),
      githubUrl: z.string().url().optional(),
      usuarioId: z.string().optional(),
    }),
  }
);