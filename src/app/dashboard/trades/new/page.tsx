"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { CHECKLIST_SECTIONS } from "@/lib/constants";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export default function NewTradePage() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    playbook_id: "none",
    pair: "",
    direction: "long",
    session: "london",
    htf_anchor: "h4",
    entry: "",
    stop_loss: "",
    take_profit: "",
    risk_percent: "",
    rr_planned: "",
    rr_achieved: "",
    outcome: "open",
    notes: ""
  });
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [file, setFile] = useState<File | null>(null);

  useGSAP(() => {
    gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05 });
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from("playbooks").select("*").eq("user_id", session.user.id).then(({ data }) => {
      if (data) setPlaybooks(data);
    });
  }, [session]);

  const handleToggle = (id: string) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);

    const numOrNull = (val: string) => val === "" ? null : Number(val);

    const payload = {
      user_id: session.user.id,
      playbook_id: formData.playbook_id === "none" ? null : formData.playbook_id,
      pair: formData.pair,
      direction: formData.direction,
      session: formData.session,
      htf_anchor: formData.htf_anchor,
      entry: numOrNull(formData.entry),
      stop_loss: numOrNull(formData.stop_loss),
      take_profit: numOrNull(formData.take_profit),
      risk_percent: numOrNull(formData.risk_percent),
      rr_planned: numOrNull(formData.rr_planned),
      rr_achieved: numOrNull(formData.rr_achieved),
      outcome: formData.outcome,
      checklist,
      notes: formData.notes
    };

    const { data: trade, error } = await supabase.from("trades").insert(payload).select().single();
    if (error) {
      toast.error(`Trade failed: ${error.message || JSON.stringify(error)}`);
      setLoading(false);
      return;
    }

    if (file) {
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

    toast.success("Trade saved!");
    router.push(`/dashboard/trades/${trade.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8 fade-up">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">New Entry</div>
        <h1 className="text-4xl font-black tracking-tight">Log this trade</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-border bg-card rounded-xl fade-up">
          <div className="space-y-2">
            <Label>Playbook</Label>
            <Select value={formData.playbook_id} onValueChange={v => setFormData({...formData, playbook_id: v || "none"})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {playbooks.map(pb => (
                  <SelectItem key={pb.id} value={pb.id}>{pb.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Pair</Label>
            <Input value={formData.pair} onChange={e => setFormData({...formData, pair: e.target.value})} placeholder="XAUUSD" required />
          </div>
          <div className="space-y-2">
            <Label>Direction</Label>
            <Select value={formData.direction} onValueChange={v => setFormData({...formData, direction: v || ""})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="long">Long</SelectItem>
                <SelectItem value="short">Short</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Session</Label>
            <Select value={formData.session} onValueChange={v => setFormData({...formData, session: v || ""})}>
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
            <Select value={formData.htf_anchor} onValueChange={v => setFormData({...formData, htf_anchor: v || ""})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="h4">H4</SelectItem>
                <SelectItem value="h1">H1</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Entry Price</Label><Input type="number" step="any" value={formData.entry} onChange={e => setFormData({...formData, entry: e.target.value})} /></div>
          <div className="space-y-2"><Label>Stop Loss</Label><Input type="number" step="any" value={formData.stop_loss} onChange={e => setFormData({...formData, stop_loss: e.target.value})} /></div>
          <div className="space-y-2"><Label>Take Profit</Label><Input type="number" step="any" value={formData.take_profit} onChange={e => setFormData({...formData, take_profit: e.target.value})} /></div>
          <div className="space-y-2">
            <Label>Outcome</Label>
            <Select value={formData.outcome} onValueChange={v => setFormData({...formData, outcome: v || ""})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>RR Achieved</Label><Input type="number" step="any" value={formData.rr_achieved} onChange={e => setFormData({...formData, rr_achieved: e.target.value})} placeholder="e.g. 2.5" /></div>
          <div className="space-y-2 md:col-span-2">
            <Label>Screenshot</Label>
            <Input 
              type="file" 
              accept="image/*" 
              onChange={e => setFile(e.target.files ? e.target.files[0] : null)} 
              className="file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 file:cursor-pointer hover:file:bg-primary/90"
            />
            <p className="text-xs text-muted-foreground mt-1">Attach a screenshot of your chart</p>
          </div>
        </div>

        <div className="space-y-6 fade-up">
          <h2 className="text-2xl font-bold">Checklist</h2>
          {CHECKLIST_SECTIONS.map(section => (
            <div key={section.key} className="p-6 border border-border bg-card/50 rounded-xl">
              <h3 className="font-mono text-sm uppercase text-muted-foreground mb-4">{section.title}</h3>
              <div className="space-y-3">
                {section.items.map(item => (
                  <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" className="mt-1 w-4 h-4" checked={!!checklist[item.id]} onChange={() => handleToggle(item.id)} />
                    <span className={`text-sm ${checklist[item.id] ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>{item.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>


        <div className="fade-up">
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Trade"}
          </Button>
        </div>
      </form>
    </div>
  );
}
