import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

async function ensureUsuarioRecord(user: User) {
  const nome = user.user_metadata?.full_name
    || user.email?.split("@")[0]
    || "Usuário";

  await supabase.from("tab_usuarios").upsert(
    { id: user.id, usu_nome: nome, usu_email: user.email ?? null },
    { onConflict: "id", ignoreDuplicates: true }
  );
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) ensureUsuarioRecord(u);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) ensureUsuarioRecord(u);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signOut };
}
