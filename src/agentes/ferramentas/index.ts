// src/agentes/ferramentas/index.ts
import { consultarBancoVetorial } from './buscar-vetor'
import { extrairTextoPdf } from './extrair-pdf'

// Futuras tools:
// import { estruturarCurriculo } from './estruturar-curriculo'
// import { buscarRecursosEducacionais } from './buscar-recursos'

export const todasAsTools = [
  consultarBancoVetorial,
  extrairTextoPdf,
  // estruturarCurriculo,
  // buscarRecursosEducacionais,
]

// Reexporta com nome antigo para compatibilidade (se necessário)
export { consultarBancoVetorial as buscarVetor, extrairTextoPdf }