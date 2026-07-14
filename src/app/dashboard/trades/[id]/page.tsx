"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { CHECKLIST_SECTIONS } from "@/lib/constants";
import { format } from "date-fns";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function TradeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const { session } = useAuth();
  const [trade, setTrade] = useState<any>(null);
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [editOutcome, setEditOutcome] = useState("");
  const [editRR, setEditRR] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.from("trades").select("*").eq("id", id).single();
      setTrade(data);
      if (data) {
        setEditOutcome(data.outcome);
        setEditRR(data.rr_achieved ? String(data.rr_achieved) : "");
      }

      const { data: shots } = await supabase.from("screenshots").select("*").eq("trade_id", id);
      if (shots) {
        const signedUrls = await Promise.all(shots.map(async s => {
          const { data } = await supabase.storage.from("trade-screenshots").createSignedUrl(s.storage_path, 3600);
          return { ...s, signedUrl: data?.signedUrl || "" };
        }));
        setScreenshots(signedUrls);
      }
    }
    loadData();
  }, [id]);

  useGSAP(() => {
    if (trade) {
      gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 });
    }
  }, [trade]);

  if (!trade) return <div className="p-12 text-center text-muted-foreground">Loading trade...</div>;

  const handleUpdate = async () => {
    setUpdating(true);
    const rr = editRR === "" ? null : Number(editRR);
    const { error } = await supabase.from("trades").update({ outcome: editOutcome, rr_achieved: rr }).eq("id", id);
    if (error) {
      toast.error("Failed to update trade");
    } else {
      toast.success("Trade updated!");
      setTrade({ ...trade, outcome: editOutcome, rr_achieved: rr });
    }
    setUpdating(false);
  };

  const isWin = trade.outcome === 'win';
  const isLoss = trade.outcome === 'loss';

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8">
      <div className="fade-up">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">{format(new Date(trade.created_at), "PPP")}</div>
            <h1 className="text-4xl font-black tracking-tight">{trade.pair}</h1>
          </div>
          <div className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider ${isWin ? 'bg-green-500/20 text-green-500' : isLoss ? 'bg-red-500/20 text-red-500' : 'bg-muted'}`}>
            {trade.outcome}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fade-up">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase font-mono">Direction</div><div className="font-bold text-lg">{trade.direction?.toUpperCase() || '—'}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase font-mono">Entry</div><div className="font-bold text-lg">{trade.entry || '—'}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase font-mono">Session</div><div className="font-bold text-lg">{trade.session || '—'}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase font-mono">RR Achieved</div><div className="font-bold text-lg text-primary">{trade.rr_achieved ? trade.rr_achieved + 'R' : '—'}</div></CardContent></Card>
      </div>

      {trade.outcome === 'open' && session?.user?.id === trade.user_id && (
        <Card className="fade-up border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Update Open Trade</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-xs uppercase text-muted-foreground">Outcome</label>
              <Select value={editOutcome} onValueChange={setEditOutcome}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="win">Win</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="breakeven">Breakeven</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-xs uppercase text-muted-foreground">RR Achieved</label>
              <Input type="number" step="any" value={editRR} onChange={e => setEditRR(e.target.value)} placeholder="e.g. 2.5" />
            </div>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? "Updating..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      )}

      {screenshots.length > 0 && (
        <div className="fade-up space-y-4">
          <h2 className="text-2xl font-bold">Screenshots</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {screenshots.map(s => (
              <a key={s.id} href={s.signedUrl} target="_blank" rel="noreferrer">
                <img src={s.signedUrl} alt="screenshot" className="w-full rounded-xl border border-border hover:border-primary transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="fade-up space-y-4">
        <h2 className="text-2xl font-bold">Checklist</h2>
        <Card className="bg-card/50">
          <CardContent className="p-6 space-y-6">
            {CHECKLIST_SECTIONS.map(sec => {
              const items = sec.items.filter(i => trade.checklist && trade.checklist[i.id]);
              if (items.length === 0) return null;
              return (
                <div key={sec.key}>
                  <h3 className="font-mono text-sm text-muted-foreground mb-2 uppercase">{sec.title}</h3>
                  <ul className="space-y-2">
                    {items.map(i => (
                      <li key={i.id} className="flex gap-2 text-sm">
                        <span className="text-primary">✓</span> {i.text}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {trade.notes && (
        <div className="fade-up space-y-4">
          <h2 className="text-2xl font-bold">Notes</h2>
          <Card><CardContent className="p-6 whitespace-pre-wrap">{trade.notes}</CardContent></Card>
        </div>
      )}
    </div>
  );
}
