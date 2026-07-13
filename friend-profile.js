let sessionUser = null;
let friendId = null;

function getFriendIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function init() {
  const session = await requireAuth();
  if (!session) return;
  sessionUser = session.user;

  friendId = getFriendIdFromUrl();
  if (!friendId) {
    document.getElementById("friend-name").textContent = "No user specified.";
    return;
  }

  window.setLoading(true);
  
  // 1. Fetch friend profile
  const { data: profile, error: profileErr } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", friendId)
    .single();

  if (profileErr || !profile) {
    window.setLoading(false);
    document.getElementById("friend-name").textContent = "Profile not found or access denied.";
    return;
  }

  // Calculate online status
  const lastSeenDate = new Date(profile.last_seen);
  const diffMins = Math.floor((new Date() - lastSeenDate) / 60000);
  const isOnline = diffMins < 5;
  document.getElementById("friend-status").textContent = isOnline ? "🟢 Online now" : `Last seen ${diffMins}m ago`;
  document.getElementById("friend-name").textContent = profile.display_name + "'s Journal";

  // 2. Fetch friend trades
  const { data: trades, error: tradesErr } = await supabaseClient
    .from("trades")
    .select("*")
    .eq("user_id", friendId)
    .order("created_at", { ascending: false });

  window.setLoading(false);

  if (tradesErr || !trades || trades.length === 0) {
    document.getElementById("empty-state").style.display = "block";
    return;
  }

  renderStats(trades);
  renderTrades(trades);
}

function renderStats(trades) {
  const closed = trades.filter(t => t.outcome === "win" || t.outcome === "loss");
  const wins = closed.filter(t => t.outcome === "win").length;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0;
  
  const rrs = closed.map(t => parseFloat(t.rr_achieved)).filter(v => !isNaN(v));
  const avgRR = rrs.length ? (rrs.reduce((a, b) => a + b, 0) / rrs.length).toFixed(2) : 0;

  document.getElementById("stat-total").textContent = trades.length;
  document.getElementById("stat-winrate").textContent = winRate + "%";
  document.getElementById("stat-avgrr").textContent = avgRR + "R";
}

function renderTrades(trades) {
  const list = document.getElementById("trade-list");
  
  list.innerHTML = trades.map(t => {
    const d = new Date(t.created_at);
    const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const pair = (t.pair || "Unknown").toUpperCase();
    const dir = (t.direction || "").toUpperCase();
    const outcome = t.outcome || "open";
    const rr = t.rr_achieved ? `+${t.rr_achieved}R` : "—";
    
    return `
      <li class="trade-item" onclick="window.location.href='trade.html?id=${t.id}'" style="cursor:pointer;">
        <div class="trade-main">
          <span class="badge ${outcome}">${outcome}</span>
          <span class="pair">${pair} ${dir}</span>
        </div>
        <div class="trade-meta mono">
          <span>${dateStr}</span>
          <span style="color:var(--text); margin-left:12px;">${rr}</span>
        </div>
      </li>
    `;
  }).join("");
}

init();
