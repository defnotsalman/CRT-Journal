"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

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

    // Bat-Signal Listener
    const tradesSub = supabase.channel('global_bat_signal')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades' }, async (payload) => {
        const trade = payload.new;
        if (trade.rr_achieved && trade.rr_achieved >= 3) {
          // Check if this trade is from a friend
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession || currentSession.user.id === trade.user_id) return;
          
          const { data: isFriend } = await supabase.from('friendships')
            .select('id')
            .eq('status', 'accepted')
            .or(`and(requester_id.eq.${currentSession.user.id},receiver_id.eq.${trade.user_id}),and(requester_id.eq.${trade.user_id},receiver_id.eq.${currentSession.user.id})`)
            .single();

          if (isFriend) {
            toast.success(`🦇 BAT-SIGNAL: A friend just secured a massive +${trade.rr_achieved}R win on ${trade.pair}!`, {
              duration: 10000,
              style: { backgroundColor: '#eab308', color: '#000', border: '1px solid #000' }
            });
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(tradesSub);
    };
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
