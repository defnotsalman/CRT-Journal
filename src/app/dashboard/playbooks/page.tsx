"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash } from "lucide-react";

export default function PlaybooksPage() {
  const { session } = useAuth();
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!session) return;
    loadPlaybooks();
  }, [session]);

  async function loadPlaybooks() {
    const { data } = await supabase.from("playbooks").select("*").eq("user_id", session!.user.id).order("created_at", { ascending: false });
    if (data) setPlaybooks(data);
  }

  useGSAP(() => {
    gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const { error } = await supabase.from("playbooks").insert({
      user_id: session!.user.id,
      name: name.trim(),
      description: description.trim()
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Playbook created!");
      setName("");
      setDescription("");
      loadPlaybooks();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("playbooks").delete().eq("id", id);
    if (error) toast.error("Failed to delete playbook");
    else loadPlaybooks();
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8">
      <div className="fade-up">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Tactical Database</div>
        <h1 className="text-4xl font-black tracking-tight">Playbooks</h1>
        <p className="text-muted-foreground mt-2">Define your specific trading edges and strategies here. Tag your trades with them to see what works.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4 fade-up">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>New Playbook</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Gotham Breakout" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea 
                    className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Criteria for this setup..." 
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">{loading ? "Adding..." : "Add Playbook"}</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          {playbooks.length === 0 ? (
            <div className="p-12 border border-dashed border-border rounded-xl text-center text-muted-foreground fade-up">
              No playbooks defined yet.
            </div>
          ) : (
            playbooks.map(pb => (
              <Card key={pb.id} className="fade-up border-border bg-card hover:border-primary/50 transition-colors group relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-primary mb-2">{pb.name}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pb.description}</p>
                    </div>
                    <button onClick={() => handleDelete(pb.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
