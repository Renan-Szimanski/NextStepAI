// src/componentes/chat/ChatContainer.tsx
'use client'

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { Compass, Map } from 'lucide-react'

import type { Mensagem } from '@/tipos'
import type { EventoStreamSSE } from '@/tipos/agente'
import type { MensagemPersistida } from '@/tipos/historico'
import { lerStreamSSE } from '@/lib/stream'
import { contemRoadmap } from '@/lib/detectar-roadmap'

import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { ModalRoadmap } from './ModalRoadmap'

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

function extrairRoadmapDasMensagens(mensagens: Mensagem[]): string | null {
  for (let i = mensagens.length - 1; i >= 0; i--) {
    const msg = mensagens[i]
    if (msg.papel === 'assistant' && contemRoadmap(msg.conteudo)) {
      return msg.conteudo
    }
  }
  return null
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

  // Roadmap persistente
  const [roadmapSalvo, setRoadmapSalvo] = useState<string | null>(null)
  
  // Estado para controlar a abertura do modal via botão flutuante
  const [modalRoadmapAberto, setModalRoadmapAberto] = useState(false)

  const carregarRoadmap = async (id: string | undefined, msgs: Mensagem[]) => {
    if (!id) {
      setRoadmapSalvo(null)
      return
    }

    const cacheKey = `roadmap_${id}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setRoadmapSalvo(cached)
      return
    }

    try {
      const res = await fetch(`/api/conversas/${id}/roadmap`)
      const data = await res.json()
      if (data.roadmap) {
        localStorage.setItem(cacheKey, data.roadmap)
        setRoadmapSalvo(data.roadmap)
        return
      }
    } catch (err) {
      console.error('[Roadmap] Erro ao buscar backend:', err)
    }

    const extraido = extrairRoadmapDasMensagens(msgs)
    if (extraido) {
      localStorage.setItem(cacheKey, extraido)
      setRoadmapSalvo(extraido)
      fetch('/api/planos/salvar-mensagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversaId: id, papel: 'assistente', conteudo: extraido }),
      }).catch(e => console.error('Falha ao salvar roadmap extraído:', e))
    } else {
      setRoadmapSalvo(null)
    }
  }

  // Recarrega ao mudar de conversa
  useEffect(() => {
    if (conversaId) {
      carregarRoadmap(conversaId, mensagens)
    } else {
      setRoadmapSalvo(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversaId])

  // Fallback: se novas mensagens chegarem e ainda não temos roadmap, tenta extrair
  useEffect(() => {
    if (conversaId && mensagens.length > 0 && !roadmapSalvo) {
      const extraido = extrairRoadmapDasMensagens(mensagens)
      if (extraido) carregarRoadmap(conversaId, mensagens)
    }
  }, [mensagens, conversaId, roadmapSalvo])

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
    if (!response.ok) throw new Error('Falha ao salvar mensagem')
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
      { id: uuidv4(), papel: 'assistant', conteudo: '', timestamp: Date.now(), criadoEm: new Date() },
    ])
    setIsStreaming(true)
    setCurrentToolCall(null)

    let idAtual = conversaId
    const isNovaConversa = !idAtual && mensagens.length === 1 && mensagens[0].papel === 'assistant' && mensagens[0].conteudo === MENSAGEM_BOAS_VINDAS.conteudo

    try {
      if (isNovaConversa) {
        const novoId = await salvarMensagemNoHistorico('usuario', texto, texto.slice(0, 60), undefined, undefined)
        if (novoId) idAtual = novoId
      } else if (idAtual) {
        await salvarMensagemNoHistorico('usuario', texto, undefined, undefined, idAtual)
      }
    } catch (err) {
      console.error(err)
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
        body: JSON.stringify({ messages: mensagensAtualizadas, sessionId }),
        signal: abortController.signal,
      })
      if (!response.ok) throw new Error('Erro na requisição')

      let respostaCompleta = ''
      for await (const evento of lerStreamSSE(response)) {
        switch (evento.type) {
          case 'token':
            respostaCompleta += evento.content
            setMensagens((prev) =>
              prev.map((msg, idx) =>
                idx === prev.length - 1 && msg.papel === 'assistant'
                  ? { ...msg, conteudo: msg.conteudo + evento.content }
                  : msg
              )
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
                if (contemRoadmap(respostaCompleta)) {
                  localStorage.setItem(`roadmap_${idAtual}`, respostaCompleta)
                  setRoadmapSalvo(respostaCompleta)
                } else {
                  await carregarRoadmap(idAtual, [...mensagensAtualizadas, { id: uuidv4(), papel: 'assistant', conteudo: respostaCompleta, timestamp: Date.now(), criadoEm: new Date() }])
                }
                if (isNovaConversa && idAtual) {
                  fetch('/api/planos/gerar-titulo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversaId: idAtual }) }).catch(() => {})
                }
              } catch (err) {
                console.error(err)
                toast.error('Erro ao salvar a resposta.')
              }
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
      toast.error('Erro de conexão')
      setMensagens((prev) => prev.slice(0, -1))
      setIsStreaming(false)
    } finally {
      abortControllerRef.current = null
    }
  }

  async function handleUploadSuccess(nomeArquivo: string, urlLeitura: string) {
    setHasCurriculo(true)
    await enviarMensagem(`✅ Enviei meu currículo: ${nomeArquivo}`, true)
  }

  const abortControllerRef = useRef<AbortController | null>(null)
  const [sessionId] = useState(() => uuidv4())

  useEffect(() => {
    return () => abortControllerRef.current?.abort()
  }, [])

  return (
    <main className="flex h-full flex-col bg-background relative">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4 py-3 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Compass className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-semibold">Pathfinder</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`h-2 w-2 rounded-full ${isStreaming ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
            <p className="text-xs font-medium text-muted-foreground">
              {isStreaming ? 'Processando...' : 'Mentor IA Online'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <BotaoLogout />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <MessageList mensagens={mensagens} isStreaming={isStreaming} currentToolCall={currentToolCall} />
      </div>

      <div className="border-t px-4 py-4">
        <MessageInput
          onSubmit={enviarMensagem}
          disabled={isStreaming}
          hasCurriculo={hasCurriculo}
          onUploadSuccess={handleUploadSuccess}
        />
      </div>

      {/* ✅ Apenas o botão flutuante com ícone de roadmap no canto inferior direito */}
      {roadmapSalvo && (
        <div className="fixed bottom-24 right-6 z-50">
          <button
            onClick={() => setModalRoadmapAberto(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-3 shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Ver Roadmap"
            title="Ver Roadmap Visual"
          >
            <Map className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* ✅ Modal Roadmap com botão inline oculto (hideInlineButton=true) */}
      {roadmapSalvo && (
        <ModalRoadmap 
          textoRoadmap={roadmapSalvo}
          aberto={modalRoadmapAberto}
          onAbertoChange={setModalRoadmapAberto}
          hideInlineButton={true}
        />
      )}
    </main>
  )
}