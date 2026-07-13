function getTradeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function init() {
  const session = await requireAuth();
  if (!session) return;
  const sessionUser = session.user;

  const tradeId = getTradeIdFromUrl();
  if (!tradeId) {
    document.getElementById("trade-title").textContent = "No trade specified.";
    return;
  }

  window.setLoading(true);
  const { data: trade, error } = await supabaseClient
    .from("trades")
    .select("*")
    .eq("id", tradeId)
    .single();

  if (error || !trade) {
    window.setLoading(false);
    document.getElementById("trade-title").textContent = "Trade not found.";
    window.showToast("Failed to load trade.", "error");
    return;
  }

  if (trade.user_id !== sessionUser.id) {
    const delBtn = document.getElementById("delete-btn");
    if (delBtn) delBtn.style.display = "none";
  }

  renderTrade(trade);
  
  try {
    await renderScreenshots(tradeId);
  } catch (err) {
    console.error("Error rendering screenshots:", err);
    document.getElementById("gallery").innerHTML = `<div class="empty-state">Error loading screenshots: ${err.message}</div>`;
  }
  
  window.setLoading(false);
  
  wireDelete(tradeId);
  wireLightbox();
}

function renderTrade(t) {
  const date = new Date(t.created_at).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
  document.getElementById("trade-date").textContent = date;
  document.getElementById("trade-title").textContent =
    `${(t.pair || "—").toUpperCase()} · ${(t.direction || "").toUpperCase()}`;

  const rows = [
    ["Outcome", `<span class="badge ${t.outcome || "open"}">${t.outcome || "open"}</span>`],
    ["Session", t.session || "—"],
    ["HTF anchor", t.htf_anchor || "—"],
    ["Entry", t.entry ?? "—"],
    ["Stop-loss", t.stop_loss ?? "—"],
    ["Take-profit", t.take_profit ?? "—"],
    ["Risk %", t.risk_percent ?? "—"],
    ["RR planned", t.rr_planned ?? "—"],
    ["RR achieved", t.rr_achieved ?? "—"]
  ];

  document.getElementById("detail-grid").innerHTML = rows.map(([k, v]) => `
    <div class="detail-cell"><span class="k mono">${k}</span><span class="v">${v}</span></div>
  `).join("");

  const checklist = t.checklist || {};
  const allItems = window.CHECKLIST_SECTIONS.flatMap(s => s.items);
  const checkedItems = allItems.filter(item => checklist[item.id]);

  if (checkedItems.length === 0) {
    document.getElementById("checklist-review").innerHTML = `
      <div class="empty-state" style="padding: 30px; margin-bottom: 20px;">
        No checklist items were marked for this trade.
      </div>`;
  } else {
    document.getElementById("checklist-review").innerHTML = checkedItems.map(item => `
      <li class="review-item pass">
        <span class="mark">✓</span>
        <label>${item.text}</label>
      </li>`).join("");
  }

  if (t.notes) {
    document.getElementById("notes-section").style.display = "block";
    document.getElementById("notes-block").textContent = t.notes;
  }
}

async function renderScreenshots(tradeId) {
  const { data: shots, error } = await supabaseClient
    .from("screenshots")
    .select("*")
    .eq("trade_id", tradeId)
    .order("created_at", { ascending: true });

  const gallery = document.getElementById("gallery");
  if (error || !shots || !shots.length) {
    gallery.innerHTML = `<div class="empty-state">No screenshots attached.</div>`;
    return;
  }

  const withUrls = await Promise.all(shots.map(async s => ({
    ...s,
    url: await getSignedUrl(s.storage_path)
  })));

  gallery.innerHTML = withUrls.map(s => `<img src="${s.url}" data-full="${s.url}">`).join("");
}

function wireLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");

  document.getElementById("gallery").addEventListener("click", (e) => {
    if (e.target.tagName === "IMG") {
      lightboxImg.src = e.target.dataset.full;
      lightbox.classList.add("open");
    }
  });

  document.getElementById("lightbox-close").addEventListener("click", () => {
    lightbox.classList.remove("open");
  });
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.classList.remove("open");
  });
}

function wireDelete(tradeId) {
  document.getElementById("delete-btn").addEventListener("click", async () => {
    if (!confirm("Delete this trade and its screenshots? This can't be undone.")) return;
    window.setLoading(true);

    // First find any screenshots associated with this trade
    const { data: shots } = await supabaseClient
      .from("screenshots")
      .select("storage_path")
      .eq("trade_id", tradeId);

    // If there are files, remove them from the storage bucket
    if (shots && shots.length > 0) {
      const paths = shots.map(s => s.storage_path);
      await supabaseClient.storage.from("trade-screenshots").remove(paths);
    }

    // Now delete the trade row (ON DELETE CASCADE handles the screenshot DB rows automatically)
    const { error } = await supabaseClient.from("trades").delete().eq("id", tradeId);
    
    if (error) { 
      window.setLoading(false);
      window.showToast("Error deleting: " + error.message, "error"); 
      return; 
    }
    
    window.showToast("Trade deleted", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  });
}

init();
