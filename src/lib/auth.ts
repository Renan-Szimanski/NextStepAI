import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

// Inicializa o cliente do Supabase para o servidor
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 1. Busca o usuário no Supabase pelo e-mail
        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("email", credentials.email)
          .single();

        if (!user || !user.password) {
          return null; // Usuário não existe ou não tem senha (ex: logou pelo Google)
        }

        // 2. Compara a senha digitada com o hash salvo no banco
        // O valor vem como string do form, por isso o "as string"
        const senhasBatem = await bcrypt.compare(
          credentials.password as string, 
          user.password
        );

        if (senhasBatem) {
          // 3. Se deu certo, retorna os dados que o NextAuth vai guardar na sessão
          return {
            id: user.id,
            name: user.name,
            email: user.email,
          };
        }

        return null; // Senha errada
      }
    })
  ],
  // Páginas personalizadas para o NextAuth usar as nossas, e não as feias dele
  pages: {
    signIn: "/login",
    newUser: "/cadastro", 
  },
  // Como estamos usando Credenciais, a estratégia de sessão DEVE ser JWT (tokens)
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Adiciona o ID do usuário no token e na sessão, muito útil para depois!
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  }
});