const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const header = document.querySelector("[data-header]");

if (navToggle && nav) {
  const navLabel = navToggle.querySelector("[data-nav-label]");
  const mobileLayout = window.matchMedia("(max-width: 760px)");
  const setNavOpen = (open) => {
    navToggle.setAttribute("aria-expanded", String(open));
    if (navLabel) navLabel.textContent = open ? "Close navigation" : "Open navigation";
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
  };
  const closeNav = () => setNavOpen(false);

  navToggle.addEventListener("click", () => {
    setNavOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));
  mobileLayout.addEventListener("change", closeNav);
  window.addEventListener("keydown", (event) => {
    if (navToggle.getAttribute("aria-expanded") !== "true") return;
    if (event.key === "Escape") {
      closeNav();
      navToggle.focus();
    }
    if (event.key === "Tab" && mobileLayout.matches) {
      const lastLink = nav.querySelector("a:last-child");
      if (event.shiftKey && document.activeElement === navToggle) {
        event.preventDefault();
        lastLink?.focus();
      } else if (!event.shiftKey && document.activeElement === lastLink) {
        event.preventDefault();
        navToggle.focus();
      }
    }
  });
}

if (header && !header.classList.contains("legal-header")) {
  const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 20);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

const waitlistForm = document.querySelector("[data-waitlist-form]");
const waitlistStatus = document.querySelector("[data-waitlist-status]");
const waitlistSubmit = document.querySelector("[data-waitlist-submit]");

if (waitlistForm && waitlistStatus && waitlistSubmit && window.fetch) {
  waitlistForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (waitlistSubmit.disabled) return;
    waitlistSubmit.disabled = true;
    waitlistSubmit.textContent = "Joining…";
    waitlistStatus.dataset.state = "pending";
    waitlistStatus.textContent = "Saving your email…";

    try {
      const response = await fetch(waitlistForm.action, {
        method: "POST",
        body: new FormData(waitlistForm),
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) throw new Error("Waitlist submission failed");

      waitlistForm.reset();
      waitlistStatus.dataset.state = "success";
      waitlistStatus.textContent = "You’re on the list. We’ll email you when beta spots open.";
    } catch {
      waitlistStatus.dataset.state = "error";
      waitlistStatus.textContent = "Your email didn’t go through. Please try again in a moment.";
    } finally {
      waitlistSubmit.disabled = false;
      waitlistSubmit.textContent = "Join the waitlist";
    }
  });
}
