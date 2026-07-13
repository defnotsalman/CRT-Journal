// Requires: config.js and the Supabase JS CDN script loaded before this file.

const supabaseClient = window.supabase.createClient(
  window.CRT_CONFIG.SUPABASE_URL,
  window.CRT_CONFIG.SUPABASE_ANON_KEY
);

const SCREENSHOT_BUCKET = "trade-screenshots";

// ---------- Auth helpers ----------

async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

async function sendMagicLink(email) {
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  });
  if (error) throw error;
}

async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

let presenceInterval = null;

// Call this at the top of every page. Redirects to login if no session.
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    document.body.innerHTML = "";
    window.location.href = "index.html";
    return null;
  }
  
  // Ping presence every 1 minute if user has a profile
  if (!presenceInterval) {
    presenceInterval = setInterval(async () => {
      await supabaseClient.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", session.user.id);
    }, 60000);
    // Do one ping immediately
    supabaseClient.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", session.user.id);
  }

  return session;
}

// ---------- Storage helpers ----------

async function uploadScreenshot(userId, tradeId, file) {
  const path = `${userId}/${tradeId}/${Date.now()}-${file.name}`;
  const { error } = await supabaseClient.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return path;
}

async function getSignedUrl(path, expiresInSeconds = 3600) {
  const { data, error } = await supabaseClient.storage
    .from(SCREENSHOT_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

// ---------- UI helpers ----------

window.showToast = function(msg, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> <span>${msg}</span>`;
  container.appendChild(t);
  
  setTimeout(() => {
    t.classList.add("fade-out");
    setTimeout(() => t.remove(), 300);
  }, 4000);
};

window.setLoading = function(isLoading) {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    if (isLoading) overlay.classList.add("open");
    else overlay.classList.remove("open");
  }
};
