// scripts/testar-historico.ts (corrigido)
import * as dotenv from 'dotenv';
import { resolve } from 'node:path';

// Carrega .env.local com precedência
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') }); // fallback

import {
  criarConversa,
  salvarMensagem,
  listarConversas,
  buscarConversa,
  deletarConversa,
} from '@/lib/supabase/historico';

const USUARIO_TESTE = 'dev-script-test';

async function testar() {
  console.log('🧪 Testando histórico...\n');

  // Criar conversa
  const conversaId = await criarConversa(USUARIO_TESTE, 'Roadmap para DevOps', 'DevOps');
  console.log('✅ Conversa criada:', conversaId);

  // Salvar mensagens
  await salvarMensagem(conversaId, 'usuario', 'Quero aprender Docker e Kubernetes');
  await salvarMensagem(conversaId, 'assistente', 'Vamos por partes...');
  console.log('✅ Mensagens salvas');

  // Listar conversas
  const conversas = await listarConversas(USUARIO_TESTE);
  console.log(`📋 Total de conversas: ${conversas.length}`);

  // Buscar conversa completa
  const completa = await buscarConversa(conversaId, USUARIO_TESTE);
  console.log(`💬 ${completa?.mensagens.length} mensagens encontradas`);
  console.log('   Primeira mensagem:', completa?.mensagens[0]?.conteudo.slice(0, 50));

  // Deletar (limpeza)
  await deletarConversa(conversaId, USUARIO_TESTE);
  console.log('🧹 Conversa deletada');

  console.log('\n🎉 Todos os testes passaram!');
}

testar().catch(console.error);