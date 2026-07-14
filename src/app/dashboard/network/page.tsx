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

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8">
      <div className="fade-up">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Network</div>
        <h1 className="text-4xl font-black tracking-tight">Friends</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="fade-up">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold mb-2">Your Friend Code</h2>
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
            <h2 className="text-lg font-bold mb-2">Add a Friend</h2>
            <form onSubmit={sendRequest} className="flex gap-2">
              <Input value={friendCode} onChange={e => setFriendCode(e.target.value)} placeholder="Enter code..." />
              <Button type="submit">Send Request</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {requests.length > 0 && (
        <div className="fade-up space-y-4">
          <h2 className="text-2xl font-bold">Pending Requests</h2>
          <div className="space-y-2">
            {requests.map(req => (
              <Card key={req.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div><span className="font-bold">{req.requester.display_name}</span> wants to be friends.</div>
                  <div className="space-x-2">
                    <Button size="sm" onClick={() => acceptRequest(req.id)}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => declineRequest(req.id)}>Decline</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="fade-up space-y-4">
        <h2 className="text-2xl font-bold">Your Network ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="text-muted-foreground">You have no friends on the network yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map((f: any) => {
              const friend = f.requester.id === session?.user.id ? f.receiver : f.requester;
              const lastSeen = friend.last_seen ? formatDistanceToNow(new Date(friend.last_seen), { addSuffix: true }) : "never";
              const isOnline = friend.last_seen && (Date.now() - new Date(friend.last_seen).getTime() < 120000);

              return (
                <Card key={f.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-lg">{friend.display_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-muted-foreground/30'}`}></span>
                        {isOnline ? "Online now" : `Last seen ${lastSeen}`}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => unfriend(f.id)}>Remove</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
