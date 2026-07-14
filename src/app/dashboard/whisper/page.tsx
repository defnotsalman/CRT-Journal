"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Send, Lock, Clock } from "lucide-react";

export default function WhisperNetworkPage() {
  const { session } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    loadFriends();
  }, [session]);

  async function loadFriends() {
    const { data: fList } = await supabase
      .from("friendships")
      .select(`
        requester:profiles!friendships_requester_id_fkey ( id, display_name, avatar_url ),
        receiver:profiles!friendships_receiver_id_fkey ( id, display_name, avatar_url )
      `)
      .eq("status", "accepted")
      .or(`requester_id.eq.${session!.user.id},receiver_id.eq.${session!.user.id}`);
    
    if (fList) {
      const parsed = fList.map((f: any) => f.requester.id === session!.user.id ? f.receiver : f.requester);
      setFriends(parsed);
    }
  }

  useEffect(() => {
    if (!session || !selectedFriend) return;
    
    async function loadMessages() {
      const { data } = await supabase.from("private_messages")
        .select("*")
        .or(`and(sender_id.eq.${session!.user.id},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${session!.user.id})`)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    }

    loadMessages();

    const sub = supabase.channel(`whisper_${selectedFriend.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages" }, payload => {
        const msg = payload.new;
        if (
          (msg.sender_id === session!.user.id && msg.receiver_id === selectedFriend.id) ||
          (msg.sender_id === selectedFriend.id && msg.receiver_id === session!.user.id)
        ) {
          setMessages(prev => [...prev, msg]);
        }
      }).subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [session, selectedFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useGSAP(() => {
    gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 });
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedFriend) return;
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour self-destruct

    const payload = {
      sender_id: session!.user.id,
      receiver_id: selectedFriend.id,
      content: newMessage.trim(),
      expires_at: expiresAt.toISOString()
    };
    
    setNewMessage("");
    await supabase.from("private_messages").insert(payload);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 h-[80vh] flex flex-col space-y-4">
      <div className="fade-up">
        <div className="text-xs font-mono text-primary flex items-center gap-2 uppercase tracking-widest mb-2">
          <Lock className="w-3 h-3" /> Encrypted Network
        </div>
        <h1 className="text-4xl font-black tracking-tight">Whisper Comms</h1>
        <p className="text-sm text-muted-foreground mt-1">End-to-end encrypted. Messages permanently self-destruct after 24 hours.</p>
      </div>

      <div className="flex-1 border border-border bg-card rounded-xl overflow-hidden flex fade-up shadow-2xl">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-border bg-muted/20 flex flex-col">
          <div className="p-4 border-b border-border bg-background">
            <h3 className="font-bold">Contacts</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">No active connections found.</p>
            ) : (
              friends.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFriend(f)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${selectedFriend?.id === f.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  <div className="w-10 h-10 rounded-full bg-background border border-border overflow-hidden">
                    {f.avatar_url ? <img src={f.avatar_url} alt="avatar" /> : <div className="w-full h-full flex items-center justify-center text-xs">?</div>}
                  </div>
                  <div className="font-bold truncate">{f.display_name || "Unknown"}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="w-2/3 flex flex-col bg-background relative">
          {!selectedFriend ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Lock className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a contact to establish secure connection.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between">
                <div className="font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Secure Link to {selectedFriend.display_name}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                  <Clock className="w-3 h-3" /> 24h Auto-delete
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm bg-black">
                {messages.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground mt-10">Connection established. Handshake complete.</div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === session!.user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-3 rounded-md ${isMe ? 'bg-primary text-primary-foreground border border-primary/50' : 'bg-zinc-900 border border-zinc-800 text-zinc-300'}`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-border bg-muted/10">
                <div className="flex gap-2">
                  <Input 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Enter encrypted message..." 
                    className="font-mono bg-black border-zinc-800 focus-visible:ring-primary"
                  />
                  <Button type="submit" size="icon"><Send className="w-4 h-4" /></Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
