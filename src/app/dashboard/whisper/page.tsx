"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Send, Lock, Clock, Flame } from "lucide-react";
import { BurnerMessage } from "@/components/BurnerMessage";

export default function WhisperNetworkPage() {
  const { session } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [isBurner, setIsBurner] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    loadFriends();
    loadUnreadCounts();
  }, [session]);

  async function loadUnreadCounts() {
    const { data } = await supabase.from("private_messages")
      .select("sender_id")
      .eq("receiver_id", session?.user?.id)
      .eq("is_read", false)
      .gt("expires_at", new Date().toISOString());
    
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(msg => {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
      });
      setUnreadCounts(counts);
    }
  }

  async function loadFriends() {
    const { data: fList } = await supabase
      .from("friendships")
      .select(`
        requester:profiles!friendships_requester_id_fkey ( id, display_name, avatar_url ),
        receiver:profiles!friendships_receiver_id_fkey ( id, display_name, avatar_url )
      `)
      .eq("status", "accepted")
      .or(`requester_id.eq.${session?.user?.id},receiver_id.eq.${session?.user?.id}`);
    
    if (fList) {
      const parsed = fList.map((f: any) => f.requester?.id === session?.user?.id ? f.receiver : f.requester).filter(Boolean);
      setFriends(parsed);
    }
  }

  useEffect(() => {
    if (!session || !selectedFriend) return;
    
    async function loadMessages() {
      const { data } = await supabase.from("private_messages")
        .select("*")
        .or(`and(sender_id.eq.${session?.user?.id},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${session?.user?.id})`)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
      
      // Mark as read
      await supabase.from("private_messages")
        .update({ is_read: true })
        .eq("receiver_id", session?.user?.id)
        .eq("sender_id", selectedFriend.id)
        .eq("is_read", false);
        
      setUnreadCounts(prev => ({ ...prev, [selectedFriend.id]: 0 }));
    }

    loadMessages();

    const sub = supabase.channel(`whisper_${selectedFriend.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages" }, payload => {
        const msg = payload.new;
        if (
          (msg.sender_id === session?.user?.id && msg.receiver_id === selectedFriend.id) ||
          (msg.sender_id === selectedFriend.id && msg.receiver_id === session?.user?.id)
        ) {
          setMessages(prev => [...prev, msg]);
          if (msg.receiver_id === session?.user?.id && !msg.is_read) {
             // mark as read instantly if chat is open
             supabase.from("private_messages").update({ is_read: true }).eq("id", msg.id).then();
          }
        } else if (msg.receiver_id === session?.user?.id) {
          // If we receive a message from someone else, update their unread count
          setUnreadCounts(prev => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "private_messages" }, payload => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

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
      sender_id: session?.user?.id,
      receiver_id: selectedFriend.id,
      content: newMessage.trim(),
      expires_at: expiresAt.toISOString(),
      is_burner: isBurner
    };
    
    setNewMessage("");
    setIsBurner(false);
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
          <div className="p-4 border-b border-border bg-background flex items-center justify-between">
            <h3 className="font-bold">Contacts</h3>
            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground h-6 px-2" onClick={async () => {
              await supabase.from("private_messages").update({ is_read: true }).eq("receiver_id", session?.user?.id).eq("is_read", false);
              setUnreadCounts({});
            }}>Mark All Read</Button>
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
                  <div className="w-10 h-10 rounded-full bg-background border border-border overflow-hidden shrink-0">
                    {f.avatar_url ? <img src={f.avatar_url} alt="avatar" /> : <div className="w-full h-full flex items-center justify-center text-xs">?</div>}
                  </div>
                  <div className="font-bold truncate flex-1">{f.display_name || "Unknown"}</div>
                  {unreadCounts[f.id] > 0 && (
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse">
                      {unreadCounts[f.id]}
                    </div>
                  )}
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
                    const isMe = msg.sender_id === session?.user?.id;
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-2 group`}
                        onMouseLeave={() => setContextMenuId(null)}
                      >
                        <div 
                          onContextMenu={(e) => { e.preventDefault(); setContextMenuId(msg.id); }}
                          className={`relative max-w-[70%] ${!msg.is_burner ? 'p-3 rounded-md cursor-context-menu transition-all' : ''} ${msg.is_burner ? '' : isMe ? 'bg-primary text-primary-foreground border border-primary/50' : 'bg-zinc-900 border border-zinc-800 text-zinc-300'} ${contextMenuId === msg.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-black' : ''}`}
                        >
                          {msg.is_burner ? (
                            <BurnerMessage msg={msg} isMe={isMe} />
                          ) : (
                            msg.content
                          )}
                          
                          {contextMenuId === msg.id && (
                            <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${isMe ? 'border-primary-foreground/20 justify-end' : 'border-zinc-700 justify-start'}`}>
                              <button 
                                onClick={async () => {
                                  await supabase.from("private_messages").delete().eq("id", msg.id);
                                  setContextMenuId(null);
                                }}
                                className={`flex items-center gap-1 text-xs font-bold hover:opacity-70 transition-opacity ${isMe ? 'text-primary-foreground' : 'text-red-400'}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg> 
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-border bg-muted/10">
                <div className="flex gap-2 mb-2 items-center">
                  <label className="flex items-center gap-2 text-xs font-bold text-red-500 cursor-pointer hover:text-red-400">
                    <input type="checkbox" checked={isBurner} onChange={e => setIsBurner(e.target.checked)} className="accent-red-500" />
                    <Flame className="w-3 h-3" /> Burner Mode
                  </label>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder={isBurner ? "Enter self-destructing message..." : "Enter encrypted message..."} 
                    className={`font-mono focus-visible:ring-primary ${isBurner ? 'bg-red-950/20 border-red-500/50 text-red-200 placeholder:text-red-500/50' : 'bg-black border-zinc-800'}`}
                  />
                  <Button type="submit" size="icon" className={isBurner ? "bg-red-500 hover:bg-red-600 text-white" : ""}><Send className="w-4 h-4" /></Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
