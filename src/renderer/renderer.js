// IPC is accessed via window.api provided by preload.js

// Estado global
let currentAccountId = null;
let currentFolder = "INBOX";

// Compose Button: delegate to main process to open a proper window
document.getElementById("composeButton").addEventListener("click", () => {
  window.api.openCompose();
});

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
  accDiv.innerHTML = "";
  
  if (accounts.length === 0) {
    const noAccounts = document.createElement("div");
    noAccounts.textContent = "No accounts";
    noAccounts.style.cssText = "color: #95a5a6; font-style: italic; padding: 10px;";
    accDiv.appendChild(noAccounts);
    return;
  }
  
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
  const emailList = document.getElementById("emailList");
  emailList.innerHTML = "";
  (emails || []).forEach((e) => {
    const item = document.createElement("div");
    item.className = "email-item";
    item.innerHTML = `<div><strong>${e.subject || "No Subject"}</strong></div><div>${e.snippet || ""}</div>`;
    emailList.appendChild(item);
  });
  
  // Actualizar contadores de mailbox
  updateMailboxCounts(emails);
}

function renderCalendar(events) {
  // Simple placeholder rendering in emailList area for now
  const emailList = document.getElementById("emailList");
  const el = document.createElement("div");
  el.style.marginTop = "12px";
  el.innerHTML = `<strong>Upcoming Events:</strong>`;
  const ul = document.createElement("ul");
  (events || []).forEach((ev) => {
    const li = document.createElement("li");
    li.textContent = `${ev.start} - ${ev.summary || 'No Title'}`;
    ul.appendChild(li);
  });
  el.appendChild(ul);
  emailList.appendChild(el);
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
