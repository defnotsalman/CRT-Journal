"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { DashboardStats } from "@/components/DashboardStats";
import { TradeList } from "@/components/TradeList";
import { EducationHub } from "@/components/EducationHub";
import { ChatBox } from "@/components/ChatBox";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [networkUsers, setNetworkUsers] = useState<Record<string, any>>({});
  const [trades, setTrades] = useState<any[]>([]);
  const [educationPosts, setEducationPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo(".fade-in-stagger", 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, [loading]);

  useEffect(() => {
    if (!session) return;
    
    async function loadData() {
      // 1. My Profile
      const { data: myProf } = await supabase.from("profiles").select("*").eq("id", session!.user.id).single();
      setProfile(myProf);

      // 2. Network Users Map
      const { data: friends } = await supabase
        .from("friendships")
        .select(`
          requester:profiles!friendships_requester_id_fkey ( id, display_name, last_seen ),
          receiver:profiles!friendships_receiver_id_fkey ( id, display_name, last_seen )
        `)
        .eq("status", "accepted")
        .or(`requester_id.eq.${session!.user.id},receiver_id.eq.${session!.user.id}`);
      
      const netMap: Record<string, any> = {};
      if (friends) {
        friends.forEach((f: any) => {
          const friend = f.requester.id === session!.user.id ? f.receiver : f.requester;
          netMap[friend.id] = friend;
        });
      }
      setNetworkUsers(netMap);

      // 3. Trades
      const { data: trs } = await supabase.from("trades").select("*").order("created_at", { ascending: false });
      if (trs) setTrades(trs.filter(t => t.user_id === session!.user.id));

      // 4. Education
      const { data: edu } = await supabase.from("education_resources").select("*, profiles(display_name)").order("created_at", { ascending: false });
      if (edu) setEducationPosts(edu);

      setLoading(false);
    }

    loadData();
  }, [session]);

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-8">
      <div className="fade-in-stagger">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Dashboard</div>
        <h1 className="text-4xl font-black tracking-tight">Your trades</h1>
      </div>

      <div className="fade-in-stagger">
        <DashboardStats trades={trades} profile={profile} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8 fade-in-stagger">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold tracking-tight">Recent Trades</h2>
              <Link href="/dashboard/trades"><Button variant="link">View all &rarr;</Button></Link>
            </div>
            <TradeList trades={trades} />
          </div>

          <div className="pt-8 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">Community Board</div>
                <h2 className="text-2xl font-bold tracking-tight">Education Hub</h2>
              </div>
              <Link href="/dashboard/education/new"><Button size="sm">Share Resource</Button></Link>
            </div>
            <EducationHub posts={educationPosts} />
          </div>
        </div>

        <div className="fade-in-stagger">
          <ChatBox networkUsers={networkUsers} />
        </div>
      </div>
    </div>
  );
}
