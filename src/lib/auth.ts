import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";

// Estendendo os tipos do NextAuth para incluir o ID do usuário na sessão
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  // Estratégia JWT para o MVP (sem necessidade de banco de dados para a sessão)
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login", // Redireciona para nossa página customizada de login
  },
  callbacks: {
    // Adiciona o ID do usuário ao Token JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // Repassa o ID do token para a sessão acessível no Frontend/Server Components
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});