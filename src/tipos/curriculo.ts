// src/tipos/curriculo.ts
// Definições de tipos para currículos

export type NovoCurriculo = {
  usuarioId: string
  nomeArquivo: string
  chaveR2: string
  tamanhoBytes: number
}

export type ExperienciaProfissional = {
  cargo: string
  empresa: string
  periodo?: string
  descricao?: string
}

export type DadosCurriculo = {
  nome?: string
  email?: string
  telefone?: string
  formacao: string[]
  experiencias: ExperienciaProfissional[]
  habilidades: string[]
  idiomas: string[]
  resumo?: string
}

export type CurriculoCompleto = NovoCurriculo & {
  id: string
  carregadoEm: string
  processadoEm: string | null
  textoExtraido: string | null
  dadosEstruturados: DadosCurriculo | null
}