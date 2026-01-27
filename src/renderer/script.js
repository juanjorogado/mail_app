document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    const onboardingScreen = document.getElementById('onboarding-screen');
    const mainAppScreen = document.getElementById('main-app-screen');
    const connectAccountButton = document.getElementById('connect-account-button');

    console.log('Elements found:', {
        onboarding: !!onboardingScreen,
        mainApp: !!mainAppScreen,
        connectBtn: !!connectAccountButton
    });

    const mailboxItems = document.querySelectorAll('.mailbox-item');
    console.log('Mailbox items found:', mailboxItems.length);

    const messageList = document.getElementById('message-list');
    const messageListTitleElement = document.querySelector('.main-content .text-xl.font-bold') || document.querySelector('[class*="flex-1 bg-white"] h2');
    const messageListCountElement = document.querySelector('.main-content .messages-subtitle') || document.querySelector('[class*="flex-1 bg-white"] .text-gray-500');

    const messageDetail = document.getElementById('message-detail');
    const messageTitle = document.getElementById('message-title');
    const messageSender = document.getElementById('message-sender');
    const messageRecipient = document.getElementById('message-recipient');
    const messageDate = document.getElementById('message-date');
    const messageBody = document.getElementById('message-body');

    let currentFetchedMessages = [];
    let currentAccountId = null; // Para almacenar el ID de la cuenta activa

    // Initial state: show onboarding, hide main app
    mainAppScreen.classList.add('hidden');

    // Función para renderizar mensajes basada en el buzón
    async function renderMessages(messagesToRender, mailboxType) {
        console.log('renderMessages called with', messagesToRender.length, 'messages, type:', mailboxType);
        messageList.innerHTML = '';
       
        if (mailboxType === 'all') {
            messageListTitleElement.textContent = 'Recibidos';
            messageListCountElement.textContent = `${messagesToRender.length} mensajes`;
        } else {
            const mailboxName = document.querySelector(`.mailbox-item[data-mailbox="${mailboxType}"] span:first-child`).textContent;
            messageListTitleElement.textContent = mailboxName;
            messageListCountElement.textContent = `${messagesToRender.length} mensajes`;
        }
        

        if (messagesToRender.length === 0) {
            messageList.innerHTML = '<p class="text-center text-gray-500 mt-4">No hay mensajes en este buzón.</p>';
            displayMessageDetail(null); // Borrar el detalle del mensaje
            return;
        }

        console.log('About to render', messagesToRender.length, 'messages');

        messagesToRender.forEach(msg => {
            const messageItem = document.createElement('div');
            messageItem.classList.add('message-item', 'p-3', 'border-b', 'border-gray-200', 'hover:bg-gray-50', 'cursor-pointer');
            if (!msg.read) {
                messageItem.classList.add('font-bold');
            }
            // Usar el id si existe, sino usar el threadId, sino usar el from como identificador temporal
            const emailId = msg.id || msg.threadId || (msg.from + msg.date);
            messageItem.dataset.messageId = emailId;
            messageItem.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-semibold">${msg.from}</span>
                    <span class="text-sm text-gray-500">${new Date(msg.date).toLocaleDateString()}</span>
                </div>
                <p class="text-gray-700 text-sm">${msg.subject}</p>
                <p class="text-gray-500 text-xs">${msg.snippet.substring(0, 50)}...</p>
            `;
            messageList.appendChild(messageItem);
        });

        // Añadir el listener de clic a los mensajes recién renderizados
        document.querySelectorAll('.message-item').forEach(item => {
            item.addEventListener('click', async (event) => {
                document.querySelectorAll('.message-item').forEach(msgItem => msgItem.classList.remove('bg-gray-200'));
                event.currentTarget.classList.add('bg-gray-200'); // Resaltar el mensaje seleccionado

                const selectedId = event.currentTarget.dataset.messageId;
                if (currentAccountId && selectedId) {
                    // Buscar el email en currentFetchedMessages para obtener detalles
                    const selectedEmail = currentFetchedMessages.find(email => 
                        email.id === selectedId || 
                        email.threadId === selectedId ||
                        (email.from + email.date) === selectedId
                    );
                    
                    if (selectedEmail) {
                        displayMessageDetail(selectedEmail);
                    } else if (selectedEmail && selectedEmail.id) {
                        // Si tiene ID, intentar obtener detalles completos
                        const detailResponse = await window.electronAPI.fetchEmailDetails(currentAccountId, selectedEmail.id);
                        if (detailResponse.success) {
                            displayMessageDetail(detailResponse.data);
                        } else {
                            console.error('Error al obtener detalles del mensaje:', detailResponse.error);
                            displayMessageDetail(selectedEmail);
                        }
                    }
                } else {
                    alert('No hay información del mensaje disponible.');
                }
            });
        });

        // Seleccionar el primer mensaje por defecto
        if (messagesToRender.length > 0) {
            document.querySelector('.message-item').classList.add('bg-gray-200');
            // También cargar el detalle del primer mensaje si hay un ID válido
            if (currentAccountId && messagesToRender[0].id) {
                const firstMessageId = messagesToRender[0].id;
                const detailResponse = await window.electronAPI.fetchEmailDetails(currentAccountId, firstMessageId);
                if (detailResponse.success) {
                    displayMessageDetail(detailResponse.data);
                } else {
                    console.error('Error al obtener detalles del primer mensaje:', detailResponse.error);
                }
            } else {
                console.log('Skipping email details load - no valid ID or no accountId');
            }
        }
    }

    // Función para mostrar los detalles del mensaje
    function displayMessageDetail(message) {
        if (!message) {
            messageTitle.textContent = 'Selecciona un mensaje';
            messageSender.textContent = '';
            messageRecipient.textContent = '';
            messageDate.textContent = '';
            messageBody.innerHTML = '<p>Contenido del mensaje seleccionado aparecerá aquí.</p>';
            return;
        }
        messageTitle.textContent = message.subject;
        messageSender.textContent = message.from;
        messageRecipient.textContent = message.to || 'me';
        messageDate.textContent = new Date(message.date).toLocaleString();
        messageBody.innerHTML = message.htmlBody || message.body || '<p>No se pudo cargar el cuerpo del mensaje.</p>';
    }

    // Event Listeners

    // Conectar cuenta button handler
    connectAccountButton.addEventListener('click', async () => {
        try {
            const response = await window.electronAPI.addGmailAccount();
            if (response.success) {
                currentAccountId = response.account.id; // Asume que el ID de la cuenta es el email
                onboardingScreen.classList.add('hidden');
                mainAppScreen.classList.remove('hidden');
                loadEmailsForMailbox('INBOX', 'all'); // Carga inicial de Recibidos
                // Actualizar info de la cuenta en la UI si es necesario
                document.getElementById('currentAccount').textContent = response.account.email;
            } else {
                alert(`Error al conectar la cuenta de Google: ${response.error}`);
                console.error('Error al añadir cuenta de Gmail:', response.error);
            }
        } catch (error) {
            console.error('Error al iniciar el flujo de OAuth:', error);
            alert('Ocurrió un error al intentar conectar la cuenta de Google.');
        }
    });

    async function loadEmailsForMailbox(folder, mailboxType) {
        if (!currentAccountId) {
            alert('Por favor, conecta una cuenta primero.');
            return;
        }
        try {
            const response = await window.electronAPI.fetchEmails(currentAccountId, folder);
            console.log('Emails response:', response);
            if (response.success) {
                currentFetchedMessages = response.data; // Almacenar los mensajes reales
                console.log('First email raw:', currentFetchedMessages[0]);
                console.log('First email JSON:', JSON.stringify(currentFetchedMessages[0], null, 2));
                console.log('First email keys:', Object.keys(currentFetchedMessages[0] || {}));
                renderMessages(currentFetchedMessages, mailboxType);
            } else {
                console.error('Error al cargar emails:', response.error);
                alert(`Error al cargar los mensajes: ${response.error}`);
            }
        } catch (error) {
            console.error('Error de IPC al cargar emails:', error);
            alert('Error de comunicación con el proceso principal para cargar mensajes.');
        }
    }

    // Mailbox item click handler
    mailboxItems.forEach(item => {
        item.addEventListener('click', () => {
            if (!currentAccountId) {
                alert('Conecta una cuenta primero para ver los buzones.');
                return;
            }

            mailboxItems.forEach(mb => mb.classList.remove('bg-purple-100', 'text-purple-700', 'font-semibold'));
            item.classList.add('bg-purple-100', 'text-purple-700', 'font-semibold');
            const mailboxType = item.dataset.mailbox;
            let folder = 'INBOX'; // Por defecto para Recibidos

            switch (mailboxType) {
                case 'all':
                    folder = 'INBOX';
                    break;
                case 'unread':
                    folder = 'UNREAD'; // Usaremos la query interna del backend
                    break;
                case 'today':
                    folder = 'TODAY'; // Usaremos la query interna del backend
                    break;
                case 'flagged':
                    folder = 'STARRED'; // Usaremos la query interna del backend
                    break;
                default:
                    folder = 'INBOX';
            }
            loadEmailsForMailbox(folder, mailboxType);
        });
    });

    // Simulate button actions
    const editButton = document.querySelector('.mailboxes-section .edit-button') || document.querySelector('button.text-purple-600');
    if (editButton) {
        editButton.addEventListener('click', () => alert('Funcionalidad de "Editar buzones" (simulada).'));
    }
    
    const composeButton = document.querySelector('.mailboxes-section button.bg-purple-100') || document.querySelector('#composeButton');
    if (composeButton) {
        composeButton.addEventListener('click', async () => {
            if (currentAccountId) {
                // window.electronAPI.openComposeWindow(); // Abrir ventana de redacción
                alert('Funcionalidad de "Escribir mensaje" (simulada). Se abriría una ventana de redacción.');
            } else {
                alert('Conecta una cuenta primero para escribir un mensaje.');
            }
        });
    }
    
    // Asegúrate de que este elemento existe en tu index.html
    const logoutButton = document.querySelector('.mailboxes-section .text-blue-500');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (currentAccountId) {
                const response = await window.electronAPI.removeAccount(currentAccountId);
                if (response.success) {
                    alert('Sesión cerrada correctamente.');
                    currentAccountId = null;
                    onboardingScreen.classList.remove('hidden');
                    mainAppScreen.classList.add('hidden');
                    // Limpiar UI
                    messageList.innerHTML = '';
                    displayMessageDetail(null);
                } else {
                    alert(`Error al cerrar sesión: ${response.error}`);
                }
            } else {
                alert('No hay sesión activa para cerrar.');
            }
        });
    }

    
    // Opcional: búsqueda y opciones de mensajes
    const searchButton = document.querySelector('.main-content .search-button');
    if (searchButton) {
        searchButton.addEventListener('click', () => alert('Funcionalidad de "Buscar mensajes" (simulada).'));
    }
    
    const optionsIcon = document.querySelector('.main-content .options-icon');
    if (optionsIcon) {
        optionsIcon.addEventListener('click', () => alert('Funcionalidad de "Opciones de lista de mensajes" (simulada).'));
    }

    const messageDetailButtons = document.querySelectorAll('#message-detail button');
    if (messageDetailButtons && messageDetailButtons.length > 0) {
        messageDetailButtons.forEach(button => {
            button.addEventListener('click', () => {
                const buttonText = button.textContent.trim();
                let alertMessage = `Funcionalidad de "${buttonText}" (simulada).`;
                if (buttonText === 'Eliminar') {
                    alertMessage = 'Funcionalidad de "Eliminar mensaje" (simulada).';
                }
                alert(alertMessage);
            });
        });
    }

    // Establecer la selección inicial del buzón (ej. 'Recibidos') si ya hay cuenta conectada
    // Esto se manejará después de la autenticación

    // Comprobar si ya hay cuentas conectadas al inicio
    async function checkExistingAccounts() {
        console.log('checkExistingAccounts called');
        try {
            const accounts = await window.electronAPI.listAccounts();
            console.log('Accounts from API:', accounts);
            if (accounts && accounts.length > 0) {
                const firstAccount = accounts[0];
                currentAccountId = firstAccount.id;
                console.log('Setting currentAccountId to:', currentAccountId);
                onboardingScreen.classList.add('hidden');
                mainAppScreen.classList.remove('hidden');
                console.log('Loading emails for first account');
                loadEmailsForMailbox('INBOX', 'all');
                document.getElementById('currentAccount').textContent = firstAccount.email;
                // Activar el buzón "Recibidos" por defecto
                const defaultMailbox = document.querySelector('.mailbox-item[data-mailbox="all"]');
                if (defaultMailbox) {
                    defaultMailbox.classList.add('bg-purple-100', 'text-purple-700', 'font-semibold');
                }
            } else {
                console.log('No hay cuentas de Gmail conectadas.');
            }
        } catch (error) {
            console.error('Error al listar cuentas:', error);
        }
    }

    checkExistingAccounts();
});
