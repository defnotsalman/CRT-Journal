"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RankBadge } from "@/components/RankBadge";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function OracleNetworkPage() {
  const { session } = useAuth();
  const [signals, setSignals] = useState<any[]>([]);
  const [networkUsers, setNetworkUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!session) return;
    
    // Fetch network users
    const { data: friends } = await supabase
      .from("friendships")
      .select(`
        requester:profiles!friendships_requester_id_fkey ( id, display_name, rank ),
        receiver:profiles!friendships_receiver_id_fkey ( id, display_name, rank )
      `)
      .eq("status", "accepted")
      .or(`requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);
    
    const netMap: Record<string, any> = {};
    if (friends) {
      friends.forEach((f: any) => {
        const friend = f.requester.id === session.user.id ? f.receiver : f.requester;
        netMap[friend.id] = friend;
      });
    }
    const { data: myProf } = await supabase.from("profiles").select("id, display_name, rank").eq("id", session.user.id).single();
    if (myProf) netMap[myProf.id] = myProf;
    setNetworkUsers(netMap);

    // Fetch signals
    const { data: sigs } = await supabase.from("oracle_signals").select("*").order("created_at", { ascending: false });
    if (sigs) {
      setSignals(sigs.filter(s => netMap[s.user_id]));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [session]);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 });
    }
  }, [loading]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("oracle_signals").update({ status: newStatus }).eq("id", id);
    if (!error) {
      toast.success(`Signal marked as ${newStatus}`);
      loadData();
    } else {
      toast.error("Failed to update signal");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this signal?")) return;
    const { error } = await supabase.from("oracle_signals").delete().eq("id", id);
    if (!error) {
      toast.success("Signal deleted");
      loadData();
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-mono tracking-widest">Connecting to Oracle Network...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8">
      <div className="fade-up flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-cyan-500 uppercase tracking-[0.3em] font-bold mb-1">Live Intelligence</div>
          <h1 className="text-4xl font-black tracking-tight drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">ORACLE NETWORK</h1>
          <p className="text-muted-foreground text-sm mt-1">Post and view live trade setups before they happen. Build your Oracle reputation.</p>
        </div>
        <Link href="/dashboard/oracle/new">
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]">Post Signal</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {signals.length === 0 ? (
          <div className="fade-up p-12 text-center border border-dashed border-border rounded-xl text-muted-foreground">
            No live signals in your network. Be the first to post intelligence.
          </div>
        ) : (
          signals.map(sig => {
            const user = networkUsers[sig.user_id];
            const isMe = sig.user_id === session?.user.id;
            const isOpen = sig.status === 'open';

            return (
              <Card key={sig.id} className={`fade-up border-border overflow-hidden transition-all ${isOpen ? 'hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'opacity-75 grayscale'}`}>
                <CardContent className="p-0">
                  <div className={`p-4 border-b border-border flex justify-between items-center ${isOpen ? 'bg-cyan-500/5' : 'bg-muted/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-lg">{user?.display_name || "Unknown"}</div>
                      {user?.rank && <RankBadge rankTitle={user.rank} />}
                      <span className="text-xs text-muted-foreground ml-2">{formatDistanceToNow(new Date(sig.created_at))} ago</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      sig.status === 'win' ? 'bg-green-500/20 text-green-500' :
                      sig.status === 'loss' ? 'bg-red-500/20 text-red-500' :
                      'bg-cyan-500/20 text-cyan-500 animate-pulse'
                    }`}>
                      {sig.status}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-end justify-between mb-6">
                      <div>
                        <div className="text-3xl font-black">{sig.pair}</div>
                        <div className={`text-lg font-bold uppercase tracking-widest ${sig.direction === 'long' ? 'text-green-500' : 'text-red-500'}`}>
                          {sig.direction}
                        </div>
                      </div>
                      <div className="space-y-1 text-right font-mono text-sm">
                        <div><span className="text-muted-foreground">Entry:</span> {sig.entry_price || 'Market'}</div>
                        {sig.target_price && <div className="text-green-400"><span className="text-muted-foreground">TP:</span> {sig.target_price}</div>}
                        {sig.stop_loss && <div className="text-red-400"><span className="text-muted-foreground">SL:</span> {sig.stop_loss}</div>}
                      </div>
                    </div>

                    {sig.notes && (
                      <div className="bg-muted/20 p-4 rounded-lg text-sm text-muted-foreground border border-border/50">
                        "{sig.notes}"
                      </div>
                    )}

                    {isMe && isOpen && (
                      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                        <Button size="sm" variant="outline" onClick={() => handleDelete(sig.id)}>Delete</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(sig.id, 'loss')}>Mark Loss</Button>
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-black" onClick={() => handleUpdateStatus(sig.id, 'win')}>Mark Win</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
