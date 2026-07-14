"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export default function NewEducationPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", url: "", image_url: "" });

  useGSAP(() => {
    gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);

    const payload = {
      user_id: session.user.id,
      title: formData.title.trim(),
      description: formData.description.trim(),
      url: formData.url.trim(),
      image_url: formData.image_url.trim() || null
    };

    const { error } = await supabase.from("education_resources").insert(payload);
    
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Resource shared successfully!");
      router.push("/dashboard");
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-12 space-y-8">
      <div className="fade-up">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Community Board</div>
        <h1 className="text-4xl font-black tracking-tight">Share a resource</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 border border-border bg-card p-6 rounded-xl fade-up">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required placeholder="e.g. ICT Mentorship 2022" />
        </div>
        
        <div className="space-y-2">
          <Label>Description</Label>
          <textarea 
            className="w-full flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.description} 
            onChange={e => setFormData({...formData, description: e.target.value})} 
            required 
            placeholder="Why is this helpful?" 
          />
        </div>

        <div className="space-y-2">
          <Label>Link URL</Label>
          <Input type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required placeholder="https://youtube.com/..." />
        </div>

        <div className="space-y-2">
          <Label>Image URL (Optional)</Label>
          <Input type="url" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="https://..." />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sharing..." : "Share Resource"}
        </Button>
      </form>
    </div>
  );
}
