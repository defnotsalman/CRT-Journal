"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";

type AuthContextType = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ session: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleProfile = async (session: Session | null) => {
      if (session) {
        // Generate friend code if it doesn't exist
        const friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Supabase upsert will ignore if id already exists
        await supabase.from("profiles").upsert({
          id: session.user.id,
          email: session.user.email,
          display_name: session.user.email?.split("@")[0] || "User",
          friend_code: friendCode
        }, { onConflict: "id", ignoreDuplicates: true });
        
        // Also update last seen
        await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", session.user.id);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      handleProfile(session);
      handleRedirect(session, pathname, router);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      handleProfile(session);
      handleRedirect(session, pathname, router);
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function handleRedirect(session: Session | null, pathname: string, router: any) {
  if (!session && pathname.startsWith("/dashboard")) {
    router.push("/");
  } else if (session && pathname === "/") {
    router.push("/dashboard");
  }
}

export const useAuth = () => useContext(AuthContext);
