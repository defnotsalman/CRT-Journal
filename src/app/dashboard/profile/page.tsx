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

export default function ProfilePage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [activeBadge, setActiveBadge] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!session) return;
    async function load() {
      const { data } = await supabase.from("profiles").select("*").eq("id", session!.user.id).single();
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
        setStatus(data.status || "");
        setAvatarUrl(data.avatar_url || "");
        setActiveBadge(data.active_badge || "");
      }
    }
    load();
  }, [session]);

  useGSAP(() => {
    gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      status: status,
      active_badge: activeBadge,
      avatar_url: avatarUrl
    }).eq("id", session!.user.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated!");
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const path = `${session!.user.id}/${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", session!.user.id);
    if (updateError) {
      toast.error("Failed to link avatar to profile");
    } else {
      toast.success("Avatar updated!");
    }
    setUploading(false);
  };

  if (!profile) return <div className="p-12 text-center text-muted-foreground">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto pb-12 space-y-8">
      <div className="fade-up">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Batcomputer Settings</div>
        <h1 className="text-4xl font-black tracking-tight">Your Identity</h1>
      </div>

      <Card className="fade-up border border-border bg-card">
        <CardHeader>
          <CardTitle>Profile Customization</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 rounded-full border border-border overflow-hidden bg-muted">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">?</div>
                )}
              </div>
              <div className="space-y-2 flex-1">
                <Label>Upload Avatar</Label>
                <Input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                {uploading && <p className="text-xs text-primary animate-pulse">Uploading...</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Bruce Wayne" />
            </div>

            <div className="space-y-2">
              <Label>Current Status</Label>
              <Input value={status} onChange={e => setStatus(e.target.value)} placeholder="e.g. Stalking the markets..." />
              <p className="text-xs text-muted-foreground">This will be visible on your profile and leaderboards.</p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Save Changes"}</Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="fade-up">
         <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Your Badges</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.badges && profile.badges.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Select a badge to display on your public profile next to your name:</p>
                <div className="flex flex-wrap gap-2">
                  <div 
                    onClick={() => setActiveBadge("")}
                    className={`cursor-pointer px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                      activeBadge === "" ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    No Badge
                  </div>
                  {profile.badges.map((b: any, i: number) => (
                    <div 
                      key={i} 
                      onClick={() => setActiveBadge(b.name)}
                      className={`cursor-pointer px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                        activeBadge === b.name ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:border-primary/50'
                      }`}
                    >
                      {b.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">You haven't earned any Riddler Badges yet. Complete weekly challenges to unlock them.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
