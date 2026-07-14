"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Trash } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useState } from "react";

export function EducationHub({ posts: initialPosts, currentUserId }: { posts: any[], currentUserId?: string }) {
  const [posts, setPosts] = useState(initialPosts);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // prevent link navigation
    const { error } = await supabase.from("education_resources").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete resource");
    } else {
      toast.success("Resource deleted");
      setPosts(prev => prev.filter(p => p.id !== id));
    }
  };
  if (posts.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-lg mt-4">
        No educational resources shared yet. Be the first!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
      {posts.map(post => (
        <a key={post.id} href={post.url} target="_blank" rel="noopener noreferrer" className="block no-underline group">
          <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all h-full flex flex-col">
            <div className="h-40 bg-muted overflow-hidden relative border-b border-border">
              {post.image_url ? (
                <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary/50 text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{post.description}</p>
              <div className="mt-auto pt-4 flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">By {post.profiles?.display_name || "Unknown"}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{format(new Date(post.created_at), "MMM d")}</span>
                  {currentUserId === post.user_id && (
                    <button onClick={(e) => handleDelete(e, post.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors">
                      <Trash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
