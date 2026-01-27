// preload.js
// Este script se ejecuta antes de que la página web del renderizador se cargue.
// Aquí puedes exponer APIs a la ventana global de forma segura si es necesario.

const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras del IPC a la ventana del renderizador
contextBridge.exposeInMainWorld('electronAPI', {
    listAccounts: () => ipcRenderer.invoke('list-accounts'),
    addGmailAccount: () => ipcRenderer.invoke('add-gmail-account'),
    removeAccount: (id) => ipcRenderer.invoke('remove-account', id),
    fetchEmails: (accountId, folder) => ipcRenderer.invoke('fetch-emails', accountId, folder),
    fetchEmailDetails: (accountId, emailId) => ipcRenderer.invoke('fetch-email-details', accountId, emailId),
    fetchCalendar: (accountId) => ipcRenderer.invoke('fetch-calendar', accountId),
    sendEmail: (payload) => ipcRenderer.invoke('send-email', payload),
    openComposeWindow: () => ipcRenderer.send('open-compose'),
});
