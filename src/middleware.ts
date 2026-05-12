// src/middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user; 
  const isChatRoute = req.nextUrl.pathname.startsWith("/chat");
  const isPlanosRoute = req.nextUrl.pathname.startsWith("/meus-planos");
  const isLoginRoute = req.nextUrl.pathname === "/login";

  if ((isChatRoute || isPlanosRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoginRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/chat", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/chat/:path*", "/meus-planos/:path*", "/login"],
};