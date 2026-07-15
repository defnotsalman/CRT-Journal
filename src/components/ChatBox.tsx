"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScrollArea } from "./ui/scroll-area";
import { X, Reply, Trash } from "lucide-react";
import { RankBadge } from "./RankBadge";

export function ChatBox({ networkUsers }: { networkUsers: Record<string, any> }) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [replyToMsg, setReplyToMsg] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);

  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    const match = val.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1].toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (displayName: string) => {
    const val = inputValue.replace(/@\w*$/, `@${displayName} `);
    setInputValue(val);
    setShowMentions(false);
  };

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
    setShowMentions(false);

    const { error } = await supabase.from("messages").insert(payload);
    if (error) {
      toast.error(`Failed to send: ${error.message}`);
    }
  };

  const getDisplayName = (id: string) => {
    if (id === session?.user.id) return "You";
    return networkUsers[id]?.display_name || "Unknown";
  };
  
  const handleDeleteSingle = async (msgId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", msgId);
    if (error) toast.error("Failed to delete message");
  };

  const handleClearChat = async () => {
    const pwd = window.prompt("Enter password to wipe chat:");
    if (pwd === "defnotsam") {
      const { error } = await supabase.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) toast.error("Failed to clear chat");
      else toast.success("Chat wiped");
    } else if (pwd !== null) {
      toast.error("Incorrect password.");
    }
  };
  
  // Custom mention rendering
  const renderContentWithMentions = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="text-primary font-bold bg-primary/10 px-1 rounded inline-flex items-center gap-1 border border-primary/20 bubble-nav-item !py-0.5 !text-xs !bg-secondary/50 !scale-100 shadow-[0_0_8px_rgba(246,224,94,0.1)]">
            <span className="animate-pulse">🦇</span>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const filteredNetwork = Object.values(networkUsers).filter((u: any) => 
    u.display_name?.toLowerCase().includes(mentionQuery)
  );

  return (
    <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden h-[600px] relative">
      <div className="p-3 border-b border-border flex justify-between items-center bg-muted/20">
        <h3 className="font-bold flex items-center gap-2">Live Chat 💬</h3>
        <Button variant="ghost" size="sm" onClick={handleClearChat} className="text-xs text-destructive hover:bg-destructive/10">Clear Chat</Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 min-h-0" ref={scrollRef}>
        <div className="flex flex-col gap-3">
          {messages.map(msg => {
            const isMe = msg.user_id === session?.user.id;
            const replyMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;
            
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-2`}
                onMouseLeave={() => setContextMenuId(null)}
              >
                <div className="flex items-center gap-2 mb-1 ml-1">
                  <span className="text-[10px] text-muted-foreground">{getDisplayName(msg.user_id)}</span>
                  {!isMe && <RankBadge rankTitle={networkUsers[msg.user_id]?.rank} className="scale-75 origin-left" />}
                  <span className="text-[10px] text-muted-foreground">• {format(new Date(msg.created_at), "h:mm a")}</span>
                </div>
                
                <div 
                  onContextMenu={(e) => { e.preventDefault(); setContextMenuId(msg.id); }}
                  className={`relative max-w-[90%] md:max-w-[80%] rounded-2xl px-4 py-2 text-sm cursor-context-menu transition-all ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'} ${contextMenuId === msg.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                >
                  {replyMsg && (
                    <div className="mb-2 pl-2 border-l-2 border-background/50 text-xs opacity-75">
                      <div className="font-bold">{getDisplayName(replyMsg.user_id)}</div>
                      <div className="truncate">{replyMsg.content}</div>
                    </div>
                  )}
                  {renderContentWithMentions(msg.content)}
                  
                  {contextMenuId === msg.id && (
                    <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${isMe ? 'border-primary-foreground/20 justify-end' : 'border-border justify-start'}`}>
                      {!isMe && (
                        <button 
                          onClick={() => { setReplyToMsg(msg); setContextMenuId(null); }}
                          className="flex items-center gap-1 text-xs font-bold hover:opacity-70 transition-opacity"
                        >
                          <Reply className="w-3 h-3" /> Reply
                        </button>
                      )}
                      {isMe && (
                        <button 
                          onClick={() => { handleDeleteSingle(msg.id); setContextMenuId(null); }}
                          className="flex items-center gap-1 text-xs font-bold hover:opacity-70 transition-opacity text-destructive"
                        >
                          <Trash className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3 border-t border-border bg-card relative shrink-0">
        {showMentions && filteredNetwork.length > 0 && (
          <div className="absolute bottom-full mb-2 left-3 bg-card border border-border rounded-lg shadow-lg z-10 w-48 overflow-hidden">
            {filteredNetwork.map((u: any) => (
              <div 
                key={u.id} 
                className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                onClick={() => handleMentionSelect(u.display_name)}
              >
                @{u.display_name}
              </div>
            ))}
          </div>
        )}
      
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
            onChange={handleInputChange} 
            placeholder="Type a message... (@ to mention)" 
            className="flex-1 bg-background"
          />
          <Button type="submit">Send</Button>
        </form>
      </div>
    </div>
  );
}
