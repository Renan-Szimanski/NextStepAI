// src/componentes/curriculo/UploadCurriculo.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/componentes/ui/button'
import { Progress } from '@/componentes/ui/progress'
import { toast } from 'sonner'
import { Trash2, FileText, Loader2 } from 'lucide-react' // Remove 'Upload' não usado

interface CurriculoAtual {
  id: string
  nomeOriginal: string
  tamanhoBytes: number
  carregadoEm: string
  urlLeitura: string
}

export function UploadCurriculo() {
  const [curriculoAtual, setCurriculoAtual] = useState<CurriculoAtual | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function carregarCurriculo() {
      try {
        const res = await fetch('/api/curriculo')
        if (!res.ok) throw new Error('Erro ao carregar currículo')
        const data = await res.json()
        if (data.curriculo) setCurriculoAtual(data.curriculo)
      } catch (err) {
        console.error(err)
      } finally {
        setCarregando(false)
      }
    }
    carregarCurriculo()
  }, [])

  async function handleUpload(file: File) {
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      toast.error('Arquivo muito grande. Máximo de 5 MB.')
      return
    }
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são permitidos.')
      return
    }

    setUploadStatus('uploading')
    setUploadProgress(0)

    try {
      const presignRes = await fetch('/api/curriculo/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeArquivo: file.name,
          tamanhoBytes: file.size,
        }),
      })
      if (!presignRes.ok) {
        const error = await presignRes.json()
        throw new Error(error.error || 'Falha ao obter URL de upload')
      }
      const { urlUpload, chave } = await presignRes.json()

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', urlUpload)
        xhr.setRequestHeader('Content-Type', 'application/pdf')
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(percent)
          }
        }
        xhr.onload = () => {
          if (xhr.status === 200) resolve(null)
          else reject(new Error(`Upload falhou: ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Erro de conexão'))
        xhr.send(file)
      })

      const registerRes = await fetch('/api/curriculo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chave,
          nomeOriginal: file.name,
          tamanhoBytes: file.size,
        }),
      })
      if (!registerRes.ok) {
        const error = await registerRes.json()
        throw new Error(error.error || 'Falha ao registrar currículo')
      }

      setUploadStatus('success')
      toast.success('Currículo enviado com sucesso!')
      const res = await fetch('/api/curriculo')
      const data = await res.json()
      if (data.curriculo) setCurriculoAtual(data.curriculo)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar currículo')
      setUploadStatus('error')
    } finally {
      setTimeout(() => setUploadStatus('idle'), 3000)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemover() {
    if (!curriculoAtual) return
    if (!confirm('Tem certeza que deseja remover seu currículo?')) return

    try {
      const res = await fetch('/api/curriculo', { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao remover')
      // src/componentes/curriculo/UploadCurriculo.tsx (Trecho corrigido)
      // ...
      setCurriculoAtual(null);
      toast.success('Currículo removido');
    } catch { // ✅ Removido o parâmetro err não utilizado
      toast.error('Erro ao remover currículo');
    }
// ...
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <h3 className="text-lg font-semibold">Meu Currículo</h3>

      {curriculoAtual ? (
        <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium truncate max-w-[200px] sm:max-w-xs">
                {curriculoAtual.nomeOriginal}
              </p>
              <p className="text-xs text-muted-foreground">
                {(curriculoAtual.tamanhoBytes / 1024).toFixed(0)} KB • Enviado em{' '}
                {new Date(curriculoAtual.carregadoEm).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(curriculoAtual.urlLeitura, '_blank')}
            >
              Visualizar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRemover}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground text-sm py-2">
          Nenhum currículo enviado.
        </div>
      )}

      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
          }}
          disabled={uploadStatus === 'uploading'}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-primary/20"
        />
        <p className="text-xs text-muted-foreground">Formato PDF, máximo 5 MB.</p>
      </div>

      {uploadStatus === 'uploading' && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">Enviando... {uploadProgress}%</p>
        </div>
      )}

      {uploadStatus === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400">✓ Currículo enviado com sucesso</p>
      )}
      {uploadStatus === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">✗ Erro no envio. Tente novamente.</p>
      )}
    </div>
  )
}