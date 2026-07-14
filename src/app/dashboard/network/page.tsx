"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export default function NetworkPage() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [friendCode, setFriendCode] = useState("");

  const loadNetwork = async () => {
    if (!session) return;
    
    const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    setProfile(myProfile);

    const { data: rels } = await supabase
      .from("friendships")
      .select(`
        id, status, requester_id, receiver_id, created_at,
        requester:profiles!friendships_requester_id_fkey ( id, display_name, friend_code, last_seen ),
        receiver:profiles!friendships_receiver_id_fkey ( id, display_name, friend_code, last_seen )
      `)
      .or(`requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);

    if (rels) {
      setFriends(rels.filter(r => r.status === "accepted"));
      setRequests(rels.filter(r => r.status === "pending" && r.receiver_id === session.user.id));
    }
  };

  useEffect(() => {
    loadNetwork();
  }, [session]);

  useGSAP(() => {
    gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 });
  }, []);

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCode.trim() || !profile) return;
    if (friendCode.trim() === profile.friend_code) return toast.error("You can't add yourself!");

    const { data: target } = await supabase.from("profiles").select("id").eq("friend_code", friendCode.trim()).single();
    if (!target) return toast.error("User not found!");

    const { error } = await supabase.from("friendships").insert({
      requester_id: session!.user.id,
      receiver_id: target.id,
      status: "pending"
    });

    if (error) toast.error("Request already sent or error occurred.");
    else {
      toast.success("Friend request sent!");
      setFriendCode("");
    }
  };

  const acceptRequest = async (id: string) => {
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    if (!error) {
      toast.success("Request accepted!");
      loadNetwork();
    }
  };

  const declineRequest = async (id: string) => {
    const { error } = await supabase.from("friendships").delete().eq("id", id);
    if (!error) {
      toast.info("Request declined.");
      loadNetwork();
    }
  };

  const unfriend = async (id: string) => {
    const { error } = await supabase.from("friendships").delete().eq("id", id);
    if (!error) {
      toast.info("Unfriended user.");
      loadNetwork();
    }
  };

  const isOnline = (dateString?: string) => {
    if (!dateString) return false;
    return (new Date().getTime() - new Date(dateString).getTime()) < 5 * 60 * 1000;
  };

  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return "Never";
    const mins = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8">
      <div className="fade-up">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Network</div>
        <h1 className="text-4xl font-heading tracking-tight">Friends</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="fade-up">
          <CardContent className="p-6">
            <h2 className="text-lg font-heading mb-2">Your Friend Code</h2>
            <div className="flex gap-2">
              <Input readOnly value={profile?.friend_code || "Loading..."} className="font-mono text-primary bg-primary/10 border-primary/30" />
              <Button variant="outline" onClick={() => {
                navigator.clipboard.writeText(profile?.friend_code);
                toast.success("Copied!");
              }}>Copy</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="fade-up">
          <CardContent className="p-6">
            <h2 className="text-lg font-heading mb-2">Add a Friend</h2>
            <form onSubmit={sendRequest} className="flex gap-2">
              <Input placeholder="Enter code (e.g. A1B2C3)" value={friendCode} onChange={e => setFriendCode(e.target.value)} className="font-mono uppercase" maxLength={6} />
              <Button type="submit">Send Request</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {requests.length > 0 && (
        <div className="space-y-4 fade-up">
          <h2 className="text-xl font-heading border-b border-border pb-2">Pending Requests</h2>
          <div className="grid gap-3">
            {requests.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card/50">
                <span className="font-bold">{r.requester?.display_name}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptRequest(r.id)}>Accept</Button>
                  <Button size="sm" variant="destructive" onClick={() => declineRequest(r.id)}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 fade-up">
        <h2 className="text-xl font-heading border-b border-border pb-2">My Network</h2>
        {friends.length === 0 ? (
          <div className="text-muted-foreground italic p-4 border border-border border-dashed rounded-lg text-center">
            You haven't added any friends yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {friends.map(f => {
              const friendProf = f.requester_id === session?.user.id ? f.receiver : f.requester;
              const online = isOnline(friendProf?.last_seen);
              return (
                <div key={f.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card/50 hover:border-primary/50 transition-colors">
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      {friendProf?.display_name}
                      {online ? (
                        <span className="flex h-2 w-2 relative" title="Online now">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-normal ml-1">
                          {getRelativeTime(friendProf?.last_seen)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">Code: {friendProf?.friend_code}</div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => unfriend(f.id)}>
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
