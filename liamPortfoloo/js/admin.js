document.addEventListener("DOMContentLoaded", () => {
  const apiUrl = "../backend/admin-api.php";
  const loginPanel = document.getElementById("loginPanel");
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("loginForm");
  const loginStatus = document.getElementById("loginStatus");
  const dashboardStatus = document.getElementById("dashboardStatus");
  const logoutButton = document.getElementById("logoutButton");
  let csrfToken = "";

  async function request(resource, options = {}) {
    const url = new URL(apiUrl, window.location.href);
    url.searchParams.set("resource", resource);
    if (options.id !== undefined) {
      url.searchParams.set("id", String(options.id));
    }

    const headers = { Accept: "application/json", ...options.headers };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (options.authenticated) {
      headers["X-CSRF-Token"] = csrfToken;
    }

    let response;
    try {
      response = await fetch(url, {
        method: options.method || "GET",
        credentials: "same-origin",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      throw new Error("Cannot reach the admin service. Run the site through PHP/Apache and check the backend.");
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The admin service did not return JSON. Check that PHP is enabled for this site.");
    }

    if (!response.ok) {
      if (response.status === 401 && resource !== "session") {
        showLogin("Your admin session expired. Please sign in again.");
      }
      throw new Error(result.message || "The request could not be completed.");
    }
    return result;
  }

  function showLogin(message = "") {
    csrfToken = "";
    dashboard.hidden = true;
    loginPanel.hidden = false;
    loginStatus.textContent = message;
    loginStatus.className = "admin-notice is-error";
  }

  function showDashboard(token) {
    csrfToken = token;
    loginPanel.hidden = true;
    dashboard.hidden = false;
    loadDashboard();
  }

  function setStatus(element, message, isError = false) {
    element.textContent = message;
    element.className = `admin-notice${message ? (isError ? " is-error" : " is-success") : ""}`;
  }

  function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
    return cell;
  }

  function makeButton(text, action, id, className = "ghost-btn small") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.dataset.action = action;
    button.dataset.id = String(id);
    return button;
  }

  function renderMessages(records) {
    const table = document.getElementById("messagesTable");
    table.replaceChildren();
    if (records.length === 0) {
      const row = table.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.textContent = "No contact messages yet.";
      return;
    }

    for (const record of records) {
      const row = table.insertRow();
      const date = new Date(record.created_at.replace(" ", "T"));
      addCell(row, Number.isNaN(date.getTime()) ? record.created_at : date.toLocaleString());
      addCell(row, record.name);

      const emailCell = row.insertCell();
      const email = document.createElement("a");
      email.href = `mailto:${record.email}`;
      email.textContent = record.email;
      emailCell.append(email);

      const contentCell = row.insertCell();
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = record.subject;
      const message = document.createElement("p");
      message.className = "message-copy";
      message.textContent = record.message;
      details.append(summary, message);
      contentCell.append(details);
      row.insertCell().append(makeButton("Delete", "delete-message", record.id, "danger-btn small"));
    }
  }

  function createRecordCard(title, subtitle, description, id, type, metadata = "") {
    const card = document.createElement("article");
    card.className = "record-card";
    const heading = document.createElement("div");
    heading.className = "record-card-heading";
    const text = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = title;
    const sub = document.createElement("p");
    sub.className = "record-meta";
    sub.textContent = [subtitle, metadata].filter(Boolean).join(" · ");
    text.append(name, sub);

    const actions = document.createElement("div");
    actions.className = "record-actions";
    actions.append(
      makeButton("Edit", `edit-${type}`, id),
      makeButton("Delete", `delete-${type}`, id, "danger-btn small"),
    );
    heading.append(text, actions);
    card.append(heading);
    if (description) {
      const copy = document.createElement("p");
      copy.textContent = description;
      card.append(copy);
    }
    return card;
  }

  function renderProjects(records) {
    const list = document.getElementById("projectsList");
    list.replaceChildren();
    if (records.length === 0) {
      list.textContent = "No projects yet. Add one above to show it on the public portfolio.";
      return;
    }
    for (const record of records) {
      const card = createRecordCard(record.title, record.project_url || "Portfolio project", record.description, record.id, "project");
      card.dataset.record = JSON.stringify(record);
      list.append(card);
    }
  }

  function renderEducation(records) {
    const list = document.getElementById("educationList");
    list.replaceChildren();
    if (records.length === 0) {
      list.textContent = "No education records yet. Add one above to show it on the public portfolio.";
      return;
    }
    for (const record of records) {
      const years = [record.start_year, record.end_year].filter(Boolean).join(" – ");
      const card = createRecordCard(record.institution, record.qualification, record.description || "", record.id, "education", years);
      card.dataset.record = JSON.stringify(record);
      list.append(card);
    }
  }

  function renderSkills(records) {
    const list = document.getElementById("skillsList");
    list.replaceChildren();
    if (records.length === 0) {
      list.textContent = "No skills yet. Add one above to show it on the public portfolio.";
      return;
    }
    for (const record of records) {
      const card = createRecordCard(record.name, record.category, record.description, record.id, "skill");
      card.dataset.record = JSON.stringify(record);
      list.append(card);
    }
  }

  async function loadDashboard() {
    setStatus(dashboardStatus, "Loading portfolio data…");
    try {
      const [messages, projects, education, skills] = await Promise.all([
        request("messages"),
        request("projects"),
        request("education"),
        request("skills"),
      ]);
      renderMessages(messages.records);
      renderProjects(projects.records);
      renderEducation(education.records);
      renderSkills(skills.records);
      document.getElementById("messageCount").textContent = String(messages.records.length);
      document.getElementById("projectCount").textContent = String(projects.records.length);
      document.getElementById("educationCount").textContent = String(education.records.length);
      document.getElementById("skillCount").textContent = String(skills.records.length);
      setStatus(dashboardStatus, "");
    } catch (error) {
      setStatus(dashboardStatus, error.message, true);
    }
  }

  async function saveRecord(form, resource) {
    const formData = new FormData(form);
    const id = formData.get("id");
    const body = Object.fromEntries(formData.entries());
    const editing = Boolean(id);
    if (resource === "education") {
      body.start_year ||= "";
      body.end_year ||= "";
    }
    delete body.id;
    const result = await request(resource, {
      method: editing ? "PUT" : "POST",
      authenticated: true,
      body: editing ? { ...body, id: Number(id) } : body,
    });
    form.reset();
    form.elements.namedItem("id").value = "";
    setStatus(dashboardStatus, result.message);
    await loadDashboard();
  }

  function fillForm(form, record) {
    for (const [key, value] of Object.entries(record)) {
      const input = form.elements.namedItem(key);
      if (input) {
        input.value = value ?? "";
      }
    }
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(loginStatus, "Signing in…");
    try {
      const result = await request("session", {
        method: "POST",
        body: Object.fromEntries(new FormData(loginForm).entries()),
      });
      loginForm.reset();
      showDashboard(result.csrfToken);
    } catch (error) {
      setStatus(loginStatus, error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await request("session", { method: "DELETE", authenticated: true });
      showLogin("You have signed out.");
    } catch (error) {
      setStatus(dashboardStatus, error.message, true);
    }
  });

  document.getElementById("refreshButton").addEventListener("click", loadDashboard);

  for (const [formId, resource] of [["projectForm", "projects"], ["educationForm", "education"], ["skillForm", "skills"]]) {
    document.getElementById(formId).addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await saveRecord(event.currentTarget, resource);
      } catch (error) {
        setStatus(dashboardStatus, error.message, true);
      }
    });
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action], button[data-reset-form]");
    if (!button) {
      return;
    }

    if (button.dataset.resetForm) {
      const form = document.getElementById(button.dataset.resetForm);
      form.reset();
      form.elements.namedItem("id").value = "";
      return;
    }

    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    if (!Number.isInteger(id) || id < 1) {
      return;
    }

    const card = button.closest(".record-card");
    if (action.startsWith("edit-")) {
      const type = action.slice("edit-".length);
      fillForm(document.getElementById(`${type}Form`), JSON.parse(card.dataset.record));
      return;
    }

    if (!window.confirm("Delete this record? This cannot be undone.")) {
      return;
    }
    const recordType = action.slice("delete-".length);
    const resource =
      action === "delete-message"
        ? "messages"
        : recordType === "education"
          ? "education"
          : recordType === "skill"
            ? "skills"
            : "projects";
    try {
      const result = await request(resource, { method: "DELETE", authenticated: true, id });
      setStatus(dashboardStatus, result.message);
      await loadDashboard();
    } catch (error) {
      setStatus(dashboardStatus, error.message, true);
    }
  });

  request("session")
    .then((result) => {
      if (result.authenticated) {
        showDashboard(result.csrfToken);
      } else {
        showLogin();
      }
    })
    .catch((error) => showLogin(error.message));
});
