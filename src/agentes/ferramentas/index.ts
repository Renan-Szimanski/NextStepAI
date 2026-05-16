// src/agentes/ferramentas/index.ts

import { consultarBancoVetorial } from './buscar-vetor';
import { extrairTextoPdf } from './extrair-pdf';
import { estruturarDadosCurriculo } from './estruturar-curriculo';
import { buscarRecursosEducacionais } from './buscar-recursos';
import { acompanharProgressoTool } from './acompanhar-progresso'; // ← Nova tool

export const todasAsTools = [
  consultarBancoVetorial,
  extrairTextoPdf,
  estruturarDadosCurriculo,
  buscarRecursosEducacionais,
  acompanharProgressoTool, // ← Registrada
];

export {
  consultarBancoVetorial,
  extrairTextoPdf,
  estruturarDadosCurriculo,
  buscarRecursosEducacionais,
  acompanharProgressoTool,
};