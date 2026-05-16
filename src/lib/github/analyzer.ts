// src/lib/github/analyzer.ts

/**
 * Módulo para análise de repositórios GitHub públicos.
 * Extrai linguagens, frameworks e sugere nível de proficiência.
 */

interface GitHubLanguage {
  name: string;
  bytes: number;
}

interface GitHubRepoInfo {
  name: string;
  description: string | null;
  topics: string[];
  languages: GitHubLanguage[];
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: {
    name: string;
    color: string;
  } | null;
}

/**
 * Extrai owner e repo name de uma URL do GitHub.
 * Ex: https://github.com/owner/repo → { owner: 'owner', repo: 'repo' }
 */
export function extrairOwnerERepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2].replace('.git', ''),
  };
}

/**
 * Busca informações públicas de um repositório via GitHub API.
 * Não requer autenticação para repositórios públicos (rate limit: 60 req/hora).
 */
export async function buscarInfoRepositorio(
  owner: string,
  repo: string
): Promise<GitHubRepoInfo | null> {
  try {
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'NextStepAI-Pathfinder',
        },
      }
    );

    if (!repoResponse.ok) {
      console.error(`[GitHub API] Erro ao buscar repo: ${repoResponse.status}`);
      return null;
    }

    const repoData = await repoResponse.json();

    const languagesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/languages`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'NextStepAI-Pathfinder',
        },
      }
    );

    const languagesData = languagesResponse.ok
      ? await languagesResponse.json()
      : {};

    const languages: GitHubLanguage[] = Object.entries(languagesData).map(
      ([name, bytes]) => ({ name, bytes: bytes as number })
    );

    return {
      name: repoData.name,
      description: repoData.description,
      topics: repoData.topics || [],
      languages,
      stargazerCount: repoData.stargazers_count,
      forkCount: repoData.forks_count,
      primaryLanguage: repoData.language
        ? {
            name: repoData.language,
            color: repoData.language_color,
          }
        : null,
    };
  } catch (error) {
    console.error('[GitHub API] Erro na requisição:', error);
    return null;
  }
}

/**
 * Analisa o repositório e sugere nível de proficiência baseado em:
 * - Complexidade das linguagens
 * - Quantidade de código
 * - Frameworks utilizados
 * - Stars/forks (indicador de qualidade)
 */
export function inferirNivelProficiencia(
  repoInfo: GitHubRepoInfo
): {
  nivel: 'iniciado' | 'intermediario' | 'avancado';
  justificativa: string;
  habilidadesDetectadas: string[];
} {
  const { languages, topics, stargazerCount, forkCount } = repoInfo;

  const totalBytes = languages.reduce((sum, lang) => sum + lang.bytes, 0);
  const principaisLinguagens = languages.slice(0, 3).map((l) => l.name);
  const habilidadesDetectadas = new Set<string>([...principaisLinguagens, ...topics]);

  let pontuacao = 0;

  if (totalBytes > 50000) pontuacao += 1;
  if (totalBytes > 200000) pontuacao += 1;
  if (totalBytes > 1000000) pontuacao += 1;

  if (stargazerCount > 10) pontuacao += 1;
  if (stargazerCount > 50) pontuacao += 1;
  if (forkCount > 5) pontuacao += 1;

  const tecnologiasComplexas = [
    'TypeScript',
    'Rust',
    'Go',
    'Kubernetes',
    'Terraform',
    'GraphQL',
  ];
  const temTecnologiaComplexa = languages.some((l) =>
    tecnologiasComplexas.includes(l.name)
  );
  if (temTecnologiaComplexa) pontuacao += 2;

  const frameworks = [
    'React',
    'Next.js',
    'Vue',
    'Angular',
    'Django',
    'FastAPI',
    'Spring Boot',
    'Express',
    'NestJS',
  ];
  const frameworksUsados = topics.filter((t) =>
    frameworks.some((f) => f.toLowerCase().includes(t.toLowerCase()))
  );
  pontuacao += frameworksUsados.length;

  let nivel: 'iniciado' | 'intermediario' | 'avancado' = 'iniciado';
  let justificativa = '';

  if (pontuacao >= 6) {
    nivel = 'avancado';
    justificativa =
      `Projeto robusto (${formatarBytes(totalBytes)}) com ${languages.length} linguagens, ` +
      (frameworksUsados.length > 0
        ? `frameworks modernos (${frameworksUsados.join(', ')})`
        : 'tecnologias avançadas') +
      ` e boa aceitação (${stargazerCount} stars).`;
  } else if (pontuacao >= 3) {
    nivel = 'intermediario';
    justificativa =
      `Projeto de tamanho médio (${formatarBytes(totalBytes)}) utilizando ` +
      `${principaisLinguagens.join(', ')}${
        frameworksUsados.length > 0 ? ` e ${frameworksUsados.join(', ')}` : ''
      }.`;
  } else {
    nivel = 'iniciado';
    justificativa = `Projeto inicial (${formatarBytes(totalBytes)}) focado em ${
      principaisLinguagens[0] || 'desenvolvimento básico'
    }.`;
  }

  return {
    nivel,
    justificativa,
    habilidadesDetectadas: Array.from(habilidadesDetectadas),
  };
}

function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Sugere nível de proficiência baseado nas linguagens detectadas.
 * CORREÇÃO: Agora itera corretamente sobre Object.entries e tipa os parâmetros.
 */
export function sugerirNivelPorLinguagem(
  linguagens: Record<string, number>
): { habilidade: string; nivelSugerido: string }[] {
  return Object.entries(linguagens).map(([linguagem, bytes]: [string, number]) => {
    let nivelSugerido = 'iniciado';

    if (bytes > 50000) nivelSugerido = 'intermediario';
    if (bytes > 200000) nivelSugerido = 'avancado';

    return { habilidade: linguagem, nivelSugerido };
  });
}