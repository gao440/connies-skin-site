const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const header = document.querySelector("[data-header]");

if (navToggle && nav) {
  const closeNav = () => {
    navToggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
  };

  navToggle.addEventListener("click", () => {
    const nextOpen = navToggle.getAttribute("aria-expanded") !== "true";
    navToggle.setAttribute("aria-expanded", String(nextOpen));
    nav.classList.toggle("is-open", nextOpen);
    document.body.classList.toggle("nav-open", nextOpen);
  });

  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNav();
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
    waitlistSubmit.disabled = true;
    waitlistSubmit.textContent = "Joining…";
    waitlistStatus.dataset.state = "pending";
    waitlistStatus.textContent = "Adding you to the waitlist…";

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
      waitlistStatus.textContent = "You’re on the list. We’ll be in touch when beta spots open.";
    } catch {
      waitlistStatus.dataset.state = "error";
      waitlistStatus.textContent = "We couldn’t add you right now. Please try again in a moment.";
    } finally {
      waitlistSubmit.disabled = false;
      waitlistSubmit.textContent = "Join the waitlist";
    }
  });
}
