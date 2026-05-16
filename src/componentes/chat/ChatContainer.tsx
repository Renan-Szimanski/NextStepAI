'use client'

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { Compass } from 'lucide-react'

import type { Mensagem } from '@/tipos'
import type { EventoStreamSSE } from '@/tipos/agente'
import type { MensagemPersistida } from '@/tipos/historico'
import { lerStreamSSE } from '@/lib/stream'

import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'

import BotaoLogout from '@/componentes/auth/BotaoLogout'
import { ThemeToggle } from '@/componentes/theme-toggle'

interface ChatContainerProps {
  userId: string
  historicoInicial?: MensagemPersistida[] | null
  conversaId?: string
}

function converterHistoricoParaMensagens(historico: MensagemPersistida[]): Mensagem[] {
  return historico.map((msg) => ({
    id: msg.id,
    papel: msg.papel === 'usuario' ? 'user' : 'assistant',
    conteudo: msg.conteudo,
    timestamp: new Date(msg.criadoEm).getTime(),
    criadoEm: new Date(msg.criadoEm),
  }))
}

const MENSAGEM_BOAS_VINDAS: Mensagem = {
  id: uuidv4(),
  papel: 'assistant',
  conteudo:
    '**Olá!** Sou o **Pathfinder**, seu mentor de carreira guiado por IA.\n\n' +
    '**Você tem um currículo em PDF?**\n' +
    '- Se **sim**, faça o upload pelo botão abaixo e depois me informe seu cargo-alvo.\n' +
    '- Se **não**, pode me dizer diretamente qual área ou cargo você está mirando.\n\n' +
    '**Vamos começar!** 🚀',
  timestamp: Date.now(),
  criadoEm: new Date(),
}

export function ChatContainer({ userId, historicoInicial, conversaId: conversaIdProp }: ChatContainerProps) {
  const router = useRouter()
  const [conversaId, setConversaId] = useState<string | undefined>(conversaIdProp)
  const [mensagens, setMensagens] = useState<Mensagem[]>(() => {
    if (historicoInicial && historicoInicial.length > 0) {
      return converterHistoricoParaMensagens(historicoInicial)
    }
    return [MENSAGEM_BOAS_VINDAS]
  })
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentToolCall, setCurrentToolCall] = useState<string | null>(null)
  const [hasCurriculo, setHasCurriculo] = useState(false)

  const [sessionId] = useState<string>(() => uuidv4())
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    async function carregarStatusCurriculo() {
      try {
        const res = await fetch('/api/curriculo')
        if (res.ok) {
          const data = await res.json()
          setHasCurriculo(!!data.curriculo)
        }
      } catch (err) {
        console.error('Erro ao verificar currículo:', err)
      }
    }
    carregarStatusCurriculo()
  }, [])

  useEffect(() => {
    if (historicoInicial && historicoInicial.length > 0) {
      setMensagens(converterHistoricoParaMensagens(historicoInicial))
    } else {
      setMensagens([MENSAGEM_BOAS_VINDAS])
    }
    setConversaId(conversaIdProp)
  }, [historicoInicial, conversaIdProp])

  async function salvarMensagemNoHistorico(
    papel: 'usuario' | 'assistente',
    conteudo: string,
    primeiraMsgTitulo?: string,
    cargoAlvo?: string,
    conversaIdParam?: string
  ): Promise<string | undefined> {
    const idParaUsar = conversaIdParam ?? conversaId

    const response = await fetch('/api/planos/salvar-mensagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversaId: idParaUsar,
        papel,
        conteudo,
        primeiraMsgTitulo,
        cargoAlvo,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Falha ao salvar mensagem')
    }

    const data = await response.json()
    if (!idParaUsar && data.conversaId) {
      setConversaId(data.conversaId)
      router.refresh()
      return data.conversaId
    }
    return idParaUsar
  }

  async function enviarMensagem(texto: string, isAutomatica = false) {
    if (!texto.trim() || isStreaming) return

    const novaMensagemUsuario: Mensagem = {
      id: uuidv4(),
      papel: 'user',
      conteudo: texto,
      timestamp: Date.now(),
      criadoEm: new Date(),
    }

    const mensagensAtualizadas = [...mensagens, novaMensagemUsuario]

    setMensagens([
      ...mensagensAtualizadas,
      {
        id: uuidv4(),
        papel: 'assistant',
        conteudo: '',
        timestamp: Date.now(),
        criadoEm: new Date(),
      },
    ])
    setIsStreaming(true)
    setCurrentToolCall(null)

    let idAtual = conversaId
    const isNovaConversa =
      !idAtual && mensagens.length === 1 && mensagens[0].papel === 'assistant' && mensagens[0].conteudo === MENSAGEM_BOAS_VINDAS.conteudo

    try {
      if (isNovaConversa) {
        const novoId = await salvarMensagemNoHistorico('usuario', texto, texto.slice(0, 60), undefined, undefined)
        if (novoId) idAtual = novoId
      } else if (idAtual) {
        await salvarMensagemNoHistorico('usuario', texto, undefined, undefined, idAtual)
      } else {
        console.warn('Estado inválido: sem conversaId e não é primeira mensagem')
      }
    } catch (err) {
      console.error('Erro ao salvar mensagem do usuário:', err)
      toast.error('Erro ao iniciar conversa. Tente novamente.')
      setMensagens((prev) => prev.slice(0, -1))
      setIsStreaming(false)
      return
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch('/api/mensagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: mensagensAtualizadas,
          sessionId,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error('Erro na requisição')
      }

      let respostaCompleta = ''

      for await (const evento of lerStreamSSE(response)) {
        switch (evento.type) {
          case 'token':
            respostaCompleta += evento.content
            setMensagens((prev) =>
              prev.map((msg, index) => {
                if (index === prev.length - 1 && msg.papel === 'assistant') {
                  return { ...msg, conteudo: msg.conteudo + evento.content }
                }
                return msg
              })
            )
            break
          case 'tool_call':
            setCurrentToolCall(evento.name)
            break
          case 'tool_result':
            setCurrentToolCall(null)
            break
          case 'done':
            setIsStreaming(false)
            if (respostaCompleta && idAtual) {
              try {
                await salvarMensagemNoHistorico('assistente', respostaCompleta, undefined, undefined, idAtual)
                console.log('✅ Mensagem do assistente salva')

                if (isNovaConversa && idAtual) {
                  console.log('🚀 Gerando título automático para conversa:', idAtual)
                  fetch('/api/planos/gerar-titulo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversaId: idAtual }),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.titulo) {
                        console.log('🏷️ Título gerado:', data.titulo)
                        router.refresh()
                      }
                    })
                    .catch((err) => console.error('❌ Erro ao gerar título:', err))
                }
              } catch (err) {
                console.error('❌ Erro ao salvar resposta do assistente:', err)
                toast.error('Erro ao salvar a resposta. A conversa pode não ser persistida.')
              }
            } else {
              console.warn('⚠️ Não salvou assistente: respostaCompleta vazia ou idAtual inválido')
            }
            return
          case 'error':
            toast.error('Erro no processamento da IA')
            setIsStreaming(false)
            return
        }
      }
    } catch (error) {
      console.error(error)
      toast.error('Erro de conexão com o servidor')
      setMensagens((prev) => prev.slice(0, -1))
      setIsStreaming(false)
    }
  }

  async function handleUploadSuccess(nomeArquivo: string, urlLeitura: string) {
    setHasCurriculo(true)

    fetch('/api/curriculo')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!data.curriculo) {
          console.warn(
            '[ChatContainer] Confirmação em background: currículo não encontrado no servidor, ' +
            'mas o upload foi confirmado anteriormente. Mantendo estado true.'
          )
        }
      })
      .catch((err) => {
        console.error('[ChatContainer] Erro ao confirmar currículo no servidor (ignorado):', err)
      })

    const mensagem = `✅ Realizei o envio do meu currículo: 📄 ${nomeArquivo}\n\n`
    await enviarMensagem(mensagem, true)
  }

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return (
    <main role="main" aria-label="Conversa com o Pathfinder" className="flex h-full flex-col bg-background relative">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/40 bg-background/80 backdrop-blur-md px-4 py-3 shadow-sm transition-colors shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20" aria-hidden="true">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">Pathfinder</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isStreaming ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'
              }`}
              aria-hidden="true"
            />
            <p className="text-xs font-medium text-muted-foreground">
              {isStreaming ? 'Processando...' : 'Mentor IA Online'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />
          <div className="border-l border-border pl-4">
            <BotaoLogout />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-background/50">
        <MessageList mensagens={mensagens} isStreaming={isStreaming} currentToolCall={currentToolCall} />
      </div>

      <div className="border-t border-border/40 bg-gradient-to-t from-background to-background/95 px-4 py-4 backdrop-blur-sm shrink-0">
        <div className="mx-auto w-full max-w-[800px]">
          <MessageInput
            onSubmit={enviarMensagem}
            disabled={isStreaming}
            hasCurriculo={hasCurriculo}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
      </div>
    </main>
  )
}