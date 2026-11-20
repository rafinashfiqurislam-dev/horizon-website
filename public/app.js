const $ = selector => document.querySelector(selector);

async function getSite() {
  try {
    const response = await fetch("/api/site");

    if (!response.ok) {
      throw new Error("Unable to load website content.");
    }

    const data = await response.json();
    const content = data.content || {};

    // COMPANY INTRODUCTION
    $("#intro").textContent = content.company_intro || "";
    $("#tagline").textContent = content.tagline || "Think beyond";

    // OUR PURPOSE / MISSION
    $("#missionHeading").textContent =
      content.mission_heading || "Our mission";

    $("#missionShort").textContent =
      content.mission_short || "";

    // OUR PURPOSE BACKGROUND IMAGE
    const purposeSection = $("#mission");

    if (purposeSection && content.purpose_image) {
      purposeSection.style.backgroundImage =
        `linear-gradient(rgba(5,12,24,.78), rgba(5,12,24,.82)), url("${content.purpose_image}")`;

      purposeSection.style.backgroundSize = "cover";
      purposeSection.style.backgroundPosition = "center";
      purposeSection.style.backgroundRepeat = "no-repeat";
    }

    // OUR VISION
    $("#visionHeading").textContent =
      content.vision_heading || "Our vision";

    $("#visionShort").textContent =
      content.vision_short || "";

    // HELP CENTER
    $("#supportLine").textContent =
      content.support_line || "";

    if (content.hero_image) {
      $("#heroImage").style.backgroundImage =
        `url("${content.hero_image}")`;
    }

    if (content.support_image) {
      $("#supportImage").style.backgroundImage =
        `url("${content.support_image}")`;
    }

    // PRODUCTS AND SERVICES
    const productList = $("#productList");
    productList.innerHTML = "";

    (data.items || []).forEach(item => {
      const card = document.createElement("article");
      card.className = "product-card";

      if (item.image) {
        const image = document.createElement("img");
        image.src = item.image;
        image.alt = item.name || "Product image";
        card.append(image);
      }

      const body = document.createElement("div");
      body.className = "product-card-content";

      const status = document.createElement("span");
      status.className = "status";

      status.textContent =
        item.status === "coming_soon"
          ? "COMING SOON"
          : (item.type || "PRODUCT").toUpperCase();

      const heading = document.createElement("h3");
      heading.textContent = item.name || "";

      const description = document.createElement("p");
      description.textContent = item.short_perception || "";

      body.append(status, heading, description);

      const link = document.createElement("a");
      link.className = "pill";

      link.textContent =
        item.status === "published"
          ? (item.button_text || "Explore")
          : "Coming soon";

      link.href = "/item.html?id=" + encodeURIComponent(item.id);

      body.append(link);
      card.append(body);
      productList.append(card);
    });

    // FOOTER
    $("#year").textContent = new Date().getFullYear();

    const footerResponse = await fetch("/api/footer");

    if (footerResponse.ok) {
      const footerData = await footerResponse.json();
      const footerLinks = $("#footerLinks");

      footerLinks.innerHTML = "";

      (footerData.sections || []).forEach(section => {
        const title = document.createElement("strong");
        title.textContent = section.title;

        footerLinks.append(title);

        (footerData.items || [])
          .filter(item => item.section_id === section.id)
          .forEach(item => {
            const link = document.createElement("a");

            link.textContent = item.name;
            link.href = "#";

            link.addEventListener("click", event => {
              event.preventDefault();
              openInfo(item.name, item.description);
            });

            footerLinks.append(link);
          });
      });
    }

  } catch (error) {
    console.error("HORIZON website error:", error);
  }
}

// INFORMATION MODAL
function openInfo(title, body) {
  $("#modalTitle").textContent = title || "";
  $("#modalBody").textContent = body || "";
  $("#modal").classList.add("open");
}

// MISSION AND VISION DETAILS
document.querySelectorAll("[data-modal]").forEach(button => {
  button.addEventListener("click", async () => {
    const key = button.dataset.modal === "mission"
      ? "mission"
      : "vision";

    try {
      const response = await fetch("/api/site");
      const data = await response.json();
      const content = data.content || {};

      openInfo(
        content[key + "_heading"],
        content[key + "_description"]
      );

    } catch (error) {
      console.error(error);
    }
  });
});

// CLOSE MODAL
$("#closeModal").addEventListener("click", () => {
  $("#modal").classList.remove("open");
});

$("#modal").addEventListener("click", event => {
  if (event.target.id === "modal") {
    $("#modal").classList.remove("open");
  }
});

// MOBILE MENU
$("#menuBtn").addEventListener("click", () => {
  $("#nav").classList.toggle("show");
});

// CLOSE MOBILE MENU AFTER NAVIGATION
document.querySelectorAll("#nav a").forEach(link => {
  link.addEventListener("click", () => {
    $("#nav").classList.remove("show");
  });
});

// BACKGROUND PARALLAX EFFECT
window.addEventListener("scroll", () => {
  const scrollPosition = window.scrollY;

  const heroImage = $("#heroImage");
  const supportImage = $("#supportImage");

  if (heroImage) {
    heroImage.style.transform =
      `translateY(${scrollPosition * 0.22}px) scale(1.08)`;
  }

  if (supportImage) {
    const support = $("#support");

    supportImage.style.transform =
      `translateY(${(scrollPosition - support.offsetTop) * 0.12}px) scale(1.06)`;
  }

}, { passive: true });

// LOAD WEBSITE
getSite();
