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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash, X } from "lucide-react";

export default function TradeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const { session } = useAuth();
  const [trade, setTrade] = useState<any>(null);
  const [screenshots, setScreenshots] = useState<any[]>([]);
  
  const [editForm, setEditForm] = useState({
    pair: "",
    direction: "",
    session: "",
    htf_anchor: "",
    entry: "",
    stop_loss: "",
    take_profit: "",
    notes: "",
    outcome: "open",
    rr_achieved: ""
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  const loadData = async () => {
    const { data } = await supabase.from("trades").select("*").eq("id", id).single();
    setTrade(data);
    if (data) {
      setEditForm({
        pair: data.pair || "",
        direction: data.direction || "",
        session: data.session || "",
        htf_anchor: data.htf_anchor || "",
        entry: data.entry !== null ? String(data.entry) : "",
        stop_loss: data.stop_loss !== null ? String(data.stop_loss) : "",
        take_profit: data.take_profit !== null ? String(data.take_profit) : "",
        notes: data.notes || "",
        outcome: data.outcome || "open",
        rr_achieved: data.rr_achieved !== null ? String(data.rr_achieved) : ""
      });
    }

    const { data: shots } = await supabase.from("screenshots").select("*").eq("trade_id", id);
    if (shots) {
      const signedUrls = await Promise.all(shots.map(async s => {
        const { data } = await supabase.storage.from("trade-screenshots").createSignedUrl(s.storage_path, 3600);
        return { ...s, signedUrl: data?.signedUrl || "" };
      }));
      setScreenshots(signedUrls);
    }
  };

  useEffect(() => {
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
    const numOrNull = (val: string) => val === "" ? null : Number(val);
    
    const updatePayload = {
      pair: editForm.pair,
      direction: editForm.direction,
      session: editForm.session,
      htf_anchor: editForm.htf_anchor,
      entry: numOrNull(editForm.entry),
      stop_loss: numOrNull(editForm.stop_loss),
      take_profit: numOrNull(editForm.take_profit),
      notes: editForm.notes,
      outcome: editForm.outcome,
      rr_achieved: numOrNull(editForm.rr_achieved)
    };

    const { error } = await supabase.from("trades").update(updatePayload).eq("id", id);
    
    if (error) {
      toast.error("Failed to update trade");
      setUpdating(false);
      return;
    }

    if (file && session) {
      const ext = file.name.split('.').pop();
      const fileName = `${session.user.id}/${trade.id}/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trade-screenshots')
        .upload(fileName, file);

      if (uploadData) {
        await supabase.from('screenshots').insert({
          trade_id: trade.id,
          storage_path: uploadData.path
        });
      } else if (uploadError) {
        toast.error(`Screenshot upload failed: ${uploadError.message}`);
      }
    }

    toast.success("Trade updated!");
    setFile(null);
    setUpdating(false);
    loadData(); // Refresh UI
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this trade?")) return;
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete trade");
    } else {
      toast.success("Trade deleted");
      router.push("/dashboard");
    }
  };

  const handleDeleteScreenshot = async (shotId: string) => {
    if (!window.confirm("Delete this screenshot?")) return;
    const { error } = await supabase.from("screenshots").delete().eq("id", shotId);
    if (!error) {
      toast.success("Screenshot deleted");
      loadData();
    }
  };

  const isWin = trade.outcome === 'win';
  const isLoss = trade.outcome === 'loss';
  const isOwner = session?.user?.id === trade.user_id;

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

      {!isOwner ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fade-up">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase font-mono">Direction</div><div className="font-bold text-lg">{trade.direction?.toUpperCase() || '—'}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase font-mono">Entry</div><div className="font-bold text-lg">{trade.entry || '—'}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase font-mono">Session</div><div className="font-bold text-lg">{trade.session || '—'}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase font-mono">RR Achieved</div><div className="font-bold text-lg text-primary">{trade.rr_achieved ? trade.rr_achieved + 'R' : '—'}</div></CardContent></Card>
        </div>
      ) : (
        <Card className="fade-up border-primary/50 bg-primary/5 relative">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDelete}
            className="absolute top-4 right-4 text-destructive hover:bg-destructive/10"
          >
            <Trash className="w-4 h-4 mr-2" /> Delete Trade
          </Button>
          <CardHeader>
            <CardTitle className="text-lg">Edit Trade Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Pair</Label>
                <Input value={editForm.pair} onChange={e => setEditForm({...editForm, pair: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={editForm.direction} onValueChange={v => setEditForm({...editForm, direction: v || ""})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session</Label>
                <Select value={editForm.session} onValueChange={v => setEditForm({...editForm, session: v || ""})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asian">Asian</SelectItem>
                    <SelectItem value="london">London</SelectItem>
                    <SelectItem value="ny">New York</SelectItem>
                    <SelectItem value="overlap">London/NY overlap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>HTF Anchor</Label>
                <Input value={editForm.htf_anchor} onChange={e => setEditForm({...editForm, htf_anchor: e.target.value})} placeholder="e.g. Daily, H4" />
              </div>
              <div className="space-y-2">
                <Label>Entry Price</Label>
                <Input type="number" step="any" value={editForm.entry} onChange={e => setEditForm({...editForm, entry: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Stop Loss</Label>
                <Input type="number" step="any" value={editForm.stop_loss} onChange={e => setEditForm({...editForm, stop_loss: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Take Profit</Label>
                <Input type="number" step="any" value={editForm.take_profit} onChange={e => setEditForm({...editForm, take_profit: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Outcome</Label>
                <Select value={editForm.outcome} onValueChange={(v) => setEditForm({...editForm, outcome: v || ""})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="win">Win</SelectItem>
                    <SelectItem value="loss">Loss</SelectItem>
                    <SelectItem value="breakeven">Breakeven</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>RR Achieved</Label>
                <Input type="number" step="any" value={editForm.rr_achieved} onChange={e => setEditForm({...editForm, rr_achieved: e.target.value})} placeholder="e.g. 2.5" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea 
                className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={editForm.notes} 
                onChange={e => setEditForm({...editForm, notes: e.target.value})} 
                placeholder="Any reflections..." 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Add New Screenshot</Label>
              <Input 
                type="file" 
                accept="image/*" 
                onChange={e => setFile(e.target.files ? e.target.files[0] : null)} 
                className="file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 file:cursor-pointer hover:file:bg-primary/90"
              />
            </div>

            <Button onClick={handleUpdate} disabled={updating} className="w-full">
              {updating ? "Saving Changes..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      )}

      {screenshots.length > 0 && (
        <div className="fade-up space-y-4">
          <h2 className="text-2xl font-bold">Screenshots</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {screenshots.map(s => (
              <div key={s.id} className="relative group">
                {isOwner && (
                  <button 
                    onClick={() => handleDeleteScreenshot(s.id)}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-destructive text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Delete Screenshot"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <a href={s.signedUrl} target="_blank" rel="noreferrer">
                  <img src={s.signedUrl} alt="screenshot" className="w-full rounded-xl border border-border hover:border-primary transition-colors" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fade-up space-y-4">
        <h2 className="text-2xl font-bold">Checklist / Rules</h2>
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
            {!trade.checklist || Object.keys(trade.checklist).length === 0 && (
              <div className="text-muted-foreground text-sm">No rules were checked for this trade.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {!isOwner && trade.notes && (
        <div className="fade-up space-y-4">
          <h2 className="text-2xl font-bold">Notes</h2>
          <Card><CardContent className="p-6 whitespace-pre-wrap">{trade.notes}</CardContent></Card>
        </div>
      )}
    </div>
  );
}
