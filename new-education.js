let sessionUser = null;

async function init() {
  const session = await requireAuth();
  if (!session) return;
  sessionUser = session.user;

  document.getElementById("edu-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const title = document.getElementById("title").value.trim();
    const link_url = document.getElementById("link_url").value.trim() || null;
    const content = document.getElementById("content").value.trim() || null;
    const submitBtn = document.getElementById("submit-btn");

    if (!title) {
      window.showToast("Title is required", "error");
      return;
    }

    submitBtn.disabled = true;
    window.setLoading(true);

    try {
      const { error } = await supabaseClient
        .from("education_posts")
        .insert({
          user_id: sessionUser.id,
          user_email: sessionUser.email,
          title,
          link_url,
          content
        });

      if (error) throw error;

      window.setLoading(false);
      window.showToast("Resource posted successfully!", "success");
      
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);

    } catch (err) {
      window.setLoading(false);
      window.showToast("Error: " + err.message, "error");
      submitBtn.disabled = false;
    }
  });
}

init();
