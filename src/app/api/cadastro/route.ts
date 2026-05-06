import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

// Inicializa o cliente do Supabase usando as chaves que você já tem na Vercel/local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, email, senha } = body;

    if (!nome || !email || !senha) {
      return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 });
    }

    // 1. Verifica se o e-mail já existe no banco
    const { data: usuarioExistente } = await supabase
      .from("users") // Substitua "users" pelo nome da sua tabela de usuários, se for diferente
      .select("id")
      .eq("email", email)
      .single();

    if (usuarioExistente) {
      return NextResponse.json({ error: "Este e-mail já está em uso." }, { status: 400 });
    }

    // 2. Criptografa a senha
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // 3. Salva o novo usuário no Supabase
    const { data: novoUsuario, error } = await supabase
      .from("users")
      .insert([
        {
          name: nome,
          email: email,
          password: senhaCriptografada, // Salva o hash, não a senha real!
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { message: "Usuário criado com sucesso", user: { id: novoUsuario.id, email: novoUsuario.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro no cadastro:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}