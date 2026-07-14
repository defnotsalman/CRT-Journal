let session = null;
let networkUsers = {}; // Map of user_id -> { profile, stats }
let myTrades = [];
let winlossChart = null;
let pairsChart = null;

async function init() {
  session = await requireAuth();
  if (!session) return;

  // Toggle Logic
  document.getElementById("tab-leaderboard").addEventListener("click", () => showTab("leaderboard"));
  document.getElementById("tab-analytics").addEventListener("click", () => showTab("analytics"));

  await loadNetworkData();
}

function showTab(tab) {
  if (tab === "leaderboard") {
    document.getElementById("section-leaderboard").style.display = "block";
    document.getElementById("section-analytics").style.display = "none";
    document.getElementById("tab-leaderboard").className = "btn btn-primary";
    document.getElementById("tab-analytics").className = "btn btn-ghost";
  } else {
    document.getElementById("section-leaderboard").style.display = "none";
    document.getElementById("section-analytics").style.display = "block";
    document.getElementById("tab-leaderboard").className = "btn btn-ghost";
    document.getElementById("tab-analytics").className = "btn btn-primary";
    renderCharts();
  }
}

async function loadNetworkData() {
  window.setLoading(true);

  // 1. Fetch My Profile
  const { data: myProfile } = await supabaseClient.from("profiles").select("*").eq("id", session.user.id).single();
  networkUsers[myProfile.id] = { profile: myProfile, trades: [] };

  // 2. Fetch Friend Network
  const { data: friends } = await supabaseClient
    .from("friendships")
    .select(`
      requester:profiles!friendships_requester_id_fkey ( id, display_name ),
      receiver:profiles!friendships_receiver_id_fkey ( id, display_name )
    `)
    .eq("status", "accepted")
    .or(`requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);

  const userIds = [session.user.id];
  if (friends) {
    friends.forEach(f => {
      const friend = f.requester.id === session.user.id ? f.receiver : f.requester;
      networkUsers[friend.id] = { profile: friend, trades: [] };
      userIds.push(friend.id);
    });
  }

  // 3. Fetch Trades for Everyone in Network
  // Because of RLS, we can just fetch all trades and it will auto-filter to us + friends!
  const { data: trades, error } = await supabaseClient
    .from("trades")
    .select("*")
    .order("created_at", { ascending: false });

  window.setLoading(false);

  if (error || !trades) {
    window.showToast("Failed to load trades", "error");
    return;
  }

  // Assign trades to users
  trades.forEach(t => {
    if (networkUsers[t.user_id]) {
      networkUsers[t.user_id].trades.push(t);
    }
    if (t.user_id === session.user.id) {
      myTrades.push(t);
    }
  });

  calculateLeaderboards();
  if (document.getElementById("section-analytics").style.display === "block") {
    renderCharts();
  }
}

function calculateLeaderboards() {
  const stats = [];

  Object.values(networkUsers).forEach(userData => {
    const closedTrades = userData.trades.filter(t => t.outcome === "win" || t.outcome === "loss");
    if (closedTrades.length < 3) return; // Minimum trades requirement

    const wins = closedTrades.filter(t => t.outcome === "win").length;
    const winRate = wins / closedTrades.length;

    const rrTrades = closedTrades.filter(t => t.rr_achieved != null);
    let avgRR = 0;
    if (rrTrades.length > 0) {
      const totalRR = rrTrades.reduce((sum, t) => sum + Number(t.rr_achieved), 0);
      avgRR = totalRR / rrTrades.length;
    }

    stats.push({
      profile: userData.profile,
      winRate: winRate,
      avgRR: avgRR,
      tradeCount: closedTrades.length
    });
  });

  // Render Win Rate Leaderboard
  const wrSorted = [...stats].sort((a, b) => b.winRate - a.winRate);
  const wrEl = document.getElementById("lb-winrate");
  if (wrSorted.length === 0) {
    wrEl.innerHTML = `<div style="padding:12px; text-align:center; color:var(--text-muted);">Not enough data yet. Minimum 3 closed trades required.</div>`;
  } else {
    wrEl.innerHTML = wrSorted.map((s, i) => `
      <div class="trade-row" style="cursor:default;">
        <span class="mono" style="color:var(--text-muted); width:30px;">#${i+1}</span>
        <span class="pair" style="flex:1;">${escapeHtml(s.profile.display_name)} ${s.profile.id === session.user.id ? '(You)' : ''}</span>
        <span class="badge win" style="font-size:1rem; padding: 4px 12px;">${Math.round(s.winRate * 100)}%</span>
        <span class="rr" style="color:var(--text-muted); font-size:0.8rem; margin-left:12px;">(${s.tradeCount} trades)</span>
      </div>
    `).join("");
  }

  // Render Avg RR Leaderboard
  const rrSorted = [...stats].sort((a, b) => b.avgRR - a.avgRR);
  const rrEl = document.getElementById("lb-avgrr");
  if (rrSorted.length === 0) {
    rrEl.innerHTML = `<div style="padding:12px; text-align:center; color:var(--text-muted);">Not enough data yet. Minimum 3 closed trades required.</div>`;
  } else {
    rrEl.innerHTML = rrSorted.map((s, i) => `
      <div class="trade-row" style="cursor:default;">
        <span class="mono" style="color:var(--text-muted); width:30px;">#${i+1}</span>
        <span class="pair" style="flex:1;">${escapeHtml(s.profile.display_name)} ${s.profile.id === session.user.id ? '(You)' : ''}</span>
        <span class="rr" style="font-size:1rem; color:var(--primary); font-weight:600;">${s.avgRR.toFixed(2)}R</span>
        <span class="rr" style="color:var(--text-muted); font-size:0.8rem; margin-left:12px;">(${s.tradeCount} trades)</span>
      </div>
    `).join("");
  }
}

function renderCharts() {
  const closedTrades = myTrades.filter(t => t.outcome === "win" || t.outcome === "loss");
  if (closedTrades.length === 0) return;

  const wins = closedTrades.filter(t => t.outcome === "win").length;
  const losses = closedTrades.length - wins;

  // Chart 1: Win / Loss Donut
  const ctxWinLoss = document.getElementById('chart-winloss').getContext('2d');
  if (winlossChart) winlossChart.destroy();
  winlossChart = new Chart(ctxWinLoss, {
    type: 'doughnut',
    data: {
      labels: ['Wins', 'Losses'],
      datasets: [{
        data: [wins, losses],
        backgroundColor: ['#22c55e', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: '#e2e8f0' } } }
    }
  });

  // Chart 2: Performance by Pair
  const pairStats = {};
  closedTrades.forEach(t => {
    const p = (t.pair || "Unknown").toUpperCase();
    if (!pairStats[p]) pairStats[p] = { wins: 0, total: 0 };
    pairStats[p].total++;
    if (t.outcome === "win") pairStats[p].wins++;
  });

  const pairLabels = Object.keys(pairStats).sort((a,b) => pairStats[b].total - pairStats[a].total).slice(0, 5); // top 5
  const pairWinRates = pairLabels.map(p => (pairStats[p].wins / pairStats[p].total) * 100);

  const ctxPairs = document.getElementById('chart-pairs').getContext('2d');
  if (pairsChart) pairsChart.destroy();
  pairsChart = new Chart(ctxPairs, {
    type: 'bar',
    data: {
      labels: pairLabels,
      datasets: [{
        label: 'Win Rate %',
        data: pairWinRates,
        backgroundColor: '#8b5cf6',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
        x: { ticks: { color: '#e2e8f0' }, grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

init();
