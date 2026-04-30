// scripts/testar-rag.ts

import {
  buscarVagasSimilares,
  formatarVagasParaContexto,
} from '@/lib/langchain/vector-store';

async function main() {
  const queries = [
    'Analista de Dados em São Paulo',
    'Desenvolvedor backend Node.js',
    'Vaga para enfermeiro hospital',
    'Gerente comercial vendas',
    'Auxiliar de logística',
  ];

  console.log('🔍 Testando busca semântica no banco vetorial\n');
  console.log('═'.repeat(70));

  for (const query of queries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log('─'.repeat(70));

    const inicio = Date.now();
    const vagas = await buscarVagasSimilares(query, 3, 0.3);
    const tempo = Date.now() - inicio;

    console.log(`⏱️  ${tempo}ms — ${vagas.length} resultado(s)\n`);

    if (vagas.length === 0) {
      console.log('   ⚠️  Nenhuma vaga acima do threshold.');
      continue;
    }

    for (const vaga of vagas) {
      const sim = (vaga.similarity * 100).toFixed(1);
      console.log(`   [${sim}%] ${vaga.titulo}`);
      console.log(`          Área: ${vaga.area}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('🎉 Teste concluído!\n');
}

main().catch((erro) => {
  console.error('❌ Erro:', erro);
  process.exit(1);
});