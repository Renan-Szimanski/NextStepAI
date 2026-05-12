import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, email, senha } = body;

    if (!nome || !email || !senha) {
      return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 });
    }

    if (senha.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres" }, { status: 400 });
    }

    // Cadastro via Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          name: nome,          // salva o nome no user_metadata
        },
      },
    });

    if (error) {
      console.error("Erro no signUp:", error);
      if (error.message.includes("already registered")) {
        return NextResponse.json({ error: "Este e-mail já está em uso." }, { status: 400 });
      }
      return NextResponse.json({ error: "Erro ao criar conta. Tente novamente." }, { status: 500 });
    }

    // Se o Supabase estiver configurado para confirmar e-mail, o usuário só conseguirá logar após verificar
    return NextResponse.json(
      { 
        message: "Conta criada! Verifique seu e-mail para confirmar o cadastro antes de fazer login.",
        user: { id: data.user?.id, email: data.user?.email }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro no cadastro:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}