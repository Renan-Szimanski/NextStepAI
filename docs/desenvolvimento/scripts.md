# Scripts Úteis

O NextStepAI possui scripts automatizados para desenvolvimento, build, testes, seed do banco vetorial, depuração e validação de integrações. Este documento descreve os scripts disponíveis e como utilizá-los.

## Scripts do `package.json`

Execute os scripts com:

```bash
npm run <script>
```

ou, caso use Yarn:

```bash
yarn <script>
```

| Script | Descrição |
|--------|------------|
| `dev` | Inicia o servidor Next.js em modo de desenvolvimento com hot reload (`localhost:3000`). |
| `build` | Gera a build de produção do projeto. |
| `start` | Executa a aplicação em modo produção após `build`. |
| `lint` | Executa o ESLint para verificar padrões e possíveis erros de código. |
| `type-check` | Executa o TypeScript (`tsc --noEmit`) para validação de tipos. |
| `seed` | Popula a tabela `vagas` do Supabase com vagas reais + sintéticas (com confirmação antes de apagar a tabela). |
| `seed:test` | Executa o seed reduzido (limite pequeno por origem, útil para desenvolvimento). |
| `seed:clean` | Executa o seed sem prompt de confirmação (CI/automação). |
| `test:extrair-pdf` | Testa extração de texto de um PDF local usando `unpdf`. |
| `test:vetor` | Testa embeddings + busca vetorial (`pgvector`) contra a função `match_vagas`. |
| `test:r2` | Verifica conectividade e credenciais do Cloudflare R2. |
| `test:rag` | Executa um teste end-to-end do pipeline RAG. |

---

# Scripts auxiliares (`scripts/`)

Além dos scripts definidos no `package.json`, o projeto possui scripts TypeScript executáveis diretamente.

Exemplo:

```bash
npx ts-node scripts/nome-do-script.ts
```

## `scripts/popular-banco.ts`

Script principal de seed do banco vetorial (`pgvector`).

Ele popula a tabela `vagas` do Supabase a partir de **duas fontes diferentes**:

### 1. Vagas reais (raspadas)

Arquivo:

```text
dados/vagas/reais/vagas_tuning.jsonl
```

Formato:

```json
{
  "title": "Desenvolvedor Front-end React",
  "content": "<div>Descrição HTML...</div>"
}
```

Características:

- Formato **JSONL** (uma vaga por linha)
- Descrição em **HTML**
- O script converte HTML → texto limpo usando `html-to-text`
- A área da vaga é inferida automaticamente com heurísticas baseadas no título

Exemplo de inferência:

| Título | Área inferida |
|--------|----------------|
| `Frontend Developer` | `Desenvolvimento de Software` |
| `Data Scientist` | `Dados e Analytics` |
| `UX Designer` | `UX/UI Design` |
| `DevOps Engineer` | `DevOps e Infraestrutura` |

---

### 2. Vagas sintéticas (LLM)

Arquivos aceitos:

```text
dados/vagas/sinteticas/
```

O script tenta localizar automaticamente:

```text
vagas_sinteticas_nãotuned.json
vagas_sinteticas_naotuned.json
vagas_sinteticas_nao_tuned.json
```

Formato esperado:

```json
{
  "metadados": {
    "modelo": "DeepSeek"
  },
  "vagas": [
    {
      "titulo": "Desenvolvedor React Júnior",
      "area": "Desenvolvimento de Software",
      "descricao": "## Responsabilidades..."
    }
  ]
}
```

Características:

- Descrições geradas por LLM
- Markdown é automaticamente limpo:
  - `**negrito**`
  - `# headings`
  - `` `inline code` ``
  - links markdown
  - blockquotes
- O texto é normalizado antes da geração de embeddings

---

## Pipeline do seed

O `popular-banco.ts` executa as seguintes etapas:

### 1. Carregamento das vagas

Carrega:

- vagas reais (`jsonl`)
- vagas sintéticas (`json`)

Ambas são normalizadas para o formato:

```ts
{
  titulo: string
  area: string
  descricao: string
  origem: 'real' | 'sintetica'
}
```

---

### 2. Limpeza da tabela

Antes de inserir novos embeddings:

```sql
DELETE FROM vagas
```

O script pede confirmação interativa:

```text
⚠️ Isto irá APAGAR todos os registros da tabela "vagas". Continuar? [s/N]
```

Você pode ignorar o prompt usando flags.

---

### 3. Geração de embeddings

Os embeddings são gerados em lote via:

```ts
gerarEmbeddingsLote()
```

Formato do texto enviado:

```text
Título da vaga
Área: Desenvolvimento de Software

Descrição completa da vaga
```

Os embeddings são armazenados em:

```sql
embedding VECTOR(384)
```

Modelo utilizado:

```text
Xenova/all-MiniLM-L6-v2
```

Dimensão:

```text
384
```

---

### 4. Inserção no Supabase

Cada vaga é salva com:

| Campo | Valor |
|--------|------|
| `titulo` | título da vaga |
| `area` | área inferida ou fornecida |
| `descricao` | texto limpo |
| `origem` | `real` ou `sintetica` |
| `embedding` | vetor 384d |

---

### 5. Validação final

Ao final do processo, o script executa uma contagem:

```sql
SELECT COUNT(*)
```

E separa:

```text
real
sintetica
```

Exemplo:

```text
🎉 Seed concluído:
• Vagas processadas: 320
• Lotes com falha: 0
• Total no pgvector: 320
  ↳ origem='real': 180
  ↳ origem='sintetica': 140
```

---

## Como executar o seed

### Seed completo

Executa todas as vagas disponíveis.

```bash
npm run seed
```

O script solicitará confirmação antes de apagar a tabela.

---

### Seed sem prompt (automação / CI)

```bash
npm run seed:clean
```

Executa:

```bash
--clean --yes
```

Ideal para pipelines automatizados.

---

### Seed reduzido (desenvolvimento)

Processa apenas algumas vagas de cada origem.

```bash
npm run seed:test
```

Internamente usa:

```bash
--limit=5
```

Resultado esperado:

- até **5 vagas reais**
- até **5 vagas sintéticas**

Ideal para desenvolvimento local.

---

### Seed customizado

Você pode definir um limite manual:

```bash
npx ts-node scripts/popular-banco.ts --limit=50
```

Resultado:

```text
50 vagas reais
50 vagas sintéticas
```

Total aproximado:

```text
100 vagas
```

---

## Outros scripts auxiliares

| Arquivo | Descrição |
|---------|------------|
| `testar-extrair-pdf.ts` | Extrai texto de um PDF local usando `unpdf`. |
| `testar-embeddings.ts` | Gera embeddings de um texto e valida a dimensão (`384`). |
| `testar-vetor.ts` | Testa a função `match_vagas()` do Supabase usando um embedding de exemplo. |
| `criar-usuario-teste.ts` | Cria um usuário via Supabase Auth (email/senha) para testes locais. |

---

## Exemplos de uso

### Desenvolvimento diário

```bash
npm run dev
npm run lint
npm run type-check
```

### Popular banco vetorial

```bash
npm run seed
```

### Seed pequeno

```bash
npm run seed:test
```

### Testar extração de currículo

```bash
npm run test:extrair-pdf
```

### Testar busca vetorial

```bash
npm run test:vetor
```

### Testar R2

```bash
npm run test:r2
```

---

## Possíveis erros

| Erro | Causa | Solução |
|------|--------|----------|
| `SUPABASE_SERVICE_ROLE_KEY missing` | Variável ausente | Verifique `.env.local` |
| `Arquivo vagas_tuning.jsonl não encontrado` | Dataset ausente | Adicione o arquivo em `dados/vagas/reais/` |
| `Nenhum arquivo de sintéticas encontrado` | Nome do JSON divergente | Use um dos nomes aceitos pelo script |
| `Erro ao gerar embeddings` | Modelo falhou ou API indisponível | Verifique provider de embeddings |
| `Falha ao limpar tabela` | Permissão insuficiente | Validar `service_role key` |

---

## Variáveis de ambiente necessárias

Obrigatórias para o seed:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Também são necessárias as variáveis usadas pelo provider de embeddings.

---

**Próximo passo:** Consulte `estrutura-projeto.md` para entender onde cada script se encaixa na arquitetura do projeto.