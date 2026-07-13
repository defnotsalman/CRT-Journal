let ALL_TRADES = [];

async function init() {
  const session = await getSession();

  if (!session) {
    document.getElementById("login-shell").style.display = "flex";
    document.getElementById("app").style.display = "none";
    wireLogin();
    return;
  }

  document.getElementById("login-shell").style.display = "none";
  document.getElementById("app").style.display = "block";

  document.getElementById("logout-btn").addEventListener("click", signOut);

  await loadTrades();
  await loadEducation();

  document.getElementById("filter-outcome").addEventListener("change", renderTrades);
  document.getElementById("filter-pair").addEventListener("input", renderTrades);
}

function wireLogin() {
  document.getElementById("send-link").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    if (!email) { 
      window.showToast("Enter an email first.", "error"); 
      return; 
    }
    
    document.getElementById("send-link").textContent = "Sending...";
    document.getElementById("send-link").disabled = true;
    
    try {
      await sendMagicLink(email);
      window.showToast("Check your inbox for the sign-in link.", "success");
      document.getElementById("send-link").textContent = "Sent!";
    } catch (e) {
      window.showToast("Error: " + e.message, "error");
      document.getElementById("send-link").textContent = "Send magic link";
      document.getElementById("send-link").disabled = false;
    }
  });
}

async function loadTrades() {
  window.setLoading(true);
  const { data, error } = await supabaseClient
    .from("trades")
    .select("*")
    .order("created_at", { ascending: false });

  window.setLoading(false);

  if (error) {
    document.getElementById("trade-list").innerHTML =
      `<div class="empty-state">Error loading trades: ${error.message}</div>`;
    window.showToast("Error loading trades", "error");
    return;
  }

  ALL_TRADES = data || [];
  renderStats();
  renderTrades();
}

function renderStats() {
  const total = ALL_TRADES.length;
  const closed = ALL_TRADES.filter(t => t.outcome === "win" || t.outcome === "loss");
  const wins = ALL_TRADES.filter(t => t.outcome === "win").length;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) + "%" : "—";

  const rrValues = ALL_TRADES.filter(t => t.rr_achieved != null).map(t => Number(t.rr_achieved));
  const avgRR = rrValues.length ? (rrValues.reduce((a, b) => a + b, 0) / rrValues.length).toFixed(2) : "—";

  let complianceSum = 0, complianceCount = 0;
  ALL_TRADES.forEach(t => {
    const c = t.checklist || {};
    const values = Object.values(c);
    if (values.length) {
      complianceSum += values.filter(Boolean).length / values.length;
      complianceCount++;
    }
  });
  const compliance = complianceCount ? Math.round((complianceSum / complianceCount) * 100) + "%" : "—";

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-winrate").textContent = winRate;
  document.getElementById("stat-avgrr").textContent = avgRR;
  document.getElementById("stat-compliance").textContent = compliance;
}

function renderTrades() {
  const outcomeFilter = document.getElementById("filter-outcome").value;
  const pairFilter = document.getElementById("filter-pair").value.trim().toLowerCase();

  const filtered = ALL_TRADES.filter(t => {
    if (outcomeFilter && t.outcome !== outcomeFilter) return false;
    if (pairFilter && !(t.pair || "").toLowerCase().includes(pairFilter)) return false;
    return true;
  });

  const list = document.getElementById("trade-list");
  const empty = document.getElementById("empty-state");

  if (!filtered.length) {
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  list.innerHTML = filtered.map(t => {
    const date = new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const rr = t.rr_achieved != null ? `${t.rr_achieved}R` : (t.rr_planned != null ? `${t.rr_planned}R plan` : "—");
    return `
      <a class="trade-row" href="trade.html?id=${t.id}">
        <span class="date mono">${date}</span>
        <span class="pair">${escapeHtml(t.pair || "—")}</span>
        <span class="dir">${escapeHtml((t.direction || "").toUpperCase())}</span>
        <span class="badge ${t.outcome || "open"}">${escapeHtml(t.outcome || "open")}</span>
        <span class="rr">${rr}</span>
        <span class="arrow">→</span>
      </a>`;
  }).join("");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

async function loadEducation() {
  const { data, error } = await supabaseClient
    .from("education_posts")
    .select("*")
    .order("created_at", { ascending: false });

  const grid = document.getElementById("education-grid");
  const empty = document.getElementById("edu-empty-state");

  if (error || !data || data.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  grid.innerHTML = data.map(post => {
    const date = new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const user = post.user_email ? escapeHtml(post.user_email.split("@")[0]) : "Unknown";
    
    // Add delete button if the user owns the post
    // Note: In a real app we'd check auth.uid(), but Supabase RLS handles actual security.
    // For UI simplicity, we can show the delete button if they want, but here we'll just show the post.
    
    return `
      <div class="edu-card">
        <div class="edu-meta">${user} • ${date}</div>
        <h3 class="edu-title">${escapeHtml(post.title)}</h3>
        <div class="edu-content">${escapeHtml(post.content || "")}</div>
        ${post.link_url ? `<a href="${escapeHtml(post.link_url)}" target="_blank" class="edu-link">View resource →</a>` : ""}
      </div>
    `;
  }).join("");
}

init();
