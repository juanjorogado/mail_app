// Sending emails is performed via Gmail API through the main process
// Using window.api exposed by preload.js (secure context isolation)

let composeMode = "new";
let originalEmailData = null;

// Listen for compose data from main process
window.api.openCompose = (options) => {
  const { mode = "new", emailData = null, accountId = null } = options;
  composeMode = mode;
  originalEmailData = emailData;
  applyComposeMode(mode, emailData, accountId);
};

function applyComposeMode(mode, emailData, preselectedAccountId) {
  const titleElement = document.getElementById("composeTitle");
  const toInput = document.getElementById("to");
  const subjectInput = document.getElementById("subject");
  const bodyInput = document.getElementById("body");
  const replyToGroup = document.getElementById("replyToGroup");
  const originalSubjectGroup = document.getElementById("originalSubjectGroup");
  const replyToField = document.getElementById("replyTo");
  const originalSubjectField = document.getElementById("originalSubject");

  if (mode === "reply") {
    titleElement.textContent = "Reply to Email";
    replyToGroup.style.display = "block";
    originalSubjectGroup.style.display = "block";

    if (emailData) {
      toInput.value = emailData.from || "";
      subjectInput.value = emailData.subject?.startsWith("Re: ")
        ? emailData.subject
        : `Re: ${emailData.subject || ""}`;
      replyToField.value = emailData.from || "";
      originalSubjectField.value = emailData.subject || "";

      const quote = `
---
On ${new Date(emailData.date).toLocaleString()}, ${emailData.from} wrote:
${emailData.snippet || ""}
`;
      bodyInput.value = quote;
    }

    if (preselectedAccountId) {
      const accountSelect = document.getElementById("accountSelect");
      accountSelect.value = preselectedAccountId;
    }
  } else if (mode === "forward") {
    titleElement.textContent = "Forward Email";
    originalSubjectGroup.style.display = "block";

    if (emailData) {
      subjectInput.value = emailData.subject?.startsWith("Fwd: ")
        ? emailData.subject
        : `Fwd: ${emailData.subject || ""}`;
      originalSubjectField.value = emailData.subject || "";

      const quote = `
---
Forwarded message ---
From: ${emailData.from}
Date: ${new Date(emailData.date).toLocaleString()}
Subject: ${emailData.subject}
To: ${emailData.to || "me"}

${emailData.snippet || ""}
`;
      bodyInput.value = quote;
    }

    if (preselectedAccountId) {
      const accountSelect = document.getElementById("accountSelect");
      accountSelect.value = preselectedAccountId;
    }
  } else {
    titleElement.textContent = "Compose Email";
  }
}

// Close Compose Window
document.getElementById("closeCompose").addEventListener("click", () => {
  window.close();
});

// Send Email via IPC to be handled with Gmail API in main process
document.getElementById("composeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const toInput = document.getElementById("to");
  const subjectInput = document.getElementById("subject");
  const bodyInput = document.getElementById("body");
  const accountSelect = document.getElementById("accountSelect");
  const sendButton = document.getElementById("sendButton");

  // Get values
  const to = toInput.value.trim();
  const subject = subjectInput.value.trim();
  const body = bodyInput.value.trim();
  const accountId = accountSelect.value || null;

  // Validate in frontend
  const payload = { accountId, to, subject, body };
  const validation = window.validation.validateEmailPayload(payload);

  if (!validation.isValid) {
    // Mostrar errores de validación
    validation.errors.forEach((error) => {
      window.showNotification(error, "error", 4000);
    });
    return;
  }

  // Sanitize content
  const sanitizedPayload = {
    accountId,
    to: to,
    subject: window.validation.sanitizeText(subject),
    body: window.validation.sanitizeText(body),
  };

  // Disable button and show loading
  sendButton.disabled = true;
  sendButton.textContent = "Sending...";
  const loadingNotification = window.showNotification(
    "Sending email...",
    "info",
    0,
  );

  try {
    const result = await window.api.sendEmail(sanitizedPayload);
    loadingNotification.remove();
    window.showNotification("Email sent successfully!", "success", 3000);
    setTimeout(() => {
      window.close();
    }, 1000);
  } catch (error) {
    loadingNotification.remove();
    console.error("Error sending email:", error);

    // More specific error message
    let errorMessage = "Failed to send email. Please try again.";
    if (error.message) {
      if (error.message.includes("Account not found")) {
        errorMessage = "Account not found. Please select a valid account.";
      } else if (
        error.message.includes("token") ||
        error.message.includes("auth")
      ) {
        errorMessage =
          "Authentication error. Please re-authenticate your account.";
      } else if (
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else {
        errorMessage = error.message;
      }
    }

    window.showNotification(errorMessage, "error", 5000);
    sendButton.disabled = false;
    sendButton.textContent = "Send";
  }
});

// Populate account dropdown from available accounts at startup
async function loadAccountsIntoDropdown() {
  try {
    const response = await window.api.listAccounts();
    const accounts = response?.data || [];
    const select = document.getElementById("accountSelect");
    select.innerHTML = "";

    if (accounts.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No accounts available";
      option.disabled = true;
      select.appendChild(option);
      return;
    }

    accounts.forEach((a) => {
      const option = document.createElement("option");
      option.value = a.email || a.id || "";
      option.textContent = a.email || a.id || "Account";
      if (a.email) {
        option.textContent = `${a.alias || a.provider || "Gmail"} (${a.email})`;
      }
      select.appendChild(option);
    });

    // Select first account by default
    if (accounts.length > 0 && select.options.length > 0) {
      select.selectedIndex = 0;
    }
  } catch (error) {
    console.error("Error loading accounts:", error);
    window.showNotification(
      "Error loading accounts. Please restart the app.",
      "error",
      5000,
    );
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadAccountsIntoDropdown();
});
