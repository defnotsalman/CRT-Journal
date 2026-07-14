let ALL_TRADES = [];

async function init() {
  const session = await getSession();

  if (!session) {
    document.getElementById("login-shell").style.display = "flex";
    document.getElementById("app").style.display = "none";
    wireLogin();
    return;
  }

  // Start presence pinging since dashboard doesn't use requireAuth()
  setInterval(async () => {
    await supabaseClient.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", session.user.id);
  }, 60000);
  supabaseClient.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", session.user.id);

  document.getElementById("login-shell").style.display = "none";
  document.getElementById("app").style.display = "block";

  document.getElementById("logout-btn").addEventListener("click", signOut);

  await loadTrades();
  await loadEducation(session.user.id);
  await loadChat(session.user.id);

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

  // Calculate Rule-Based Streak
  let currentStreak = 0;
  let lastTradeDate = null;
  const ascendingTrades = [...ALL_TRADES].reverse();

  for (const t of ascendingTrades) {
    const d = new Date(t.created_at);
    const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const c = t.checklist || {};
    const values = Object.values(c);
    
    // A rule is broken if any checklist item is unchecked (false)
    // We only check trades that actually have a checklist
    const hasFalse = values.includes(false);
    
    if (hasFalse) {
      currentStreak = 0;
    } else if (values.length > 0) {
      // Only increment if we haven't incremented today
      if (dateStr !== lastTradeDate) {
        currentStreak++;
        lastTradeDate = dateStr;
      }
    }
  }

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-winrate").textContent = winRate;
  document.getElementById("stat-avgrr").textContent = avgRR;
  
  const streakEl = document.getElementById("stat-streak");
  if (streakEl) streakEl.textContent = currentStreak;
}

// ============ EPHEMERAL CHAT ============
let myProfile = null;
let realtimeChannel = null;

async function loadFriendsNetwork(userId) {
  const { data: profile } = await supabaseClient.from("profiles").select("*").eq("id", userId).single();
  myProfile = profile;

  const { data: friends } = await supabaseClient
    .from("friendships")
    .select(`
      requester:profiles!friendships_requester_id_fkey ( id, display_name, last_seen ),
      receiver:profiles!friendships_receiver_id_fkey ( id, display_name, last_seen )
    `)
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

  const statusEl = document.getElementById("chat-status");
  if (!statusEl) return;

  if (!friends || friends.length === 0) {
    statusEl.innerHTML = "Add friends to chat!";
    return;
  }

  let onlineCount = 0;
  const friendNames = friends.map(f => {
    const friend = f.requester.id === userId ? f.receiver : f.requester;
    const isOnline = Math.floor((new Date() - new Date(friend.last_seen)) / 60000) < 5;
    if (isOnline) onlineCount++;
    return `${isOnline ? '🟢' : '⚪'} ${escapeHtml(friend.display_name)}`;
  });

  statusEl.innerHTML = `Sharing with ${friends.length} friend(s) (${onlineCount} online): ${friendNames.join(", ")}`;
}

async function loadChat(userId) {
  const msgContainer = document.getElementById("chat-messages");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  if (!msgContainer || !form) return;

  await loadFriendsNetwork(userId);

  // Load existing messages (<12 hours)
  const { data: messages } = await supabaseClient
    .from("messages")
    .select("*, profiles(display_name)")
    .order("created_at", { ascending: true });

  if (messages) {
    messages.forEach(m => renderMessage(m, userId));
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  // Subscribe to new and deleted messages
  realtimeChannel = supabaseClient.channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      // Fetch profile to get display name
      supabaseClient.from("profiles").select("display_name").eq("id", payload.new.user_id).single().then(({data}) => {
        const msg = { ...payload.new, profiles: data };
        renderMessage(msg, userId);
        msgContainer.scrollTop = msgContainer.scrollHeight;
      });
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
      const el = document.getElementById(`msg-${payload.old.id}`);
      if (el) el.remove();
    })
    .subscribe();

  // Handle send
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!myProfile) return window.showToast("Setup your profile in Friends tab first to chat!", "error");
    
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    
    const { error } = await supabaseClient.from("messages").insert({ user_id: myProfile.id, content: text });
    if (error) window.showToast("Failed to send", "error");
  });
}

window.clearChat = async function() {
  const pwd = prompt("Enter admin password to CLEAR ENTIRE CHAT for everyone:");
  if (pwd !== "defnotsam") {
    if (pwd !== null) window.showToast("Incorrect password", "error");
    return;
  }
  
  if (!confirm("Are you 100% sure you want to delete ALL messages in the chat history?")) return;
  
  window.setLoading(true);
  // Supabase JS requires a filter. Using neq with a fake UUID is the most robust way to affect all rows.
  const { error } = await supabaseClient.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  window.setLoading(false);
  
  if (error) window.showToast("Failed to clear chat", "error");
  else window.showToast("Chat cleared completely", "success");
};

window.deleteMessage = async function(msgId) {
  const pwd = prompt("Enter admin password to delete this message:");
  if (pwd !== "defnotsam") {
    if (pwd !== null) window.showToast("Incorrect password", "error");
    return;
  }
  
  window.setLoading(true);
  const { error } = await supabaseClient.from("messages").delete().eq("id", msgId);
  window.setLoading(false);
  
  if (error) window.showToast("Failed to delete message", "error");
  else window.showToast("Message deleted", "success");
};

function renderMessage(m, userId) {
  const msgContainer = document.getElementById("chat-messages");
  const isMine = m.user_id === userId;
  const name = isMine ? "You" : escapeHtml(m.profiles?.display_name || "Unknown");
  const d = new Date(m.created_at);
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const align = isMine ? "flex-end" : "flex-start";
  const bg = isMine ? "var(--primary)" : "#30363d";
  const color = isMine ? "white" : "var(--text)";
  
  const el = document.createElement("div");
  el.id = `msg-${m.id}`;
  el.style.cssText = `display: flex; flex-direction: column; align-items: ${align}; margin-bottom: 4px;`;
  el.innerHTML = `
    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
      ${name} • ${timeStr}
      <button onclick="deleteMessage('${m.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:0.8rem; padding:0;" title="Delete message">🗑️</button>
    </div>
    <div style="background: ${bg}; color: ${color}; padding: 8px 12px; border-radius: 12px; max-width: 80%; word-break: break-word;">
      ${escapeHtml(m.content)}
    </div>
  `;
  msgContainer.appendChild(el);
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

async function loadEducation(userId) {
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
    
    // Show delete button only if we are the owner
    const isOwner = post.user_id === userId;
    const deleteBtn = isOwner ? 
      `<button onclick="deleteEducation('${post.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1rem; padding:0; line-height:1;" title="Delete post">🗑️</button>` : "";
    
    return `
      <div class="edu-card" id="edu-${post.id}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div class="edu-meta">${user} • ${date}</div>
          ${deleteBtn}
        </div>
        <h3 class="edu-title">${escapeHtml(post.title)}</h3>
        <div class="edu-content">${escapeHtml(post.content || "")}</div>
        ${post.link_url ? `<a href="${escapeHtml(post.link_url)}" target="_blank" class="edu-link">View resource →</a>` : ""}
      </div>
    `;
  }).join("");
}

window.deleteEducation = async function(id) {
  if (!confirm("Are you sure you want to delete this resource?")) return;
  
  window.setLoading(true);
  const { error } = await supabaseClient.from("education_posts").delete().eq("id", id);
  window.setLoading(false);
  
  if (error) {
    window.showToast("Failed to delete", "error");
  } else {
    window.showToast("Deleted successfully", "success");
    const el = document.getElementById(`edu-${id}`);
    if (el) el.remove();
  }
};

init();
