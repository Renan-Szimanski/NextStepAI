// scripts/testar-embeddings.ts
import { gerarEmbedding } from '@/lib/langchain/embeddings';

async function main() {
  console.log('🔍 Testando geração de embedding...\n');

  const texto = 'Engenheiro de Dados Python';
  const inicio = Date.now();

  const vetor = await gerarEmbedding(texto);

  const tempo = Date.now() - inicio;

  console.log(`✅ Embedding gerado em ${tempo}ms`);
  console.log(`   Dimensões: ${vetor.length}`);
  console.log(`   Primeiros 5 valores: [${vetor.slice(0, 5).map((n) => n.toFixed(4)).join(', ')}, ...]`);

  if (vetor.length !== 384) {
    console.error(`❌ ESPERAVA 384 dimensões, recebi ${vetor.length}!`);
    process.exit(1);
  }

  console.log('\n🎉 Tudo certo!');
}

main().catch((erro) => {
  console.error('❌ Erro:', erro);
  process.exit(1);
});