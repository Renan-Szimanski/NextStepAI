# Manual do Usuário – NextStepAI

Bem-vindo ao **NextStepAI**, seu mentor de carreira automatizado. Este guia explica como utilizar todas as funcionalidades do sistema: criar conta, enviar currículo, conversar com o agente Pathfinder, gerar roadmaps personalizados, visualizar diagramas interativos e acompanhar seu progresso.

## Sumário

1. [Criando sua conta](#1-criando-sua-conta)
2. [Fazendo login](#2-fazendo-login)
3. [Entendendo a interface principal](#3-entendendo-a-interface-principal)
4. [Enviando seu currículo](#4-enviando-seu-curriculo)
5. [Iniciando uma conversa](#5-iniciando-uma-conversa)
6. [Entendendo a resposta do agente](#6-entendendo-a-resposta-do-agente)
7. [Visualizando o roadmap interativo](#7-visualizando-o-roadmap-interativo)
8. [Marcando habilidades como concluídas](#8-marcando-habilidades-como-concluidas)
9. [Solicitando recursos de estudo](#9-solicitando-recursos-de-estudo)
10. [Analisando seu GitHub](#10-analisando-seu-github)
11. [Gerenciando o histórico de conversas](#11-gerenciando-o-historico-de-conversas)
12. [Alternando tema claro/escuro](#12-alternando-tema-claroescuro)
13. [Dicas e boas práticas](#13-dicas-e-boas-praticas)

---

## 1. Criando sua conta

1. Acesse `https://next-step-ai-9pe1.vercel.app/`.
2. Clique em **“Criar conta”** ou **“Registrar”**.
3. Preencha seu **e-mail** e **senha** (mínimo 6 caracteres).
4. Você receberá um e‑mail de confirmação do Supabase. Clique no link para ativar sua conta.
5. Após confirmar, retorne ao site e faça login.

> **Nota:** O NextStepAI utiliza apenas autenticação por e‑mail e senha. Não há login com GitHub ou Google.

## 2. Fazendo login

1. Na página inicial, informe o **e-mail** e a **senha** cadastrados.
2. Clique em **“Entrar”**.
3. Após autenticação, você será redirecionado para a tela de chat.

## 3. Entendendo a interface principal

A interface do chat é dividida em três regiões:

| Região | Descrição |
|--------|------------|
| **Sidebar esquerda** (desktop) / **Menu hambúrguer** (mobile) | Lista de conversas anteriores, botão “Nova conversa”. |
| **Área central** | Exibe as mensagens trocadas com o agente Pathfinder. |
| **Cabeçalho superior** | Indicador de status (online/processando), alternador de tema claro/escuro e botão de logout. |
| **Rodapé** | Campo de texto para digitar mensagens, botão de enviar e botão de anexo (para upload de currículo). |

## 4. Enviando seu currículo

O envio do currículo é **opcional**, mas altamente recomendado para que o agente faça uma **gap analysis** personalizada.

**Passos:**

1. Clique no **botão de anexo** (ícone de clipe) ao lado do campo de mensagem.
2. No popover que aparece, clique em **“Selecionar PDF”**.
3. Escolha um arquivo PDF de seu computador (máximo **5 MB**).
4. Aguarde o upload (barra de progresso indica o andamento).
5. Após o sucesso, o popover fecha automaticamente e uma mensagem automática é enviada ao chat:  
   *“✅ Realizei o envio do meu currículo: 📄 nome_do_arquivo.pdf”*

**Gerenciando o currículo:**  
- Para visualizar o PDF enviado, clique no ícone de visualização (olho) no popover.
- Para remover o currículo, clique no ícone de lixeira. Uma nova conversa poderá ser iniciada sem currículo.

## 5. Iniciando uma conversa

**Cenário A – Sem currículo:**

1. Digite seu cargo-alvo diretamente: *“Quero ser engenheiro de dados”* ou *“Me ajude a me tornar desenvolvedora front-end”*.
2. O agente responderá perguntando suas **horas de estudo diárias** e **nível de ambição** (mercado comum ou big tech).
3. Após você informar, ele gerará um **roadmap genérico** baseado no conhecimento do mercado.

**Cenário B – Com currículo enviado:**

1. Após o upload automático (ou manual), o agente iniciará o **Fluxo B** (gap analysis).
2. Ele sugerirá **3 a 5 cargos compatíveis** com seu perfil real. Exemplo:  
   *“Com base no seu currículo, vejo estas direções: QA, Desenvolvedor Back-end Ruby, Full Stack...”*
3. Escolha um dos cargos digitando o número ou o nome.
4. Responda às perguntas sobre **horas de estudo** e **nível de ambição**.
5. O agente calculará a **porcentagem de compatibilidade** e gerará um roadmap focado nas suas lacunas.

## 6. Entendendo a resposta do agente

A resposta do Pathfinder segue uma estrutura padronizada (Markdown):

| Seção | O que contém |
|-------|---------------|
| **Cabeçalho de personalização** | Horas de estudo e nível de ambição usados. |
| **📊 Compatibilidade** (Fluxo B) | Percentual do seu perfil em relação ao cargo. |
| **🎯 Objetivo profissional** | Descrição do cargo-alvo. |
| **📋 Seu perfil atual** (Fluxo B) | Habilidades, formação, idiomas extraídos do currículo. |
| **📊 O que o mercado exige** | Competências mais frequentes (com percentuais). |
| **✅ Pontos fortes** (Fluxo B) | O que você já domina. |
| **🚀 Lacunas a desenvolver** (Fluxo B) | Habilidades que faltam para o cargo. |
| **🗺️ Roadmap de desenvolvimento** | Ações organizadas em **Curto prazo**, **Médio prazo**, **Longo prazo** (prazos ajustados pela sua carga horária). |
| **💡 Próximos passos imediatos** | Três ações concretas para os próximos 7 dias. |
| **✨ O que mais posso fazer por você?** | Lista de funcionalidades adicionais (detalhar recursos, registrar progresso, analisar GitHub). |
| **💡 Dica interativa** | Orientações sobre o diagrama visual. |

## 7. Visualizando o roadmap interativo

Sempre que o agente gerar um roadmap, um **modal com diagrama interativo** será automaticamente exibido ao final da resposta (se você estiver no desktop ou tablet).

**Funcionalidades do diagrama:**

- **Zoom:** Use os botões `+` e `-` (ou scroll do mouse) para ampliar/reduzir.
- **Pan:** Arraste o diagrama com o mouse para navegar pelas áreas fora da tela.
- **Clique em uma skill** (nó quadrado sob uma fase): abre um painel lateral com:
  - Resumo didático da habilidade.
  - Botão **“Buscar materiais”** (que chama a API Tavily para obter cursos/tutoriais reais).
  - Checkbox para marcar como concluída.
- **Checkbox na própria skill:** Marcar a habilidade como concluída (persiste no banco de dados).

**Dica:** O diagrama é mais prático que o texto para visualizar a sequência de aprendizagem. Use-o como seu guia principal.

## 8. Marcando habilidades como concluídas

Há duas formas de registrar progresso:

### Pelo diagrama interativo
1. Clique na skill desejada.
2. No painel lateral, marque o checkbox **“Marcar como concluída”**.
3. O nó no diagrama mudará de cor e receberá um traço de conclusão (line-through).

### Pelo chat (texto)
Digite um comando como:
- *“Marque SQL como concluído”*
- *“Registre meu progresso em Cypress como intermediário 60%”*

O agente invocará a tool `acompanhar_progresso` e confirmará o registro.

## 9. Solicitando recursos de estudo

Para qualquer habilidade do roadmap, você pode pedir materiais de duas formas:

1. **Clique na skill no diagrama** e depois no botão **“Buscar materiais”** – o sistema fará uma busca na web (via Tavily) e retornará links reais de cursos, tutoriais, documentações.
2. **Digite no chat:** *“Me indique recursos para aprender Postman”* ou *“Cursos de SQL para iniciante”*. O agente responderá com links atualizados.

## 10. Analisando seu GitHub

O Pathfinder pode analisar **um repositório público específico** seu e extrair habilidades detectadas nas linguagens e estrutura do código.

**Como usar:**

1. Envie a URL completa do repositório:  
   *“Analise meu repositório: https://github.com/seuusuario/meu-projeto”*
2. O agente retornará um relatório com:
   - Linguagens principais.
   - Nível de proficiência sugerido (iniciante/intermediário/avançado).
   - Habilidades detectadas.
   - Sugestões de registro de progresso.

**Limitação:** O agente analisa **apenas um repositório por vez** (não perfis inteiros). Para análise de perfil, analise seus principais repositórios individualmente.

## 11. Gerenciando o histórico de conversas

- **Abrir conversa anterior:** Na sidebar esquerda, clique no título da conversa desejada. O chat recarregará com o histórico completo.
- **Nova conversa:** Clique no botão **“Nova conversa”** (ícone `+` ou texto). O estado é reiniciado (mas o currículo enviado permanece, a menos que você o remova).
- **Título automático:** A primeira mensagem de uma nova conversa gera um título automático (via IA) após o primeiro retorno do assistente.

## 12. Alternando tema claro/escuro

No cabeçalho superior, clique no ícone de **sol/lua** para alternar entre:
- **Claro** (fundo branco, texto escuro).
- **Escuro** (fundo escuro, texto claro).
- **Sistema** (segue a preferência do seu dispositivo).

A escolha é salva no `localStorage` e persiste entre sessões.

## 13. Dicas e boas práticas

| Dica | Motivo |
|------|--------|
| **Sempre informe horas de estudo reais** | Os prazos do roadmap são ajustados conforme sua disponibilidade. |
| **Use o diagrama interativo** | É mais visual e permite marcar progresso rapidamente. |
| **Regenerar roadmap se sua rotina mudar** | Diga: *“Refaz o roadmap com 2h por dia”* – o agente recalculará os prazos. |
| **Peça recursos específicos** | Em vez de “me ensine SQL”, peça “recursos para aprender JOINs em SQL” – a busca será mais precisa. |
| **Mantenha seu currículo atualizado** | Envie um novo PDF sempre que ganhar novas habilidades ou experiências. |
| **Use o GitHub para portfólio** | O agente analisa repositórios; ter testes automatizados públicos demonstra suas habilidades de QA. |

## Suporte e dúvidas

- **Erro no upload do PDF?** Verifique se o arquivo tem menos de 5 MB e é realmente um PDF (não imagem escaneada sem texto extraível).
- **Agente não responde?** Verifique sua conexão com a internet. O streaming pode demorar alguns segundos.
- **Roadmap não aparece como diagrama?** Aguarde o fim do streaming e role a página até o final – o modal abre automaticamente, ou peça para IA te reenviar o Roadmap.

---

**Agora você está pronto para usar o NextStepAI!**  
Boa sorte na sua jornada de desenvolvimento de carreira. 🚀
