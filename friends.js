let sessionUser = null;
let myProfile = null;

async function init() {
  const session = await requireAuth();
  if (!session) return;
  sessionUser = session.user;

  window.setLoading(true);
  
  // Try to load profile
  await loadProfile();
  
  window.setLoading(false);
}

// Generates a random CRT-XXXX code
function generateFriendCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CRT-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function loadProfile() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", sessionUser.id)
    .single();

  if (error || !data) {
    // Show profile setup
    document.getElementById("profile-setup").style.display = "block";
    document.getElementById("save-profile-btn").onclick = async () => {
      const name = document.getElementById("display-name-input").value.trim();
      if (!name) return window.showToast("Enter a display name", "error");
      
      window.setLoading(true);
      const { error: insertErr } = await supabaseClient.from("profiles").insert({
        id: sessionUser.id,
        email: sessionUser.email,
        display_name: name,
        friend_code: generateFriendCode()
      });
      window.setLoading(false);
      
      if (insertErr) {
        window.showToast("Error creating profile", "error");
      } else {
        document.getElementById("profile-setup").style.display = "none";
        await loadProfile();
      }
    };
    return;
  }

  myProfile = data;
  document.getElementById("social-dashboard").style.display = "flex";
  document.getElementById("my-friend-code").textContent = myProfile.friend_code;
  
  document.getElementById("copy-code-btn").onclick = () => {
    navigator.clipboard.writeText(myProfile.friend_code);
    window.showToast("Copied to clipboard!");
  };

  document.getElementById("add-friend-btn").onclick = sendFriendRequest;

  await loadFriendRequests();
  await loadFriends();
}

async function sendFriendRequest() {
  const code = document.getElementById("add-friend-input").value.trim().toUpperCase();
  if (!code) return;
  
  if (code === myProfile.friend_code) {
    return window.showToast("You cannot add yourself", "error");
  }

  window.setLoading(true);
  
  // Find user by code
  const { data: targetProfile, error: targetErr } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("friend_code", code)
    .single();

  if (targetErr || !targetProfile) {
    window.setLoading(false);
    return window.showToast("Friend code not found", "error");
  }

  // Send request
  const { error: insertErr } = await supabaseClient
    .from("friendships")
    .insert({
      requester_id: myProfile.id,
      receiver_id: targetProfile.id,
      status: "pending"
    });

  window.setLoading(false);
  
  if (insertErr) {
    if (insertErr.code === '23505') { // unique violation
      window.showToast("Request already exists or you are already friends", "error");
    } else {
      window.showToast("Error sending request", "error");
    }
  } else {
    document.getElementById("add-friend-input").value = "";
    window.showToast("Friend request sent!", "success");
  }
}

async function loadFriendRequests() {
  const { data, error } = await supabaseClient
    .from("friendships")
    .select(`
      id,
      profiles!friendships_requester_id_fkey ( display_name, friend_code )
    `)
    .eq("receiver_id", myProfile.id)
    .eq("status", "pending");

  const reqSec = document.getElementById("requests-section");
  const reqList = document.getElementById("requests-list");

  if (error || !data || data.length === 0) {
    reqSec.style.display = "none";
    return;
  }

  reqSec.style.display = "block";
  reqList.innerHTML = data.map(req => `
    <div style="display:flex; justify-content:space-between; align-items:center; background: var(--bg-card); padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px;">
      <div>
        <strong>${escapeHtml(req.profiles.display_name)}</strong> 
        <span class="mono" style="color:var(--text-muted); font-size:0.85rem; margin-left:8px;">${req.profiles.friend_code}</span>
      </div>
      <div style="display:flex; gap: 8px;">
        <button class="btn btn-primary" onclick="acceptRequest('${req.id}')" style="padding: 6px 12px; font-size: 0.8rem;">Accept</button>
        <button class="btn btn-ghost" onclick="rejectRequest('${req.id}')" style="padding: 6px 12px; font-size: 0.8rem;">Reject</button>
      </div>
    </div>
  `).join("");
}

window.acceptRequest = async function(id) {
  window.setLoading(true);
  await supabaseClient.from("friendships").update({ status: 'accepted' }).eq("id", id);
  window.setLoading(false);
  window.showToast("Friend added!", "success");
  await loadFriendRequests();
  await loadFriends();
};

window.rejectRequest = async function(id) {
  window.setLoading(true);
  await supabaseClient.from("friendships").delete().eq("id", id);
  window.setLoading(false);
  window.showToast("Request rejected", "success");
  await loadFriendRequests();
};

window.unfriend = async function(id) {
  if (!confirm("Are you sure you want to unfriend them? They will instantly lose access to your trades and chat.")) return;
  
  window.setLoading(true);
  await supabaseClient.from("friendships").delete().eq("id", id);
  window.setLoading(false);
  
  window.showToast("Unfriended successfully", "success");
  await loadFriends();
};

async function loadFriends() {
  // We need to fetch where we are requester OR receiver, and status is accepted
  const { data, error } = await supabaseClient
    .from("friendships")
    .select(`
      id,
      requester:profiles!friendships_requester_id_fkey ( id, display_name, friend_code, last_seen ),
      receiver:profiles!friendships_receiver_id_fkey ( id, display_name, friend_code, last_seen )
    `)
    .eq("status", "accepted")
    .or(`requester_id.eq.${myProfile.id},receiver_id.eq.${myProfile.id}`);

  const grid = document.getElementById("friends-grid");
  const empty = document.getElementById("friends-empty");

  if (error || !data || data.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  grid.innerHTML = data.map(f => {
    // Identify which one is the friend
    const friend = f.requester.id === myProfile.id ? f.receiver : f.requester;
    
    // Calculate last seen
    const lastSeenDate = new Date(friend.last_seen);
    const diffMins = Math.floor((new Date() - lastSeenDate) / 60000);
    const isOnline = diffMins < 5; // online if seen in last 5 mins
    
    let statusDot = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background: ${isOnline ? '#22c55e' : '#64748b'}; margin-right:6px;"></span>`;
    let statusText = isOnline ? "Online" : `Last seen ${diffMins > 60 ? Math.floor(diffMins/60) + 'h ago' : diffMins + 'm ago'}`;

    return `
      <div class="edu-card">
        <h3 class="edu-title" style="margin-bottom:4px;">${escapeHtml(friend.display_name)}</h3>
        <div class="edu-meta mono" style="margin-bottom:12px;">${friend.friend_code}</div>
        
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px; display:flex; align-items:center;">
          ${statusDot} ${statusText}
        </div>
        
        <div style="display:flex; gap: 8px;">
          <a href="friend-profile.html?id=${friend.id}" class="btn btn-ghost" style="flex:1; text-align:center; padding:8px;">View Trades</a>
          <button onclick="unfriend('${f.id}')" class="btn btn-danger" style="padding:8px; font-size: 0.85rem;" title="Unfriend">✕</button>
        </div>
      </div>
    `;
  }).join("");
}

// Helper
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}

init();
