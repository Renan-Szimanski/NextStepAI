'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/componentes/ui/button'
import { Progress } from '@/componentes/ui/progress'
import { toast } from 'sonner'
import { Upload, X, Loader2, CheckCircle2, FileText, ExternalLink, Trash2 } from 'lucide-react'

interface CurriculoAtual {
  id: string
  nomeOriginal: string
  urlLeitura: string
  tamanhoBytes: number
  carregadoEm: string
}

interface UploadPopoverProps {
  onUploadSuccess: (nomeArquivo: string, urlLeitura: string) => void
  onClose: () => void
}

export function UploadPopover({ onUploadSuccess, onClose }: UploadPopoverProps) {
  const [curriculoAtual, setCurriculoAtual] = useState<CurriculoAtual | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function carregarCurriculo() {
      try {
        const res = await fetch('/api/curriculo')
        if (res.ok) {
          const data = await res.json()
          if (data.curriculo) {
            setCurriculoAtual(data.curriculo)
          }
        }
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

    setFileName(file.name)
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

      // Recarregar currículo atual
      const res = await fetch('/api/curriculo')
      const data = await res.json()
      if (data.curriculo) {
        setCurriculoAtual(data.curriculo)
        onUploadSuccess(data.curriculo.nomeOriginal, data.curriculo.urlLeitura)
      }
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar currículo')
      setUploadStatus('error')
      setTimeout(() => {
        setUploadStatus('idle')
      }, 2000)
    }
  }

  async function handleRemover() {
    if (!curriculoAtual) return
    if (!confirm('Tem certeza que deseja remover seu currículo?')) return

    try {
      const res = await fetch('/api/curriculo', { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao remover')
      setCurriculoAtual(null)
      toast.success('Currículo removido')
      // Recarregar para atualizar estado no chat
      window.location.reload() // ou usar callback
    } catch {
      toast.error('Erro ao remover currículo')
    }
  }

  // useEffect(() => {
  //   if (uploadStatus === 'idle' && !carregando && !curriculoAtual) {
  //     fileInputRef.current?.click()
  //   }
  // }, [uploadStatus, carregando, curriculoAtual])

  return (
    <div className="absolute bottom-full right-0 mb-2 w-80 rounded-lg border bg-background shadow-lg z-50 p-4 animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">Meu Currículo</h4>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {carregando ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : curriculoAtual ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{curriculoAtual.nomeOriginal}</p>
              <p className="text-[10px] text-muted-foreground">
                {(curriculoAtual.tamanhoBytes / 1024).toFixed(0)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => window.open(curriculoAtual.urlLeitura, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-600"
              onClick={handleRemover}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="border-t pt-2">
            <p className="text-xs text-muted-foreground mb-2">Enviar novo currículo:</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
              disabled={uploadStatus === 'uploading'}
              className="block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-semibold hover:file:bg-primary/20"
            />
          </div>
        </div>
      ) : (
        <div>
          {uploadStatus === 'idle' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                }}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Selecionar PDF
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Máximo 5 MB, apenas PDF
              </p>
            </>
          )}
        </div>
      )}

      {uploadStatus === 'uploading' && (
        <div className="space-y-2">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">Enviando... {uploadProgress}%</p>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm">Enviado com sucesso!</span>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
          <X className="h-5 w-5" />
          <span className="text-sm">Falha no envio</span>
        </div>
      )}
    </div>
  )
}