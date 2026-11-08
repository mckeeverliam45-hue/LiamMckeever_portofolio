document.addEventListener("DOMContentLoaded", async () => {
  const navToggle = document.querySelector(".nav-toggle");
  const mainNavigation = document.getElementById("mainNavigation");

  function setNavigationOpen(isOpen) {
    if (!navToggle || !mainNavigation) {
      return;
    }
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    mainNavigation.classList.toggle("is-open", isOpen);
  }

  navToggle?.addEventListener("click", () => {
    setNavigationOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });

  mainNavigation?.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      setNavigationOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navToggle?.getAttribute("aria-expanded") === "true") {
      setNavigationOpen(false);
      navToggle.focus();
    }
  });

  window.matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
    if (event.matches) {
      setNavigationOpen(false);
    }
  });

  const revealObserver =
    "IntersectionObserver" in window &&
    window.matchMedia("(prefers-reduced-motion: no-preference)").matches
      ? new IntersectionObserver(
          (entries, observer) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
              }
            }
          },
          { threshold: 0.12, rootMargin: "0px 0px -35px 0px" },
        )
      : null;

  function observeReveals() {
    if (!revealObserver) {
      return;
    }

    const revealSelectors = [
      ".section-heading",
      ".about-text",
      ".personal-details",
      ".timeline-item",
      ".experience-grid .card",
      ".skills-grid .skill-box",
      ".projects-grid .project-card",
      ".contact-heading",
      ".contact-info",
      ".contact-form-container",
      ".focus-band-inner",
    ];
    const elements = document.querySelectorAll(revealSelectors.join(","));
    elements.forEach((element, index) => {
      if (element.classList.contains("reveal")) {
        return;
      }
      element.classList.add("reveal");
      if (element.matches(".experience-grid .card, .skills-grid .skill-box, .projects-grid .project-card")) {
        const siblingIndex = [...element.parentElement.children].indexOf(element);
        element.style.setProperty("--reveal-delay", `${Math.min(siblingIndex * 90, 360)}ms`);
      }
      revealObserver.observe(element);
    });
  }

  if (revealObserver) {
    document.documentElement.classList.add("motion-ready");
    observeReveals();
  }

  const backToTop = document.querySelector(".back-to-top");
  const progressBar = document.querySelector(".scroll-progress span");
  const header = document.querySelector(".header");

  function updateScrollEffects() {
    const scrollY = window.scrollY;
    if (progressBar) {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0 ? scrollY / scrollableHeight : 0;
      progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
    }
    header?.classList.toggle("is-scrolled", scrollY > 24);
    backToTop?.classList.toggle("is-visible", scrollY > window.innerHeight * 0.75);
  }

  let scrollUpdateScheduled = false;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollUpdateScheduled) {
        return;
      }
      scrollUpdateScheduled = true;
      window.requestAnimationFrame(() => {
        updateScrollEffects();
        scrollUpdateScheduled = false;
      });
    },
    { passive: true },
  );
  updateScrollEffects();

  const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter((section) => section instanceof HTMLElement);
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          for (const link of navLinks) {
            if (link.getAttribute("href") === `#${entry.target.id}`) {
              link.setAttribute("aria-current", "location");
            } else {
              link.removeAttribute("aria-current");
            }
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((section) => sectionObserver.observe(section));
  }

  function normalizeProjectUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return `${url.origin}${url.pathname.replace(/\/+$/, "")}${url.search}`;
    } catch {
      return value;
    }
  }

  try {
    const response = await fetch("../backend/admin-api.php?resource=portfolio", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error("Portfolio content could not be loaded.");
    }
    const data = await response.json();

    if (Array.isArray(data.projects) && data.projects.length > 0) {
      const grid = document.querySelector("#projects .projects-grid");
      const persistentProjects = [...grid.querySelectorAll(".persistent-project")];
      const persistentUrls = new Set(
        persistentProjects.map((card) => normalizeProjectUrl(card.dataset.projectUrl)).filter(Boolean),
      );
      grid.replaceChildren(...persistentProjects);
      for (const project of data.projects) {
        if (
          typeof project.project_url === "string" &&
          persistentUrls.has(normalizeProjectUrl(project.project_url))
        ) {
          continue;
        }
        const card = document.createElement("article");
        card.className = "project-card";
        const label = document.createElement("div");
        label.className = "project-number";
        label.textContent = "Featured project";
        const title = document.createElement("h3");
        title.textContent = project.title;
        const description = document.createElement("p");
        description.textContent = project.description;
        card.append(label, title, description);
        if (typeof project.image === "string" && project.image) {
          const image = document.createElement("img");
          image.src = project.image;
          image.alt = project.title;
          image.loading = "lazy";
          card.prepend(image);
        }
        if (typeof project.project_url === "string" && project.project_url) {
          try {
            const url = new URL(project.project_url, window.location.href);
            if (url.protocol === "https:" || url.protocol === "http:") {
              const link = document.createElement("a");
              link.href = url.href;
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              link.textContent = "View project";
              card.append(link);
            }
          } catch {
            // Ignore malformed stored URLs while keeping the rest of the portfolio available.
          }
        }
        grid.append(card);
      }
    }

    if (Array.isArray(data.education) && data.education.length > 0) {
      const timeline = document.querySelector("#education .timeline");
      timeline.replaceChildren();
      for (const record of data.education) {
        const item = document.createElement("article");
        item.className = "timeline-item";
        const date = document.createElement("div");
        date.className = "timeline-date";
        date.textContent = [record.start_year, record.end_year].filter(Boolean).join(" – ");
        const content = document.createElement("div");
        content.className = "timeline-content";
        const qualification = document.createElement("h3");
        qualification.textContent = record.qualification;
        const institution = document.createElement("h4");
        institution.textContent = record.institution;
        content.append(qualification, institution);
        if (record.description) {
          const description = document.createElement("p");
          description.textContent = record.description;
          content.append(description);
        }
        item.append(date, content);
        timeline.append(item);
      }
    }

    if (Array.isArray(data.skills) && data.skills.length > 0) {
      const skillsGrid = document.querySelector("#skills .skills-grid");
      skillsGrid.replaceChildren();
      for (const skill of data.skills) {
        const card = document.createElement("article");
        card.className = "skill-box";
        const category = document.createElement("span");
        category.className = "skill-category";
        category.textContent = skill.category;
        const title = document.createElement("h3");
        title.textContent = skill.name;
        const description = document.createElement("p");
        description.textContent = skill.description;
        card.append(category, title, description);
        skillsGrid.append(card);
      }
    }
    observeReveals();
  } catch (error) {
    console.error(error);
    observeReveals();
  }
});
