
const $ = s => document.querySelector(s);

let active = "home";
let editingItem = null;
let editingFaq = null;

async function api(url, opts = {}) {
  const r = await fetch("/api" + url, {
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {})
    },
    ...opts
  });

  let d = {};
  try {
    d = await r.json();
  } catch {}

  if (!r.ok) {
    throw Error(d.error || "Request failed");
  }

  return d;
}

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function notice(message, error = false) {
  $("#notice").innerHTML =
    `<div class="notice ${error ? "error" : ""}">${esc(message)}</div>`;

  setTimeout(() => {
    $("#notice").innerHTML = "";
  }, 4000);
}

async function uploadImage(file) {
  if (!file) {
    throw Error("Please choose an image first.");
  }

  const form = new FormData();
  form.append("image", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: form
  });

  let data = {};
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    throw Error(data.error || "Image upload failed.");
  }

  if (!data.url) {
    throw Error("Image URL was not returned.");
  }

  return data.url;
}

async function check() {
  const data = await api("/me");

  if (data.admin) {
    $("#login").hidden = true;
    $("#app").hidden = false;
    await render();
  } else {
    $("#login").hidden = false;
    $("#app").hidden = true;
  }
}

$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  try {
    await api("/login", {
      method: "POST",
      body: JSON.stringify(
        Object.fromEntries(new FormData(event.target))
      )
    });

    $("#loginError").textContent = "";
    await check();

  } catch (error) {
    $("#loginError").textContent = error.message;
  }
});

$("#logout").onclick = async () => {
  try {
    await api("/logout", { method: "POST" });
    await check();
  } catch (error) {
    notice(error.message, true);
  }
};

$("#nav").addEventListener("click", event => {
  const button = event.target.closest("[data-tab]");

  if (button) {
    active = button.dataset.tab;
    render();
  }
});

async function render() {
  document.querySelectorAll("[data-tab]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.tab === active
    );
  });

  const titles = {
    home: "Home Page Manager",
    images: "Image Manager",
    items: "Products & Services",
    faqs: "Question & Answer Manager",
    messages: "Message Inquiries",
    feedback: "Feedback Manager",
    footer: "Footer Manager"
  };

  $("#pageTitle").textContent = titles[active] || "Manager";

  const panel = $("#panel");
  panel.innerHTML = '<div class="card">Loading...</div>';

  try {
    if (active === "home") await home(panel);
    if (active === "images") await images(panel);
    if (active === "items") await items(panel);
    if (active === "faqs") await faqs(panel);
    if (active === "messages") await messages(panel);
    if (active === "feedback") await feedback(panel);
    if (active === "footer") await footer(panel);

  } catch (error) {
    panel.innerHTML =
      `<div class="card">${esc(error.message)}</div>`;
  }
}

function field(label, key, value = "", type = "text", full = false) {
  return `
    <div class="field ${full ? "full" : ""}">
      <label>${esc(label)}</label>
      ${
        type === "textarea"
          ? `<textarea name="${key}">${esc(value)}</textarea>`
          : `<input name="${key}" type="${type}" value="${esc(value)}">`
      }
    </div>
  `;
}

/* HOME PAGE MANAGER */

async function home(panel) {
  const data = await api("/site");
  const content = data.content || {};

  panel.innerHTML = `
    <form id="homeForm" class="card">

      <h2>Company Introduction</h2>

      ${field(
        "Company introduction",
        "company_intro",
        content.company_intro,
        "textarea",
        true
      )}

      ${field("Company tagline", "tagline", content.tagline)}

      <h2>Our Purpose / Mission</h2>

      <div class="grid">
        ${field("Mission heading", "mission_heading", content.mission_heading)}
        ${field("Short perception", "mission_short", content.mission_short)}
        ${field(
          "Mission description",
          "mission_description",
          content.mission_description,
          "textarea",
          true
        )}
      </div>

      <h2>Our Vision</h2>

      <div class="grid">
        ${field("Vision heading", "vision_heading", content.vision_heading)}
        ${field("Short perception", "vision_short", content.vision_short)}
        ${field(
          "Vision description",
          "vision_description",
          content.vision_description,
          "textarea",
          true
        )}
      </div>

      <h2>Help Center</h2>

      ${field(
        "Support tagline",
        "support_line",
        content.support_line,
        "textarea",
        true
      )}

      <button class="primary" type="submit">
        Save Home Page Content
      </button>

    </form>
  `;

  $("#homeForm").onsubmit = async event => {
    event.preventDefault();

    try {
      await api("/content", {
        method: "PUT",
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.target))
        )
      });

      notice("Home page content saved.");

    } catch (error) {
      notice(error.message, true);
    }
  };
}

/* IMAGE MANAGER */

async function images(panel) {
  const data = await api("/site");
  const content = data.content || {};

  const purposeImage = content.purpose_image || "";
  const supportImage = content.support_image || "";

  panel.innerHTML = `
    <div class="card">
      <h2>Image Manager</h2>

      <p class="muted">
        Manage only the two background images used on the website.
      </p>

      <div class="image-manager-grid">

        <div class="image-slot">
          <h2>Earth Background</h2>

          <p class="muted">
            Background image for the Our Purpose section.
          </p>

          <div class="image-preview" id="purposePreview">
            ${
              purposeImage
                ? `<img src="${esc(purposeImage)}" alt="Earth background preview">`
                : `<div class="image-placeholder">No image uploaded</div>`
            }
          </div>

          <label>Choose Earth background image</label>
          <input
            type="file"
            id="purposeFile"
            accept="image/jpeg,image/png,image/gif,image/webp"
          >

          <label>Image URL</label>
          <input
            type="url"
            id="purposeUrl"
            value="${esc(purposeImage)}"
            placeholder="Uploaded image URL"
          >

          <button
            type="button"
            class="secondary"
            id="uploadPurpose"
          >
            Upload Earth Image
          </button>
        </div>

        <div class="image-slot">
          <h2>Ocean Background</h2>

          <p class="muted">
            Background image for the Help Center section.
          </p>

          <div class="image-preview" id="supportPreview">
            ${
              supportImage
                ? `<img src="${esc(supportImage)}" alt="Ocean background preview">`
                : `<div class="image-placeholder">No image uploaded</div>`
            }
          </div>

          <label>Choose Ocean background image</label>
          <input
            type="file"
            id="supportFile"
            accept="image/jpeg,image/png,image/gif,image/webp"
          >

          <label>Image URL</label>
          <input
            type="url"
            id="supportUrl"
            value="${esc(supportImage)}"
            placeholder="Uploaded image URL"
          >

          <button
            type="button"
            class="secondary"
            id="uploadSupport"
          >
            Upload Ocean Image
          </button>
        </div>

      </div>

      <div class="actions">
        <button type="button" class="primary" id="saveImages">
          Save Background Images
        </button>
      </div>
    </div>
  `;

  function updatePreview(inputId, previewId) {
    const url = $(inputId).value.trim();

    if (!url) {
      $(previewId).innerHTML =
        '<div class="image-placeholder">No image uploaded</div>';
      return;
    }

    $(previewId).innerHTML =
      `<img src="${esc(url)}" alt="Background preview">`;
  }

  $("#purposeUrl").addEventListener("input", () => {
    updatePreview("#purposeUrl", "#purposePreview");
  });

  $("#supportUrl").addEventListener("input", () => {
    updatePreview("#supportUrl", "#supportPreview");
  });

  $("#uploadPurpose").onclick = async () => {
    try {
      const file = $("#purposeFile").files[0];
      const url = await uploadImage(file);

      $("#purposeUrl").value = url;
      updatePreview("#purposeUrl", "#purposePreview");

      notice("Earth image uploaded. Now save the background images.");

    } catch (error) {
      notice(error.message, true);
    }
  };

  $("#uploadSupport").onclick = async () => {
    try {
      const file = $("#supportFile").files[0];
      const url = await uploadImage(file);

      $("#supportUrl").value = url;
      updatePreview("#supportUrl", "#supportPreview");

      notice("Ocean image uploaded. Now save the background images.");

    } catch (error) {
      notice(error.message, true);
    }
  };

  $("#saveImages").onclick = async () => {
    try {
      const purpose = $("#purposeUrl").value.trim();
      const support = $("#supportUrl").value.trim();

      await api("/content", {
        method: "PUT",
        body: JSON.stringify({
          purpose_image: purpose,
          support_image: support
        })
      });

      notice("Background image settings saved.");

    } catch (error) {
      notice(error.message, true);
    }
  };
}

/* PRODUCTS AND SERVICES */

async function items(panel) {
  const data = await api("/items");

  panel.innerHTML = `
    <div class="card">
      <h2>${editingItem ? "Edit" : "Add"} Product or Service</h2>

      <form id="itemForm" class="grid">

        ${field("Content type", "type", editingItem?.type || "product")}

        <div class="field">
          <label>Status</label>
          <select name="status">
            <option value="draft">Draft (hidden)</option>
            <option value="published" ${editingItem?.status === "published" ? "selected" : ""}>Published</option>
            <option value="coming_soon" ${editingItem?.status === "coming_soon" ? "selected" : ""}>Coming soon</option>
          </select>
        </div>

        ${field("Name", "name", editingItem?.name || "")}
        ${field("Short perception", "short_perception", editingItem?.short_perception || "")}
        ${field("Featured image URL", "image", editingItem?.image || "")}
        ${field("Button text", "button_text", editingItem?.button_text || "Explore")}
        ${field("Button URL", "button_url", editingItem?.button_url || "", "url")}
        ${field("Publish date", "publish_at", editingItem?.publish_at || "", "date")}

        ${field(
          "Description",
          "description",
          editingItem?.description || "",
          "textarea",
          true
        )}

        <div class="field full">
          <label>Upload product image</label>
          <input type="file" id="itemUpload" accept="image/*">
        </div>

        <div class="actions field full">
          <button type="button" class="secondary" id="uploadItem">
            Upload image
          </button>

          <button class="primary">Save item</button>

          <button type="button" class="secondary" id="cancelEdit">
            Clear
          </button>
        </div>

      </form>
    </div>

    <div class="card">
      <h2>Existing Products & Services</h2>

      ${
        data.map(item => `
          <div class="rowitem">
            <div>
              <b>${esc(item.name)}</b>
              <div class="muted">
                ${esc(item.type)} · ${esc(item.status)} ·
                ${esc(item.short_perception)}
              </div>
            </div>

            <div class="actions">
              <button class="secondary" data-edit="${item.id}">Edit</button>
              <button class="danger" data-delete="${item.id}">Delete</button>
            </div>
          </div>
        `).join("") || '<p class="muted">No items yet.</p>'
      }
    </div>
  `;

  $("#cancelEdit").onclick = () => {
    editingItem = null;
    render();
  };

  $("#uploadItem").onclick = async () => {
    try {
      const url = await uploadImage($("#itemUpload").files[0]);
      $('#itemForm [name="image"]').value = url;
      notice("Product image uploaded.");

    } catch (error) {
      notice(error.message, true);
    }
  };

  $("#itemForm").onsubmit = async event => {
    event.preventDefault();

    try {
      const body = Object.fromEntries(new FormData(event.target));

      if (!body.name) {
        return notice("Enter a product or service name.", true);
      }

      await api(
        editingItem ? "/items/" + editingItem.id : "/items",
        {
          method: editingItem ? "PUT" : "POST",
          body: JSON.stringify(body)
        }
      );

      editingItem = null;
      notice("Product or service saved.");
      await render();

    } catch (error) {
      notice(error.message, true);
    }
  };

  panel.querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = () => {
      editingItem = data.find(
        item => item.id == button.dataset.edit
      );
      render();
    };
  });

  panel.querySelectorAll("[data-delete]").forEach(button => {
    button.onclick = async () => {
      if (!confirm("Delete this item?")) return;

      try {
        await api("/items/" + button.dataset.delete, {
          method: "DELETE"
        });

        notice("Item deleted.");
        await render();

      } catch (error) {
        notice(error.message, true);
      }
    };
  });
}

/* FAQ MANAGER */

async function faqs(panel) {
  const data = await api("/faqs");

  panel.innerHTML = `
    <div class="card">
      <h2>${editingFaq ? "Edit" : "Add"} Question & Answer</h2>

      <form id="faqForm" class="grid">

        ${field("Product/service name", "item_name", editingFaq?.item_name || "")}
        ${field("Question (English)", "question_en", editingFaq?.question_en || "")}
        ${field("Question (বাংলা)", "question_bn", editingFaq?.question_bn || "")}

        ${field(
          "Answer",
          "answer",
          editingFaq?.answer || "",
          "textarea",
          true
        )}

        <div class="actions field full">
          <button class="primary">Save Q&A</button>
          <button type="button" class="secondary" id="faqClear">Clear</button>
        </div>

      </form>
    </div>

    <div class="card">
      <h2>Questions and Answers</h2>

      ${
        data.map(item => `
          <div class="rowitem">
            <div>
              <b>${esc(item.item_name)} — ${esc(item.question_en)}</b>
              <div class="muted">
                ${esc(item.question_bn)}<br>
                ${esc(item.answer)}
              </div>
            </div>

            <div class="actions">
              <button class="secondary" data-edit="${item.id}">Edit</button>
              <button class="danger" data-del="${item.id}">Delete</button>
            </div>
          </div>
        `).join("") || '<p class="muted">No questions yet.</p>'
      }
    </div>
  `;

  $("#faqClear").onclick = () => {
    editingFaq = null;
    render();
  };

  $("#faqForm").onsubmit = async event => {
    event.preventDefault();

    try {
      await api(
        editingFaq ? "/faqs/" + editingFaq.id : "/faqs",
        {
          method: editingFaq ? "PUT" : "POST",
          body: JSON.stringify(
            Object.fromEntries(new FormData(event.target))
          )
        }
      );

      editingFaq = null;
      notice("Question saved.");
      await render();

    } catch (error) {
      notice(error.message, true);
    }
  };

  panel.querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = () => {
      editingFaq = data.find(
        item => item.id == button.dataset.edit
      );
      render();
    };
  });

  panel.querySelectorAll("[data-del]").forEach(button => {
    button.onclick = async () => {
      if (!confirm("Delete question?")) return;

      try {
        await api("/faqs/" + button.dataset.del, {
          method: "DELETE"
        });

        await render();

      } catch (error) {
        notice(error.message, true);
      }
    };
  });
}

/* MESSAGE INBOX */

async function messages(panel) {
  const mode = window.msgMode || "all";
  const data = await api("/messages?mode=" + mode);

  panel.innerHTML = `
    <div class="card">

      <div class="actions">
        <button class="secondary" data-mode="unread">Unread</button>
        <button class="secondary" data-mode="read">Read</button>
        <button class="secondary" data-mode="all">All</button>
      </div>

      ${
        data.map(item => `
          <div class="rowitem">
            <div>
              <b>${esc(item.email)}</b>
              <div class="muted">
                ${esc(item.created_at)} ·
                ${item.is_read ? "Read" : "Unread"}
              </div>
              <p>${esc(item.message)}</p>
            </div>

            <button
              class="secondary"
              data-read="${item.id}"
              data-value="${item.is_read ? 0 : 1}"
            >
              ${item.is_read ? "Mark unread" : "Mark read"}
            </button>
          </div>
        `).join("") || '<p class="muted">No messages in this view.</p>'
      }

    </div>
  `;

  panel.querySelectorAll("[data-mode]").forEach(button => {
    button.onclick = () => {
      window.msgMode = button.dataset.mode;
      render();
    };
  });

  panel.querySelectorAll("[data-read]").forEach(button => {
    button.onclick = async () => {
      try {
        await api("/messages/" + button.dataset.read, {
          method: "PATCH",
          body: JSON.stringify({
            is_read: Number(button.dataset.value)
          })
        });

        await render();

      } catch (error) {
        notice(error.message, true);
      }
    };
  });
}

/* FEEDBACK MANAGER */

async function feedback(panel) {
  const data = await api("/feedback");

  panel.innerHTML = `
    <div class="card">
      <h2>Received Feedback</h2>

      ${
        data.map(item => `
          <div class="rowitem">
            <div>
              <b>${esc(item.email || "Anonymous")}</b>
              <div class="muted">${esc(item.created_at)}</div>
              <p>${esc(item.message)}</p>
            </div>
          </div>
        `).join("") || '<p class="muted">No feedback yet.</p>'
      }

    </div>
  `;
}

/* FOOTER MANAGER */

async function footer(panel) {
  const data = await api("/footer/manage");

  panel.innerHTML = `
    <div class="card">
      <h2>Add New Footer Section</h2>

      <form id="sectionForm" class="actions">
        <input
          name="title"
          placeholder="Section title"
          required
        >
        <button class="primary">Add section</button>
      </form>
    </div>

    ${
      data.sections.map(section => `
        <div class="card">

          <div class="rowitem">
            <h2>${esc(section.title)}</h2>
            <button
              class="danger"
              data-sec-del="${section.id}"
            >
              Delete section
            </button>
          </div>

          <form
            class="actions"
            data-add-item="${section.id}"
          >
            <input name="name" placeholder="Item name" required>
    
