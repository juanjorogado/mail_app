// preload.js
// Este script se ejecuta antes de que la página web del renderizador se cargue.
// Aquí puedes exponer APIs a la ventana global de forma segura.

const { contextBridge, ipcRenderer } = require("electron");

// Exponer APIs seguras del IPC a la ventana del renderizador
const api = {
  listAccounts: () => ipcRenderer.invoke("list-accounts"),
  addGmailAccount: () => ipcRenderer.invoke("add-gmail-account"),
  removeAccount: (id) => ipcRenderer.invoke("remove-account", id),
  fetchEmails: (accountId, folder) =>
    ipcRenderer.invoke("fetch-emails", accountId, folder),
  fetchEmailDetails: (accountId, emailId) =>
    ipcRenderer.invoke("fetch-email-details", accountId, emailId),
  fetchCalendar: (accountId) => ipcRenderer.invoke("fetch-calendar", accountId),
  sendEmail: (payload) => ipcRenderer.invoke("send-email", payload),
  searchEmails: (accountId, query) =>
    ipcRenderer.invoke("search-emails", accountId, query),
  deleteEmail: (accountId, emailId) =>
    ipcRenderer.invoke("delete-email", accountId, emailId),
  markAsRead: (accountId, emailId, read) =>
    ipcRenderer.invoke("mark-as-read", accountId, emailId, read),
  openCompose: (options = {}) => ipcRenderer.send("open-compose", options),
};

// Exponer información del entorno de manera segura
const env = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production' || !process.env.NODE_ENV,
};

contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("electronAPI", api);
contextBridge.exposeInMainWorld("env", env);
