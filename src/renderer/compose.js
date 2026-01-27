// Sending emails is performed via Gmail API through the main process
// Using window.api exposed by preload.js (secure context isolation)

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

  // Obtener valores
  const to = toInput.value.trim();
  const subject = subjectInput.value.trim();
  const body = bodyInput.value.trim();
  const accountId = accountSelect.value || null;

  // Validar en frontend
  const payload = { accountId, to, subject, body };
  const validation = window.validation.validateEmailPayload(payload);

  if (!validation.isValid) {
    // Mostrar errores de validación
    validation.errors.forEach(error => {
      window.showNotification(error, 'error', 4000);
    });
    return;
  }

  // Sanitizar contenido
  const sanitizedPayload = {
    accountId,
    to: to, // Ya validado como email válido
    subject: window.validation.sanitizeText(subject),
    body: window.validation.sanitizeText(body)
  };

  // Deshabilitar botón y mostrar loading
  sendButton.disabled = true;
  sendButton.textContent = 'Sending...';
  const loadingNotification = window.showNotification('Sending email...', 'info', 0);

  try {
    const result = await window.api.sendEmail(sanitizedPayload);
    loadingNotification.remove();
    window.showNotification('Email sent successfully!', 'success', 3000);
    setTimeout(() => {
      window.close();
    }, 1000);
  } catch (error) {
    loadingNotification.remove();
    console.error("Error sending email:", error);
    
    // Mensaje de error más específico
    let errorMessage = 'Failed to send email. Please try again.';
    if (error.message) {
      if (error.message.includes('Account not found')) {
        errorMessage = 'Account not found. Please select a valid account.';
      } else if (error.message.includes('token') || error.message.includes('auth')) {
        errorMessage = 'Authentication error. Please re-authenticate your account.';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = error.message;
      }
    }
    
    window.showNotification(errorMessage, 'error', 5000);
    sendButton.disabled = false;
    sendButton.textContent = 'Send';
  }
});

// Populate account dropdown from available accounts at startup
async function loadAccountsIntoDropdown() {
  try {
    const accounts = await window.api.listAccounts();
    const select = document.getElementById("accountSelect");
    select.innerHTML = "";
    
    if (accounts.length === 0) {
      const option = document.createElement("option");
      option.value = '';
      option.text = 'No accounts available';
      option.disabled = true;
      select.appendChild(option);
      return;
    }
    
    accounts.forEach((a) => {
      const option = document.createElement("option");
      option.value = a.email || a.id || '';
      option.text = a.email || a.id || 'Account';
      select.appendChild(option);
    });
  } catch (e) {
    console.error("Failed to load accounts for compose:", e);
    window.showNotification('Failed to load accounts. Please try again.', 'error', 4000);
  }
}

// Listen for account id from main via IPC (optional async flow)
if (typeof window.api.onSetComposeAccount === 'function') {
  window.api.onSetComposeAccount((acct) => {
    // if provided, set dropdown to this account
    const sel = document.getElementById("accountSelect");
    if (acct && sel) {
      sel.value = acct;
    }
  });
}

document.addEventListener("DOMContentLoaded", loadAccountsIntoDropdown);
