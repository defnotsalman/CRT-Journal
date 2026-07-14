"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { CHECKLIST_SECTIONS } from "@/lib/constants";
import { format } from "date-fns";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TradeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const { session } = useAuth();
  const [trade, setTrade] = useState<any>(null);
  const [screenshots, setScreenshots] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.from("trades").select("*").eq("id", id).single();
      setTrade(data);

      const { data: shots } = await supabase.from("screenshots").select("*").eq("trade_id", id);
      if (shots) {
        const signedUrls = await Promise.all(shots.map(async s => {
          const { data: { signedUrl } } = await supabase.storage.from("trade-screenshots").createSignedUrl(s.storage_path, 3600);
          return { ...s, signedUrl };
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
