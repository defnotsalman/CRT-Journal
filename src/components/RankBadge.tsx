import { calculateRank } from "@/lib/ranks";

export function RankBadge({ rankTitle, className = "" }: { rankTitle?: string, className?: string }) {
  const getRankStyle = (title: string) => {
    switch (title) {
      case "Dark Knight": return "bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.5)]";
      case "Detective": return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
      case "Vigilante": return "bg-green-500/10 text-green-500 border border-green-500/20";
      default: return "bg-muted text-muted-foreground border border-border";
    }
  };

  const style = getRankStyle(rankTitle || "Street Thug");

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${style} ${className}`}>
      {rankTitle || "Street Thug"}
    </span>
  );
}
