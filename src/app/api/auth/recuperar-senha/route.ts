import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";



export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    // TODO: adicionar rate limiting no E4 (ex: 3 tentativas por hora)
    const redirectTo = `${process.env.NEXTAUTH_URL}/nova-senha`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    // Por segurança, NÃO retornamos erro se o e-mail não existir.
    // Apenas logamos internamente.
    if (error) {
      console.error("Erro ao enviar recuperação de senha:", error.message);
      // Mesmo com erro, retornamos sucesso para não revelar existência do e-mail
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro inesperado em recuperar-senha:", err);
    return NextResponse.json({ ok: true }); // sempre sucesso por segurança
  }
}