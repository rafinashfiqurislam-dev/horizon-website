(() => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const state = { tab: "home", content: {}, items: [], editingItem: null };

  const titles = {
    home: "Home Page Manager",
    images: "Image Manager",
    items: "Products & Services",
    faqs: "Question & Answer",
    messages: "Message Inquiries",
    feedback: "Feedback",
    footer: "Footer Manager"
  };

  async function api(path, options = {}) {
    const response = await fetch("/api" + path, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Request failed (" + response.status + ")");
    }

    return data;
  }

  function notice(message, error = false) {
    const node = $("#notice");
    node.className = message ? "notice" + (error ? " error" : "") : "";
    node.textContent = message || "";
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function field(label, name, value = "", type = "text", full = false) {
    return '<div class="field' + (full ? ' full' : '') +
      '"><label>' + esc(label) +
      '</label><input name="' + esc(name) +
      '" type="' + esc(type) +
      '" value="' + esc(value) + '"></div>';
  }

  function area(label, name, value = "") {
    return '<div class="field full"><label>' + esc(label) +
      '</label><textarea name="' + esc(name) + '">' +
      esc(value) + '</textarea></div>';
  }

  function formDataObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  async function uploadImage(file) {
    if (!file) return "";

    const form = new FormData();
    form.append("image", file);

    const result = await api("/upload", {
      method: "POST",
      body: form
    });

    return result.url;
  }

  async function loadSite() {
    const data = await api("/site");
    state.content = data.content || {};
    state.items = data.items || [];
  }

  function renderHome() {
    const keys = [
      ["company_intro", "Company introduction"],
      ["tagline", "Tagline"],
      ["mission_heading", "Purpose heading"],
      ["mission_short", "Purpose short text"],
      ["mission_description", "Purpose description"],
      ["vision_heading", "Vision heading"],
      ["vision_short", "Vision short text"],
      ["vision_description", "Vision description"],
      ["support_line", "Help Center support line"]
    ];

    $("#panel").innerHTML =
      '<div class="card"><h2>Homepage content</h2>' +
      '<form id="homeForm" class="grid">' +
      keys.map(([key, label]) =>
        key.includes("description") || key === "company_intro"
          ? area(label, key, state.content[key] || "")
          : field(label, key, state.content[key] || "", "text", true)
      ).join("") +
      '<div class="field full actions">' +
      '<button class="primary" type="submit">Save homepage content</button>' +
      '</div></form></div>';

    $("#homeForm").addEventListener("submit", async event => {
      event.preventDefault();

      try {
        await api("/content", {
          method: "PUT",
          body: JSON.stringify(formDataObject(event.currentTarget))
        });

        await loadSite();
        notice("Homepage content saved.");
      } catch (error) {
        notice(error.message, true);
      }
    });
  }

  function renderImages() {
    const slots = [
      {
        key: "purpose_image",
        title: "Earth background — Our Purpose",
        desc: "Background image used in the Our Purpose section."
      },
      {
        key: "support_image",
        title: "Ocean background — Help Center",
        desc: "Background image used in the Help Center section."
      }
    ];

    $("#panel").innerHTML =
      '<div class="image-manager-grid">' +
      slots.map(slot => {
        const url = state.content[slot.key] || "";

        return '<div class="image-slot" data-image-slot="' +
          slot.key + '">' +
          '<h2>' + slot.title + '</h2>' +
          '<p class="muted">' + slot.desc + '</p>' +
          '<div class="image-preview">' +
          (url
            ? '<img src="' + esc(url) + '" alt="Current background">'
            : '<div class="image-placeholder">No image selected</div>') +
          '</div>' +
          '<label>Image URL</label>' +
          '<input class="image-url" value="' + esc(url) +
          '" placeholder="https://...">' +
          '<label>Or upload an image (max 5 MB)</label>' +
          '<input class="image-file" type="file" accept="image/jpeg,image/png,image/gif,image/webp">' +
          '<button class="primary save-image" type="button">Save image</button>' +
          '</div>';
      }).join("") +
      '</div>';

    $("#panel").querySelectorAll(".image-slot").forEach(slot => {
      const preview = $(".image-preview", slot);

      $(".image-url", slot).addEventListener("input", event => {
        const value = event.target.value.trim();

        preview.innerHTML = value
          ? '<img src="' + esc(value) + '" alt="Preview">'
          : '<div class="image-placeholder">No image selected</div>';
      });

      $(".save-image", slot).addEventListener("click", async () => {
        const button = $(".save-image", slot);
        button.disabled = true;

        try {
          const file = $(".image-file", slot).files[0];

          const url = file
            ? await uploadImage(file)
            : $(".image-url", slot).value.trim();

          await api("/content", {
            method: "PUT",
            body: JSON.stringify({
              [slot.dataset.imageSlot]: url
            })
          });

          await loadSite();
          renderImages();
          notice("Background image saved.");
        } catch (error) {
          notice(error.message, true);
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  function itemForm(item = {}) {
    return '<div class="card"><h2>' +
      (item.id ? "Edit product or service" : "Add product or service") +
      '</h2><form id="itemForm" class="grid">' +
      field("Name", "name", item.name || "") +
      field("Type", "type", item.type || "") +
      field("Short description", "short_perception", item.short_perception || "", "text", true) +
      area("Full description", "description", item.description || "") +
      field("Image URL", "image", item.image || "", "url", true) +
      '<div class="field full"><label>Or upload product image (max 5 MB)</label>' +
      '<input name="image_file" type="file" accept="image/jpeg,image/png,image/gif,image/webp"></div>' +
      field("Button text", "button_text", item.button_text || "") +
      field("Button URL", "button_url", item.button_url || "", "url") +
      '<div class="field"><label>Status</label><select name="status">' +
      '<option value="draft">Draft</option>' +
      '<option value="published">Published</option>' +
      '<option value="coming_soon">Coming soon</option>' +
      '</select></div>' +
      field("Publish date (optional)", "publish_at", item.publish_at || "", "datetime-local") +
      '<div class="field full actions">' +
      '<button class="primary" type="submit">' +
      (item.id ? "Update item" : "Add item") +
      '</button><button class="secondary cancel-edit" type="button">Clear form</button>' +
      '</div></form></div>';
  }

  async function renderItems() {
    const all = await api("/items");
    state.items = Array.isArray(all) ? all : [];

    $("#panel").innerHTML =
      itemForm(state.editingItem || {}) +
      '<div class="card"><h2>Saved products & services</h2>' +
      (state.items.length
        ? state.items.map(item =>
          '<div class="rowitem"><div><strong>' +
          esc(item.name) + '</strong><div class="muted">' +
          esc(item.type) + ' · ' + esc(item.status) +
          ' · ID ' + esc(item.id) +
          '</div></div><div class="actions">' +
          '<button class="secondary edit-item" data-id="' +
          esc(item.id) + '">Edit</button>' +
          '<button class="danger delete-item" data-id="' +
          esc(item.id) + '">Delete</button>' +
          '</div></div>'
        ).join("")
        : '<p class="muted">No products or services yet.</p>') +
      '</div>';

    const form = $("#itemForm");

    if (state.editingItem?.status) {
      form.elements.status.value = state.editingItem.status;
    }

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const button = $('button[type="submit"]', form);
      button.disabled = true;

      try {
        const values = formDataObject(form);
        const file = form.elements.image_file.files[0];

        delete values.image_file;

        if (file) {
          values.image = await uploadImage(file);
        }

        const id = state.editingItem?.id;

        await api(id ? "/items/" + id : "/items", {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(values)
        });

        state.editingItem = null;
        await renderItems();

        notice(id ? "Item updated." : "Item added.");
      } catch (error) {
        notice(error.message, true);
      } finally {
        button.disabled = false;
      }
    });

    $(".cancel-edit", form).addEventListener("click", () => {
      state.editingItem = null;
      renderItems().catch(error => notice(error.message, true));
    });

    $("#panel").querySelectorAll(".edit-item").forEach(button => {
      button.addEventListener("click", () => {
        state.editingItem =
          state.items.find(item => String(item.id) === button.dataset.id) || null;

        renderItems().catch(error => notice(error.message, true));
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    $("#panel").querySelectorAll(".delete-item").forEach(button => {
      button.addEventListener("click", async () => {
        if (!confirm("Delete this item?")) return;

        try {
          await api("/items/" + button.dataset.id, {
            method: "DELETE"
          });

          await renderItems();
          notice("Item deleted.");
        } catch (error) {
          notice(error.message, true);
        }
      });
    });
  }

  async function renderFaqs() {
    const faqs = await api("/faqs");

    $("#panel").innerHTML =
      '<div class="card"><h2>Add question & answer</h2>' +
      '<form id="faqForm" class="grid">' +
      field("Product/service name", "item_name") +
      field("Question (English)", "question_en") +
      field("Question (Bangla)", "question_bn") +
      area("Answer", "answer") +
      '<div class="field full"><button class="primary" type="submit">Add FAQ</button></div>' +
      '</form></div><div class="card"><h2>Saved questions</h2>' +
      (faqs.length
        ? faqs.map(faq =>
          '<form class="faq-row card" data-id="' + esc(faq.id) + '">' +
          field("Product/service", "item_name", faq.item_name) +
          field("Question (English)", "question_en", faq.question_en) +
          field("Question (Bangla)", "question_bn", faq.question_bn) +
          area("Answer", "answer", faq.answer) +
          '<div class="actions"><button class="primary" type="submit">Save</button>' +
          '<button class="danger faq-delete" type="button">Delete</button></div>' +
          '</form>'
        ).join("")
        : '<p class="muted">No questions yet.</p>') +
      '</div>';

    $("#faqForm").addEventListener("submit", async event => {
      event.preventDefault();

      try {
        await api("/faqs", {
          method: "POST",
          body: JSON.stringify(formDataObject(event.currentTarget))
        });

        await renderFaqs();
        notice("FAQ added.");
      } catch (error) {
        notice(error.message, true);
      }
    });

    $("#panel").querySelectorAll(".faq-row").forEach(form => {
      form.addEventListener("submit", async event => {
        event.preventDefault();

        try {
          await api("/faqs/" + form.dataset.id, {
            method: "PUT",
            body: JSON.stringify(formDataObject(form))
          });

          notice("FAQ updated.");
        } catch (error) {
          notice(error.message, true);
        }
      });

      $(".faq-delete", form).addEventListener("click", async () => {
        if (!confirm("Delete this FAQ?")) return;

        try {
          await api("/faqs/" + form.dataset.id, {
            method: "DELETE"
          });

          await renderFaqs();
          notice("FAQ deleted.");
        } catch (error) {
          notice(error.message, true);
        }
      });
    });
  }

  async function renderMessages() {
    const messages = await api("/messages");

    $("#panel").innerHTML =
      '<div class="card"><h2>Message inquiries</h2>' +
      (messages.length
        ? messages.map(message =>
          '<div class="rowitem"><div><strong>' +
          esc(message.email) + '</strong><p>' +
          esc(message.message) + '</p><div class="muted">' +
          esc(message.created_at || "") + ' · ' +
          (message.is_read ? "Read" : "Unread") +
          '</div></div><div class="actions">' +
          '<button class="secondary toggle-read" data-id="' +
          esc(message.id) + '" data-read="' +
          (message.is_read ? "0" : "1") + '">' +
          (message.is_read ? "Mark unread" : "Mark read") +
          '</button></div></div>'
        ).join("")
        : '<p class="muted">No messages received.</p>') +
      '</div>';

    $("#panel").querySelectorAll(".toggle-read").forEach(button => {
      button.addEventListener("click", async () => {
        try {
          await api("/messages/" + button.dataset.id, {
            method: "PATCH",
            body: JSON.stringify({
              is_read: Number(button.dataset.read)
            })
          });

          await renderMessages();
          notice("Message status updated.");
        } catch (error) {
          notice(error.message, true);
        }
      });
    });
  }

  async function renderFeedback() {
    const rows = await api("/feedback");

    $("#panel").innerHTML =
      '<div class="card"><h2>Website feedback</h2>' +
      (rows.length
        ? rows.map(row =>
          '<div class="rowitem"><div><strong>' +
          esc(row.email || "Anonymous") + '</strong><p>' +
          esc(row.message) + '</p><div class="muted">' +
          esc(row.created_at || "") +
          '</div></div></div>'
        ).join("")
        : '<p class="muted">No feedback received.</p>') +
      '</div>';
  }

  async function renderFooter() {
    const data = await api("/footer/manage");
    const sections = data.sections || [];
    const items = data.items || [];

    $("#panel").innerHTML =
      '<div class="card"><h2>Add footer section</h2>' +
      '<form id="sectionForm" class="actions">' +
      '<input name="title" placeholder="Section title" required>' +
      '<button class="primary">Add section</button></form></div>' +

      sections.map(section =>
        '<div class="card"><form class="section-form actions" data-id="' +
        esc(section.id) + '">' +
        '<input name="title" value="' + esc(section.title) + '" required>' +
        '<button class="secondary">Save section</button>' +
        '<button class="danger delete-section" type="button">Delete section</button>' +
        '</form><div class="muted">Footer links</div>' +

        items.filter(item =>
          String(item.section_id) === String(section.id)
        ).map(item =>
          '<form class="footer-item-form grid" data-id="' +
          esc(item.id) + '">' +
          field("Link name", "name", item.name) +
          field("Description / URL", "description", item.description) +
          '<div class="field full actions">' +
          '<button class="secondary">Save link</button>' +
          '<button class="danger delete-footer-item" type="button">Delete link</button>' +
          '</div></form>'
        ).join("") +

        '<form class="add-footer-item actions" data-section="' +
        esc(section.id) + '">' +
        '<input name="name" placeholder="Link name" required>' +
        '<input name="description" placeholder="Description / URL">' +
        '<button class="primary">Add link</button></form></div>'
      ).join("") +

      (sections.length ? "" :
        '<p class="muted">No footer sections yet.</p>');

    $("#sectionForm").addEventListener("submit", async event => {
      event.preventDefault();

      try {
        await api("/footer/sections", {
          method: "POST",
          body: JSON.stringify(formDataObject(event.currentTarget))
        });

        await renderFooter();
        notice("Footer section added.");
      } catch (error) {
        notice(error.message, true);
      }
    });

    $("#panel").querySelectorAll(".section-form").forEach(form => {
      form.addEventListener("submit", async event => {
        event.preventDefault();

        try {
          await api("/footer/sections/" + form.dataset.id, {
            method: "PUT",
            body: JSON.stringify(formDataObject(form))
          });

          notice("Section updated.");
        } catch (error) {
          notice(error.message, true);
        }
      });

      $(".delete-section", form).addEventListener("click", async () => {
        if (!confirm("Delete this section and its links?")) return;

        try {
          await api("/footer/sections/" + form.dataset.id, {
            method: "DELETE"
          });

          await renderFooter();
          notice("Section deleted.");
        } catch (error) {
          notice(error.message, true);
        }
      });
    });

    $("#panel").querySelectorAll(".footer-item-form").forEach(form => {
      form.addEventListener("submit", async event => {
        event.preventDefault();

        try {
          await api("/footer/items/" + form.dataset.id, {
            method: "PUT",
            body: JSON.stringify(formDataObject(form))
          });

          notice("Footer link updated.");
        } catch (error) {
          notice(error.message, true);
        }
      });

      $(".delete-footer-item", form).addEventListener("click", async () => {
        if (!confirm("Delete this footer link?")) return;

        try {
          await api("/footer/items/" + form.dataset.id, {
            method: "DELETE"
          });

          await renderFooter();
          notice("Footer link deleted.");
        } catch (error) {
          notice(error.message, true);
        }
      });
    });

    $("#panel").querySelectorAll(".add-footer-item").forEach(form => {
      form.addEventListener("submit", async event => {
        event.preventDefault();

        try {
          const values = formDataObject(form);
          values.section_id = Number(form.dataset.section);

          await api("/footer/items", {
            method: "POST",
            body: JSON.stringify(values)
          });

          await renderFooter();
          notice("Footer link added.");
        } catch (error) {
          notice(error.message, true);
        }
      });
    });
  }

  async function render() {
    notice("");

    $("#pageTitle").textContent = titles[state.tab];

    $("#nav").querySelectorAll("button[data-tab]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.tab === state.tab
      );
    });

    $("#panel").innerHTML =
      '<div class="card">Loading…</div>';

    try {
      if (state.tab === "home") {
        await loadSite();
        renderHome();
      } else if (state.tab === "images") {
        await loadSite();
        renderImages();
      } else if (stat
