// IPC is accessed via window.api provided by preload.js

// Función para mostrar notificaciones
window.showNotification = function(message, type = 'info', duration = 3000) {
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 4px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 400px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  `;
  
  // Establecer color según tipo
  const colors = {
    'success': '#27ae60',
    'error': '#e74c3c',
    'warning': '#f39c12',
    'info': '#3498db'
  };
  
  notification.style.backgroundColor = colors[type] || colors['info'];
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto-remover después del tiempo especificado
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, duration);
};

// Estilos para las animaciones
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Estado global
let currentAccountId = null;
let currentFolder = "INBOX";

// Compose Button: delegate to main process to open a proper window
// Conectar botón de agregar cuenta desde onboarding
const connectButton = document.getElementById("connect-account-button");
if (connectButton) {
  connectButton.addEventListener("click", async () => {
    const button = connectButton;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Adding...";
    
    try {
      const result = await window.api.addGmailAccount();
      if (result && result.success) {
        window.showNotification('Gmail account added successfully!', 'success', 3000);
        await loadAccounts();
      } else {
        const errorMsg = result?.error || 'Failed to add Gmail account';
        window.showNotification(errorMsg, 'error', 5000);
      }
    } catch (error) {
      console.error("Error adding Gmail account:", error);
      window.showNotification('Failed to add Gmail account. Please try again.', 'error', 5000);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
}

const composeButton = document.getElementById("composeButton");
if (composeButton) {
  composeButton.addEventListener("click", () => {
    window.api.openCompose();
  });
}

document.getElementById("addGmail").addEventListener("click", async () => {
  const button = document.getElementById("addGmail");
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Adding...";
  
  try {
    const result = await window.api.addGmailAccount();
    if (result && result.success) {
      window.showNotification('Gmail account added successfully!', 'success', 3000);
      await loadAccounts();
    } else {
      const errorMsg = result?.error || 'Failed to add Gmail account';
      window.showNotification(errorMsg, 'error', 5000);
    }
  } catch (error) {
    console.error("Error adding Gmail account:", error);
    window.showNotification('Failed to add Gmail account. Please try again.', 'error', 5000);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});

// Load and display Gmail accounts and fetch associated data via API exposed by preload
async function loadAccounts() {
  const accounts = await window.api.listAccounts();
  const accDiv = document.getElementById("accounts");
  const onboarding = document.getElementById("onboarding-screen");
  const mainApp = document.getElementById("main-app-screen");
  
  accDiv.innerHTML = "";
  
  if (accounts.length === 0) {
    const noAccounts = document.createElement("div");
    noAccounts.textContent = "No accounts";
    noAccounts.style.cssText = "color: #95a5a6; font-style: italic; padding: 10px;";
    accDiv.appendChild(noAccounts);
    
    // Mostrar onboarding, ocultar main app
    if (onboarding) onboarding.classList.remove("hidden");
    if (mainApp) mainApp.classList.add("hidden");
    return;
  }
  
  // Mostrar main app, ocultar onboarding
  if (onboarding) onboarding.classList.add("hidden");
  if (mainApp) mainApp.classList.remove("hidden");
  
  accounts.forEach((a) => {
    const accountContainer = document.createElement("div");
    accountContainer.style.cssText = "margin-bottom: 10px; display: flex; gap: 5px;";
    
    const btn = document.createElement("button");
    btn.textContent = a.email || a.id || "Account";
    btn.style.cssText = "flex: 1; display: block; width: 100%;";
    btn.addEventListener("click", async () => {
      const accountId = a.email || a.id;
      currentAccountId = accountId;
      // Actualizar el nombre de la cuenta en el sign-out section
      const currentAccountEl = document.getElementById("currentAccount");
      if (currentAccountEl) {
        currentAccountEl.textContent = a.email || a.id || "Account";
      }
      await loadAccountData(accountId);
    });
    
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "×";
    deleteBtn.style.cssText = "background-color: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 18px;";
    deleteBtn.title = "Delete account";
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const accountId = a.email || a.id;
      if (confirm(`Are you sure you want to remove account "${accountId}"?`)) {
        await removeAccount(accountId);
      }
    });
    
    accountContainer.appendChild(btn);
    accountContainer.appendChild(deleteBtn);
    accDiv.appendChild(accountContainer);
  });
  
  // Cargar automáticamente la primera cuenta
  if (accounts.length > 0) {
    const firstAccount = accounts[0];
    const accountId = firstAccount.email || firstAccount.id;
    currentAccountId = accountId;
    const currentAccountEl = document.getElementById("currentAccount");
    if (currentAccountEl) {
      currentAccountEl.textContent = firstAccount.email || firstAccount.id || "Account";
    }
    await loadAccountData(accountId);
  }
}

async function removeAccount(accountId) {
  try {
    const result = await window.api.removeAccount(accountId);
    if (result && result.success) {
      window.showNotification('Account removed successfully', 'success', 3000);
      if (currentAccountId === accountId) {
        currentAccountId = null;
        document.getElementById("emailList").innerHTML = "";
      }
      await loadAccounts();
    } else {
      const errorMsg = result?.error || 'Failed to remove account';
      window.showNotification(errorMsg, 'error', 4000);
    }
  } catch (error) {
    console.error("Error removing account:", error);
    window.showNotification('Failed to remove account. Please try again.', 'error', 4000);
  }
}

async function loadAccountData(accountId) {
  if (!accountId) return;
  
  try {
    // Cargar emails según la carpeta actual
    const emailResult = await window.api.fetchEmails(accountId, currentFolder);
    if (emailResult && emailResult.success) {
      renderEmails(emailResult.data, accountId);
    } else {
      const errorMsg = emailResult?.error || 'Failed to load emails';
      const errorType = emailResult?.errorType || 'unknown';
      
      if (errorType === 'authentication') {
        window.showNotification('Authentication error. Please re-authenticate your account.', 'error', 5000);
      } else if (errorType === 'network') {
        window.showNotification('Network error. Please check your connection.', 'error', 5000);
      } else {
        window.showNotification(errorMsg, 'error', 4000);
      }
      renderEmails([], accountId);
    }
    
    // Cargar calendario
    const calendarResult = await window.api.fetchCalendar(accountId);
    if (calendarResult && calendarResult.success) {
      renderCalendar(calendarResult.data);
    } else {
      renderCalendar([]);
    }
  } catch (error) {
    console.error("Error loading account data:", error);
    window.showNotification('Failed to load account data. Please try again.', 'error', 4000);
    renderEmails([], accountId);
    renderCalendar([]);
  }
}

function renderEmails(emails) {
  const messageList = document.getElementById("message-list");
  if (!messageList) {
    console.error("message-list element not found");
    return;
  }
  
  messageList.innerHTML = "";
  
  if (!emails || emails.length === 0) {
    const noEmails = document.createElement("div");
    noEmails.style.cssText = "padding: 20px; text-align: center; color: #95a5a6;";
    noEmails.textContent = "No emails found";
    messageList.appendChild(noEmails);
    return;
  }
  
  emails.forEach((email, index) => {
    const item = document.createElement("div");
    item.className = "message-item";
    item.style.cssText = "padding: 12px; border-bottom: 1px solid #ecf0f1; hover:bg-gray-50; cursor: pointer;";
    item.setAttribute("data-message-id", email.id || index);
    
    const sender = email.from || "Unknown Sender";
    const subject = email.subject || "(No subject)";
    const snippet = email.snippet || "";
    const date = email.date ? new Date(email.date).toLocaleDateString('es-ES') : "";
    
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
        <span style="font-weight: 600; color: #2c3e50;">${sender}</span>
        <span style="font-size: 12px; color: #7f8c8d;">${date}</span>
      </div>
      <p style="color: #34495e; font-size: 14px; margin: 3px 0; font-weight: 500;">${subject}</p>
      <p style="color: #95a5a6; font-size: 12px; margin: 3px 0;">${snippet}</p>
    `;
    
    item.addEventListener("click", () => {
      // Aquí puedes manejar la selección del mensaje
      console.log("Selected email:", email);
    });
    
    messageList.appendChild(item);
  });
  
  // Actualizar contadores de mailbox
  updateMailboxCounts(emails);
}

function renderCalendar(events) {
  // Calendar rendering is not yet implemented in the new UI
  // This function is a placeholder
  if (!events || events.length === 0) {
    return;
  }
  console.log('Calendar events:', events);
}

// Setup menu navigation
function setupMenuNavigation() {
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item) => {
    item.addEventListener("click", async () => {
      // Remover active de todos
      menuItems.forEach((mi) => mi.classList.remove("active"));
      // Agregar active al seleccionado
      item.classList.add("active");

      // Actualizar carpeta actual - map display names back to folder keys
      const displayToFolderMap = {
        "Inbox": "INBOX",
        "Sent": "SENT",
        "Drafts": "DRAFTS",
        "Trash": "TRASH"
      };
      currentFolder = displayToFolderMap[item.textContent.trim()] || "INBOX";

      // Recargar emails si hay una cuenta seleccionada
      if (currentAccountId) {
        await loadAccountData(currentAccountId);
      }
    });
  });
}

// Setup mailbox navigation
function setupMailboxNavigation() {
  const mailboxItems = document.querySelectorAll(".mailbox-item");
  mailboxItems.forEach((item) => {
    item.addEventListener("click", async () => {
      // Remover active de todos
      mailboxItems.forEach((mi) => mi.classList.remove("active"));
      // Agregar active al seleccionado
      item.classList.add("active");

      // Obtener el tipo de mailbox
      const mailboxType = item.getAttribute("data-mailbox");
      
      // Mapear tipos de mailbox a carpetas
      const mailboxToFolderMap = {
        "all": "INBOX",
        "unread": "UNREAD",
        "today": "TODAY",
        "flagged": "FLAGGED"
      };
      
      currentFolder = mailboxToFolderMap[mailboxType] || "INBOX";

      // Recargar emails si hay una cuenta seleccionada
      if (currentAccountId) {
        await loadAccountData(currentAccountId);
      }
    });
  });
}

// Update mailbox counts
function updateMailboxCounts(emailData) {
  if (!emailData) return;
  
  // Contar emails totales
  const totalCount = emailData.length || 0;
  const allItem = document.querySelector('.mailbox-item[data-mailbox="all"]');
  if (allItem) {
    const countEl = allItem.querySelector('.mailbox-count');
    if (countEl) countEl.textContent = totalCount;
  }
  
  // Contar no leídos
  const unreadCount = emailData.filter(e => !e.read).length || 0;
  const unreadItem = document.querySelector('.mailbox-item[data-mailbox="unread"]');
  if (unreadItem) {
    const countEl = unreadItem.querySelector('.mailbox-count');
    if (countEl) countEl.textContent = unreadCount;
  }
  
  // Contar de hoy (simplificado - podrías mejorar esto)
  const today = new Date();
  const todayCount = emailData.filter(e => {
    if (!e.date) return false;
    const emailDate = new Date(e.date);
    return emailDate.toDateString() === today.toDateString();
  }).length || 0;
  const todayItem = document.querySelector('.mailbox-item[data-mailbox="today"]');
  if (todayItem) {
    const countEl = todayItem.querySelector('.mailbox-count');
    if (countEl) countEl.textContent = todayCount;
  }
  
  // Contar con indicador (flagged)
  const flaggedCount = emailData.filter(e => e.flagged || e.starred).length || 0;
  const flaggedItem = document.querySelector('.mailbox-item[data-mailbox="flagged"]');
  if (flaggedItem) {
    const countEl = flaggedItem.querySelector('.mailbox-count');
    if (countEl) countEl.textContent = flaggedCount;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadAccounts();
  setupMenuNavigation();
  setupMailboxNavigation();
});
