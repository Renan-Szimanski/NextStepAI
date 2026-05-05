// scripts/testar-agente.ts

import { processarMensagem } from '@/agentes/orquestrador';
import type { Mensagem } from '@/tipos';

async function main() {
  const mensagens: Mensagem[] = [
    {
      id: '1',
      papel: 'user',
      conteudo:
        'Quero virar Analista de Dados Júnior em São Paulo. Pode me ajudar a montar um roadmap?',
      timestamp: Date.now(),
      criadoEm: new Date()
    },
  ];

  console.log('🤖 Testando agente Pathfinder...\n');
  console.log('═'.repeat(70));

  let totalTokens = 0;
  let toolFoiChamada = false;
  const inicio = Date.now();

  for await (const evento of processarMensagem(mensagens)) {
    switch (evento.type) {
      case 'token':
        process.stdout.write(evento.content);
        totalTokens++;
        break;

      case 'tool_call':
        console.log(`\n\n🔧 [Tool chamada: ${evento.name}]`);
        toolFoiChamada = true;
        break;

      case 'tool_result':
        console.log(
          `✅ [Tool finalizada: ${evento.name} (success=${evento.success})]\n`,
        );
        break;

      case 'done': {
        const tempo = ((Date.now() - inicio) / 1000).toFixed(1);
        console.log('\n\n' + '═'.repeat(70));
        console.log(`🎉 Concluído em ${tempo}s`);
        console.log(`   Tokens emitidos: ${totalTokens}`);
        console.log(
          `   Tool foi chamada: ${toolFoiChamada ? '✅ Sim' : '⚠️  Não'}`,
        );
        break;
      }

      case 'error':
        console.error(`\n\n❌ Erro: ${evento.message}`);
        process.exit(1);
    }
  }
}

main().catch((erro) => {
  console.error('❌ Erro fatal:', erro);
  process.exit(1);
});