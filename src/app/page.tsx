"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Eye, EyeOff } from "lucide-react";

export default function LandingPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  useGSAP(() => {
    gsap.fromTo(".fade-up", 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
    );
  }, [isLogin]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill all fields");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Access Granted.");
        window.location.href = "/dashboard";
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created successfully! Logging you in...");
        window.location.href = "/dashboard";
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md border-primary/20 bg-card shadow-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-4xl font-black text-primary tracking-tighter fade-up">
            GOTHAM JOURNALS
          </CardTitle>
          <CardDescription className="fade-up mt-2 text-muted-foreground uppercase tracking-widest text-xs font-mono">
            Encrypted Trading Terminal
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2 fade-up">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Operative Email</label>
              <Input
                id="email"
                type="email"
                placeholder="bruce@wayne.enterprises"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 border-zinc-800 focus-visible:ring-primary font-mono"
              />
            </div>
            
            <div className="space-y-2 fade-up relative">
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Access Code</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50 border-zinc-800 focus-visible:ring-primary font-mono pr-10"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between fade-up">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-primary border-primary' : 'border-zinc-700 bg-transparent group-hover:border-primary/50'}`}>
                  {rememberMe && <div className="w-2 h-2 bg-black rounded-sm"></div>}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={rememberMe} 
                  onChange={() => setRememberMe(!rememberMe)} 
                />
                <span className="text-xs text-muted-foreground group-hover:text-zinc-300 transition-colors">Keep connection active (14 Days)</span>
              </label>
            </div>

            <Button type="submit" className="w-full font-bold uppercase tracking-wider fade-up transition-all hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]" disabled={loading}>
              {loading ? "Authenticating..." : (isLogin ? "Establish Connection" : "Initialize Account")}
            </Button>
          </form>

          <div className="mt-6 text-center fade-up">
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-xs text-muted-foreground hover:text-primary transition-colors hover:underline"
            >
              {isLogin ? "No access code? Create an account." : "Already an operative? Sign in."}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
