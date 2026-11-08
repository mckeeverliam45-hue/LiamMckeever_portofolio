document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");
  const year = document.getElementById("currentYear");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement)) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    if (!(submitButton instanceof HTMLButtonElement)) {
      return;
    }

    submitButton.disabled = true;
    status.className = "";
    status.textContent = "Sending your message...";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      const result = await response.json();
      const message =
        result && typeof result.message === "string" ? result.message : "";

      if (!response.ok) {
        throw new Error(message || "Your message could not be sent. Please try again.");
      }

      if (!message) {
        throw new Error("The server returned an invalid response. Please try again later.");
      }

      status.className = "is-success";
      status.textContent = message;
      form.reset();
    } catch (error) {
      status.className = "is-error";
      status.textContent =
        error instanceof Error
          ? error.message
          : "A network error occurred. Please try again.";
    } finally {
      submitButton.disabled = false;
    }
  });
});
