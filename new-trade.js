let selectedFiles = [];

async function init() {
  const session = await requireAuth();
  if (!session) return;

  renderChecklist();
  wireFileInput();
  wireSubmit(session.user.id);
}

function renderChecklist() {
  const container = document.getElementById("checklist-container");
  container.innerHTML = window.CHECKLIST_SECTIONS.map(section => `
    <div class="section-block">
      <h2>${section.title}</h2>
      <ul class="checklist" data-section="${section.key}">
        ${section.items.map(item => `
          <li class="check-item">
            <input type="checkbox" id="${item.id}" data-id="${item.id}">
            <label for="${item.id}">${item.text}</label>
          </li>`).join("")}
      </ul>
    </div>
  `).join("");

  container.querySelectorAll('.check-item input[type="checkbox"]').forEach(box => {
    const row = box.closest(".check-item");
    box.addEventListener("change", () => row.classList.toggle("checked", box.checked));
  });
}

function wireFileInput() {
  const input = document.getElementById("file-input");
  const dropLabel = document.querySelector(".file-drop");
  const previewList = document.getElementById("file-preview-list");

  input.addEventListener("change", () => {
    selectedFiles = selectedFiles.concat(Array.from(input.files));
    renderPreviews();
    input.value = "";
  });

  dropLabel.addEventListener("dragover", e => { e.preventDefault(); });
  dropLabel.addEventListener("drop", e => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    selectedFiles = selectedFiles.concat(files);
    renderPreviews();
  });

  function renderPreviews() {
    previewList.innerHTML = "";
    selectedFiles.forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      const img = document.createElement("img");
      img.src = url;
      img.className = "file-preview";
      img.title = "Click to remove";
      img.addEventListener("click", () => {
        selectedFiles.splice(idx, 1);
        renderPreviews();
      });
      previewList.appendChild(img);
    });
  }
}

function collectChecklistState() {
  const state = {};
  document.querySelectorAll('#checklist-container input[type="checkbox"]').forEach(box => {
    state[box.dataset.id] = box.checked;
  });
  return state;
}

function wireSubmit(userId) {
  document.getElementById("trade-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    window.setLoading(true);

    const payload = {
      user_id: userId,
      pair: document.getElementById("pair").value.trim(),
      direction: document.getElementById("direction").value,
      session: document.getElementById("session").value,
      htf_anchor: document.getElementById("htf-anchor").value,
      entry: numOrNull("entry-price"),
      stop_loss: numOrNull("stop-loss"),
      take_profit: numOrNull("take-profit"),
      risk_percent: numOrNull("risk-percent"),
      rr_planned: numOrNull("rr-planned"),
      rr_achieved: numOrNull("rr-achieved"),
      outcome: document.getElementById("outcome").value,
      checklist: collectChecklistState(),
      notes: document.getElementById("notes").value.trim()
    };

    try {
      const { data: trade, error: insertError } = await supabaseClient
        .from("trades")
        .insert(payload)
        .select()
        .single();

      if (insertError) throw insertError;

      if (selectedFiles.length) {
        window.showToast(`Uploading ${selectedFiles.length} screenshot(s)...`, "success");
        for (const file of selectedFiles) {
          const path = await uploadScreenshot(userId, trade.id, file);
          const { error: shotError } = await supabaseClient
            .from("screenshots")
            .insert({ trade_id: trade.id, storage_path: path });
          if (shotError) throw shotError;
        }
      }

      window.showToast("Saved! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = `trade.html?id=${trade.id}`;
      }, 500);
    } catch (err) {
      window.setLoading(false);
      window.showToast("Error: " + err.message, "error");
      submitBtn.disabled = false;
    }
  });
}

function numOrNull(id) {
  const val = document.getElementById(id).value;
  return val === "" ? null : Number(val);
}

init();
