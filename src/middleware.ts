import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const estaLogado = !!req.auth;
  const ehRotaDeChat = req.nextUrl.pathname.startsWith("/chat");
  const ehRotaDeLogin = req.nextUrl.pathname === "/login";

  // Se tentar acessar o chat sem estar logado, vai para o login
  if (ehRotaDeChat && !estaLogado) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Se já estiver logado e tentar ir para o login, vai para o chat
  if (ehRotaDeLogin && estaLogado) {
    return NextResponse.redirect(new URL("/chat", req.nextUrl));
  }

  return NextResponse.next();
});

// Configuração de quais rotas o middleware deve monitorar
export const config = {
  matcher: ["/chat/:path*", "/login"],
};