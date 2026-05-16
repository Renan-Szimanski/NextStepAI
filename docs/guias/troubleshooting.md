# Guia de Troubleshooting – Problemas Comuns e Soluções

Este documento lista os problemas mais frequentes encontrados durante o uso e desenvolvimento do NextStepAI, com causas prováveis e soluções práticas.

## Índice

1. [Problemas no frontend (usuário)](#1-problemas-no-frontend-usuário)
2. [Problemas com upload de currículo](#2-problemas-com-upload-de-currículo)
3. [Problemas na extração de PDF](#3-problemas-na-extração-de-pdf)
4. [Problemas na busca vetorial (vagas)](#4-problemas-na-busca-vetorial-vagas)
5. [Problemas na geração de roadmap ou diagrama](#5-problemas-na-geração-de-roadmap-ou-diagrama)
6. [Problemas de autenticação (login)](#6-problemas-de-autenticação-login)
7. [Problemas de desempenho e timeout](#7-problemas-de-desempenho-e-timeout)
8. [Problemas de build e deploy](#8-problemas-de-build-e-deploy)
9. [Problemas com fallback e rate limit](#9-problemas-com-fallback-e-rate-limit)
10. [Erros específicos e mensagens](#10-erros-específicos-e-mensagens)

---

## 1. Problemas no frontend (usuário)

### 1.1 A conversa não inicia ou o chat não responde

**Sintoma:** Ao enviar mensagem, nada acontece ou o indicador de streaming não aparece.

**Causas prováveis:**
* Sessão expirada (token JWT inválido).
* Erro de rede (CORS, firewall).
* Backend offline (API route retornando 500).

**Soluções:**
* Atualize a página (F5) e tente novamente.
* Faça logout e login novamente.
* Abra o console do navegador (F12) e verifique se há erros em `console` ou na aba **Network** (status 401, 500, etc.).
* Verifique se o servidor está rodando (`npm run dev` no terminal local).

### 1.2 A resposta do agente aparece truncada ou com formatação quebrada

**Sintoma:** Markdown não renderizado corretamente, códigos sem destaque, listas desalinhadas.

**Causa:** O agente pode ter gerado HTML em vez de Markdown puro (violação do system prompt).

**Solução:**
* Peça para o agente regenerar: *"Refaça o roadmap sem usar HTML, apenas Markdown"*.
* Verifique se o componente `MarkdownRenderer` está recebendo o texto completo (sem stripping acidental).

### 1.3 O modal do roadmap não abre automaticamente

**Sintoma:** Mesmo após a resposta conter um roadmap, não aparece o diagrama.

**Causas prováveis:**
* A resposta não contém as tags `<roadmap>...</roadmap>` (formato incorreto).
* O componente `ModalRoadmap` não foi carregado (lazy loading falhou).
* Erro no parsing do JSON dentro do roadmap.

**Soluções:**
* Verifique o conteúdo da mensagem do assistente (exibir no console). Deve conter:
  `<roadmap>{ "cargoAlvo": "...", "fases": [...] }</roadmap>`.
* Se faltar as tags, peça: *"Regere o roadmap com as tags <roadmap> no final"*.
* Recarregue a página e, se possível, abra manualmente o modal via botão (se implementado).

## 2. Problemas com upload de currículo

### 2.1 Erro "Arquivo muito grande. Máximo de 5 MB."

**Causa:** O PDF excede o limite de 5 MB.

**Solução:** Compacte o PDF (ex.: usando ferramentas online como SmallPDF) ou divida o conteúdo em múltiplos arquivos (não suportado – envie apenas um).

### 2.2 Erro "Apenas arquivos PDF são permitidos"

**Causa:** O arquivo selecionado não tem extensão `.pdf` ou o tipo MIME não é `application/pdf`.

**Solução:** Converta o arquivo para PDF ou renomeie (se for realmente PDF, pode ter extensão errada).

### 2.3 Upload falha com CORS

**Sintoma:** No console do navegador, erro `Access-Control-Allow-Origin` ao tentar `PUT` para a URL do R2.

**Causa:** Configuração de CORS no bucket Cloudflare R2 ausente ou incorreta.

**Solução:** Verifique as regras CORS do bucket (veja `r2-storage.md` no backend). A origem deve incluir `http://localhost:3000` (para desenvolvimento) e a URL de produção.

### 2.4 O currículo não é encontrado após upload

**Sintoma:** Após upload bem-sucedido, o agente ainda responde que não há currículo (tool `extrair_texto_pdf` diz "Nenhum currículo encontrado").

**Causas prováveis:**
* O registro no banco (POST `/api/curriculo`) falhou silenciosamente.
* O `usuarioId` não está sendo propagado corretamente para a tool (bug 1 já corrigido, mas pode ocorrer em versões antigas).
* O retry de busca (500ms) ainda não encontrou o registro recém-inserido (raro, mas pode acontecer).

**Soluções:**
* Verifique no Supabase se a tabela `curriculos` contém um registro para o usuário logado.
* Force a tool a reextrair pedindo: *"Extraia meu currículo novamente"*.
* Reinicie a conversa (nova conversa) e reenvie o PDF.

## 3. Problemas na extração de PDF

### 3.1 "Não foi possível extrair o texto do PDF. O arquivo pode estar corrompido ou ser uma imagem escaneada."

**Causa:** O PDF é composto apenas de imagens (escaneado) ou o texto está embedado de forma não extraível.

**Solução:** Use um PDF gerado digitalmente (ex.: exportar do Word/Google Docs como PDF). Para escaneados, seria necessário OCR (não implementado no MVP).

### 3.2 Timeout ao baixar o PDF (30s)

**Sintoma:** "Não foi possível baixar o currículo a tempo. Tente novamente."

**Causa:** Conexão lenta entre o servidor (Vercel) e o R2, ou arquivo muito grande próximo ao limite.

**Solução:**
* Tente novamente (o timeout é de 30s; em condições normais, arquivos de 5 MB demoram menos de 5s).
* Se persistir, troque a região do bucket R2 para mais próxima da região da Vercel.

## 4. Problemas na busca vetorial (vagas)

### 4.1 "Nenhuma vaga similar encontrada" (mesmo com banco populado)

**Causas prováveis:**
* Tabela `vagas` vazia ou sem embeddings.
* O threshold de similaridade (0.5) pode ser muito alto para a query.
* A query é muito específica ou em outro idioma (inglês vs. português).

**Soluções:**
* Execute `npm run seed` para popular a tabela.
* Tente uma query mais genérica: *"desenvolvedor web"* em vez de *"engenheiro de software sênior com foco em React e Node.js"*.
* Verifique no Supabase se a função `match_vagas` existe e se as colunas `embedding` não são nulas.

### 4.2 "Timeout de 15s atingido na tool" – busca vetorial muito lenta

**Causas:**
* Índice IVFFlat não utilizado (falta de `ANALYZE` ou muitos registros sem reindexação).
* Instância Supabase no plano gratuito com recursos limitados.

**Soluções:**
* Execute `REINDEX INDEX vagas_embedding_idx;` no SQL Editor do Supabase.
* Reduza `match_count` para 3 (já é o padrão) ou diminua `match_threshold` para 0.3 (retorna mais resultados, mas menos qualidade).
* Considere migrar para plano pago do Supabase ou usar um índice HNSW (não implementado).

## 5. Problemas na geração de roadmap ou diagrama

### 5.1 "O diagrama não carregou direito" ou conexões erradas

**Sintoma:** As flechas do diagrama conectam fases erradas, ou skills faltando.

**Causa:** O parser de roadmap (`parsearRoadmap`) espera um JSON específico dentro das tags `<roadmap>`. Se o agente gerar JSON malformado ou fora do padrão, o diagrama falha.

**Solução:**
* Peça para o agente **regenerar o roadmap**: *"Refaça o roadmap, o diagrama está com conexões erradas"*.
* Verifique no console se há erro de parsing: `Error parsing roadmap: ...`.

### 5.2 O roadmap não aparece no formato de fases

**Sintoma:** A resposta não contém os cabeçalhos "Curto prazo (X-Y meses)" ou aparecem com hífen diferente (`–` em vez de `-`).

**Causa:** O agente ignorou a regra de formatação do system prompt.

**Solução:**
* Informe: *"Use hífen normal ( - ) nos intervalos de meses, e não travessão"*.
* O system prompt já contém essa regra, mas o modelo pode eventualmente errar.

## 6. Problemas de autenticação (login)

### 6.1 "Não autenticado" ao tentar acessar o chat, mesmo após login

**Causas prováveis:**
* Cookie de sessão expirado ou ausente.
* `NEXTAUTH_SECRET` diferente entre desenvolvimento e produção.
* URL do NextAuth (`NEXTAUTH_URL`) incorreta.

**Soluções:**
* Limpe os cookies do navegador e faça login novamente.
* Verifique se o `NEXTAUTH_SECRET` é o mesmo no `.env.local` e na Vercel (não pode ser alterado entre deploys).
* Confirme que `NEXTAUTH_URL` corresponde exatamente à URL acessada (ex.: `http://localhost:3000` para desenvolvimento local).

### 6.2 E-mail de confirmação não chega

**Causa:** Supabase pode estar com fila de e-mails ou e-mail caiu no spam.

**Solução:**
* Verifique a pasta de spam.
* No dashboard do Supabase, vá em **Authentication → Users** e reenvie o convite/confirmação.
* Para desenvolvimento, desative a confirmação de e-mail nas configurações de Auth (não recomendado em produção).

## 7. Problemas de desempenho e timeout

### 7.1 A resposta demora muito (>30s) ou termina com erro de timeout na Vercel

**Causa:** No plano Hobby da Vercel, o limite máximo de execução é **10 segundos**. O agente frequentemente excede esse tempo (extração de PDF + busca vetorial + geração de roadmap).

**Solução:**
* Migre para o plano **Pro** da Vercel (limite de 60 segundos).
* Ou otimize reduzindo o número de tools (desabilitar `buscar_recursos_educacionais` por padrão).
* Use o fallback com modelo menor e mais rápido (Groq) configurado como principal (não recomendado para qualidade).

### 7.2 Lazy loading do diagrama falha (não carrega)

**Sintoma:** O modal abre, mas fica vazio ou mostra erro "React Flow not loaded".

**Causa:** A importação dinâmica de `DiagramaRoadmapReactFlow` falhou (problema de rede ou incompatibilidade de versão).

**Solução:**
* Verifique o console do navegador por erros de carregamento de chunk.
* Recarregue a página (hard reload: Ctrl+Shift+R).
* Verifique se o pacote `@xyflow/react` está instalado (no `package.json`).

## 8. Problemas de build e deploy

### 8.1 Erro de tipo: "Property 'usuarioId' does not exist on type 'RunnableConfig'"

**Causa:** Você está tentando acessar `config.configurable.usuarioId` sem estender o tipo `RunnableConfig`.

**Solução:** No arquivo da tool, declare:

```typescript
import { RunnableConfig } from '@langchain/core/runnables';
// ...
async (input, config?: RunnableConfig) => {
  const usuarioId = (config?.configurable as { usuarioId?: string })?.usuarioId;
}