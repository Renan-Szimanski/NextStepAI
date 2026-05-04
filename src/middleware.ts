import { auth } from "@/lib/auth";
import { NextResponse } from "next/server"; // Importação corrigida

export default auth((req) => {
  // Agora verificamos estritamente se existe um USUÁRIO logado
  const isLoggedIn = !!req.auth?.user; 
  const isChatRoute = req.nextUrl.pathname.startsWith("/chat");
  const isLoginRoute = req.nextUrl.pathname === "/login";

  // Redireciona para login se tentar acessar /chat sem autenticação
  if (isChatRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Redireciona para /chat se tentar acessar /login já estando autenticado
  if (isLoginRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/chat", req.nextUrl));
  }

  return NextResponse.next();
});

// Matcher para rodar o middleware apenas nas rotas necessárias
export const config = {
  matcher: ["/chat/:path*", "/login"],
};