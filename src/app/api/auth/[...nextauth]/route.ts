export const runtime = 'nodejs'  // ← força Node.js runtime

import { handlers } from "@/lib/auth";

// Exporta os métodos GET e POST que o NextAuth utiliza internamente
export const { GET, POST } = handlers;