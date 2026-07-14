"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScrollArea } from "./ui/scroll-area";
import { X, Reply } from "lucide-react";

export function ChatBox({ networkUsers }: { networkUsers: Record<string, any> }) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [replyToMsg, setReplyToMsg] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;

    // Fetch past 12 hrs
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    supabase
      .from("messages")
      .select("*")
      .gt("created_at", twelveHoursAgo)
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data);
      });

    const channel = supabase.channel("live-chat")
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const payload = {
      user_id: session?.user.id,
      content: inputValue.trim(),
      reply_to: replyToMsg ? replyToMsg.id : null
    };

    setInputValue("");
    setReplyToMsg(null);

    const { error } = await supabase.from("messages").insert(payload);
    if (error) {
      toast.error("Failed to send message");
    }
  };

  const getDisplayName = (id: string) => {
    if (id === session?.user.id) return "You";
    return networkUsers[id]?.display_name || "Unknown";
  };

  return (
    <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden h-[400px]">
      <div className="p-3 border-b border-border flex justify-between items-center bg-muted/20">
        <h3 className="font-bold flex items-center gap-2">Live Chat 💬</h3>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-3">
          {messages.map(msg => {
            const isMe = msg.user_id === session?.user.id;
            const replyMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                <span className="text-[10px] text-muted-foreground mb-1 ml-1">{getDisplayName(msg.user_id)} • {format(new Date(msg.created_at), "h:mm a")}</span>
                
                <div className={`relative max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                  {replyMsg && (
                    <div className="mb-2 pl-2 border-l-2 border-primary/50 text-xs opacity-75">
                      <div className="font-bold">{getDisplayName(replyMsg.user_id)}</div>
                      <div className="truncate">{replyMsg.content}</div>
                    </div>
                  )}
                  {msg.content}
                  
                  <button 
                    onClick={() => setReplyToMsg(msg)}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                  >
                    <Reply className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border bg-card">
        {replyToMsg && (
          <div className="flex items-center justify-between bg-muted/50 p-2 rounded-t-md text-xs mb-2 border-l-2 border-primary">
            <div className="truncate text-muted-foreground">
              <span className="font-bold text-foreground mr-1">Replying to {getDisplayName(replyToMsg.user_id)}:</span>
              {replyToMsg.content}
            </div>
            <button onClick={() => setReplyToMsg(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3"/></button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            value={inputValue} 
            onChange={e => setInputValue(e.target.value)} 
            placeholder="Type a message..." 
            className="flex-1 bg-background"
          />
          <Button type="submit">Send</Button>
        </form>
      </div>
    </div>
  );
}
