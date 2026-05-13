// src/agentes/ferramentas/index.ts
import { consultarBancoVetorial } from './buscar-vetor'
import { extrairTextoPdf } from './extrair-pdf'
import { estruturarDadosCurriculo } from './estruturar-curriculo'

// Futuras tools:
// import { buscarRecursosEducacionais } from './buscar-recursos'

export const todasAsTools = [
  consultarBancoVetorial,
  extrairTextoPdf,
  estruturarDadosCurriculo,
  // buscarRecursosEducacionais,
]

export { consultarBancoVetorial, extrairTextoPdf, estruturarDadosCurriculo }