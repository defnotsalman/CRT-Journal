"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export default function NewOracleSignalPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    pair: "",
    direction: "long",
    entry_price: "",
    target_price: "",
    stop_loss: "",
    notes: ""
  });

  useGSAP(() => {
    gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!formData.pair) return toast.error("Pair is required");

    setLoading(true);
    const { error } = await supabase.from("oracle_signals").insert({
      user_id: session.user.id,
      ...formData,
      pair: formData.pair.toUpperCase()
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Signal broadcasted to Oracle Network");
      router.push("/dashboard/oracle");
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-12 space-y-8 fade-up">
      <div>
        <div className="text-xs font-mono text-cyan-500 uppercase tracking-widest mb-2">Initialize Broadcast</div>
        <h1 className="text-4xl font-black tracking-tight">New Signal</h1>
      </div>

      <Card className="border-border bg-card/50 shadow-2xl shadow-cyan-500/5">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Pair / Ticker *</label>
                <Input 
                  placeholder="e.g. BTCUSD" 
                  value={formData.pair} 
                  onChange={e => setFormData({...formData, pair: e.target.value})} 
                  className="font-mono uppercase"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Direction *</label>
                <Select value={formData.direction} onValueChange={(v) => setFormData({...formData, direction: v || "long"})}>
                  <SelectTrigger className="font-bold uppercase tracking-wider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long" className="text-green-500 font-bold">LONG</SelectItem>
                    <SelectItem value="short" className="text-red-500 font-bold">SHORT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Entry Price</label>
                <Input 
                  placeholder="Market or limit..." 
                  value={formData.entry_price} 
                  onChange={e => setFormData({...formData, entry_price: e.target.value})} 
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Target (TP)</label>
                <Input 
                  placeholder="Take profit..." 
                  value={formData.target_price} 
                  onChange={e => setFormData({...formData, target_price: e.target.value})} 
                  className="font-mono text-green-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Stop Loss</label>
                <Input 
                  placeholder="Stop loss..." 
                  value={formData.stop_loss} 
                  onChange={e => setFormData({...formData, stop_loss: e.target.value})} 
                  className="font-mono text-red-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Analysis / Notes</label>
              <textarea 
                placeholder="Why are you taking this trade? What is the thesis?" 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            <div className="pt-4 flex gap-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-bold">
                {loading ? "Broadcasting..." : "Broadcast Signal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
