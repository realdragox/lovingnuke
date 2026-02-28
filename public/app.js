// ============================================
// CONFIGURAZIONE
// ============================================
const API_BASE = window.location.origin;
const USER_ID = 'web_user_' + Date.now(); // ID univoco per l'utente web

// ============================================
// SISTEMA TRADUZIONI
// ============================================
const translations = {
    it: {
        welcome: 'Benvenuto',
        welcome_desc: 'Seleziona un\'azione per iniziare',
        pairing: 'Connetti WhatsApp',
        nuke: 'Nuke',
        osint: 'OSINT',
        home: 'Home',
        back: 'Indietro',
        pairing_title: 'Connetti WhatsApp',
        pairing_desc: 'Inserisci il numero di telefono per generare il codice di pairing',
        phone_number: 'Numero di telefono',
        generate_code: 'Genera Codice',
        pairing_info: 'Il codice scade tra 3 minuti',
        nuke_title: 'Nuke',
        nuke_desc: 'Gestisci operazioni Nuke',
        select_group: 'Seleziona Gruppo',
        loading_groups: 'Caricamento gruppi...',
        message1: 'Inserisci primo messaggio:',
        message2: 'Inserisci secondo messaggio:',
        signature: 'Imposta nome da mettere in SVT by ___:',
        execute_nuke: 'Esegui Nuke',
        confirm: 'Conferma',
        confirm_nuke: 'Vuoi nukkare questo gruppo?',
        no: 'No',
        nuke_it: 'Nukkiamolo😈',
        disconnect: 'Disconnetti',
        osint_title: 'OSINT',
        osint_desc: 'Ricerca informazioni su telefono, IP o email',
        phone: 'Telefono',
        ip: 'IP',
        email: 'Email',
        search: 'Cerca',
        processing: 'Elaborazione in corso...',
        connected: 'Connesso',
        not_connected: 'Non connesso',
        connect_number: 'Connetti numero',
        error: 'Errore',
        success: 'Successo',
        operation_completed: 'Operazione completata con successo',
        members_removed: 'Membri rimossi'
    },
    en: {
        welcome: 'Welcome',
        welcome_desc: 'Select an action to begin',
        pairing: 'Connect WhatsApp',
        nuke: 'Nuke',
        osint: 'OSINT',
        home: 'Home',
        back: 'Back',
        pairing_title: 'Connect WhatsApp',
        pairing_desc: 'Enter phone number to generate pairing code',
        phone_number: 'Phone Number',
        generate_code: 'Generate Code',
        pairing_info: 'Code expires in 3 minutes',
        nuke_title: 'Nuke',
        nuke_desc: 'Manage Nuke operations',
        select_group: 'Select Group',
        loading_groups: 'Loading groups...',
        message1: 'Enter first message:',
        message2: 'Enter second message:',
        signature: 'Set name to put in SVT by ___:',
        execute_nuke: 'Execute Nuke',
        confirm: 'Confirm',
        confirm_nuke: 'Do you want to nuke this group?',
        no: 'No',
        nuke_it: 'Nuke it😈',
        disconnect: 'Disconnect',
        osint_title: 'OSINT',
        osint_desc: 'Search information on phone, IP or email',
        phone: 'Phone',
        ip: 'IP',
        email: 'Email',
        search: 'Search',
        processing: 'Processing...',
        connected: 'Connected',
        not_connected: 'Not connected',
        connect_number: 'Connect number',
        error: 'Error',
        success: 'Success',
        operation_completed: 'Operation completed successfully',
        members_removed: 'Members removed'
    }
};

let currentLang = 'it';
let currentOsintType = 'phone';
let navigationHistory = ['homeSection'];
let isConnected = false;
let selectedGroupId = null;

// ============================================
// INIZIALIZZAZIONE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    checkConnectionStatus();
    setInterval(checkConnectionStatus, 5000);
});

// ============================================
// SISTEMA LOADING SCREEN
// ============================================
function showLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingBar = document.getElementById('loadingBar');
    const loadingText = document.getElementById('loadingText');
    const loadingPercentage = document.getElementById('loadingPercentage');

    loadingScreen.classList.add('active');
    loadingBar.style.width = '0%';
    loadingPercentage.textContent = '0%';
    loadingText.textContent = translations[currentLang].processing;

    // Simula caricamento
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 90) {
            progress = 90;
            clearInterval(interval);
        }
        loadingBar.style.width = progress + '%';
        loadingPercentage.textContent = Math.round(progress) + '%';
    }, 200);

    return interval;
}

function hideLoading(interval) {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingBar = document.getElementById('loadingBar');
    const loadingPercentage = document.getElementById('loadingPercentage');

    clearInterval(interval);
    loadingBar.style.width = '100%';
    loadingPercentage.textContent = '100%';

    setTimeout(() => {
        loadingScreen.classList.remove('active');
    }, 300);
}

// ============================================
// SISTEMA TRADUZIONI
// ============================================
function toggleLanguage() {
    currentLang = currentLang === 'it' ? 'en' : 'it';
    document.getElementById('langText').textContent = currentLang.toUpperCase();
    applyTranslations();
}

function applyTranslations() {
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(el => {
        const key = el.getAttribute('data-translate');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });
}

// ============================================
// SISTEMA NAVIGAZIONE
// ============================================
function showSection(sectionId) {
    // Nascondi tutte le sezioni
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Mostra la sezione selezionata
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Aggiungi alla cronologia
        if (navigationHistory[navigationHistory.length - 1] !== sectionId) {
            navigationHistory.push(sectionId);
        }

        // Aggiorna stato navigazione
        updateNavigationState();
    }
}

function goHome() {
    showSection('homeSection');
    navigationHistory = ['homeSection'];
    updateNavigationState();
    resetNukeStates();
}

function goBack() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop(); // Rimuovi sezione corrente
        const previousSection = navigationHistory[navigationHistory.length - 1];
        
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(previousSection);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        updateNavigationState();
    }
}

function updateNavigationState() {
    const homeBtn = document.querySelector('.nav-btn:first-child');
    const backBtn = document.querySelector('.nav-btn:nth-child(2)');

    if (navigationHistory[navigationHistory.length - 1] === 'homeSection') {
        homeBtn.classList.add('active');
        backBtn.classList.remove('active');
    } else {
        homeBtn.classList.remove('active');
        backBtn.classList.add('active');
    }
}

// ============================================
// VERIFICA STATO CONNESSIONE
// ============================================
async function checkConnectionStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/status/${USER_ID}`);
        const data = await response.json();

        const statusElement = document.getElementById('connectionStatus');
        const statusText = statusElement.querySelector('.status-text');

        isConnected = data.connected;

        if (isConnected) {
            statusElement.classList.add('connected');
            statusText.textContent = translations[currentLang].connected;
        } else {
            statusElement.classList.remove('connected');
            statusText.textContent = translations[currentLang].not_connected;
        }
    } catch (error) {
        console.error('Errore verifica stato:', error);
        isConnected = false;
    }
}

// ============================================
// GESTIONE NUKE
// ============================================
function handleNukeClick() {
    if (!isConnected) {
        // Non connesso - vai a pairing
        showSection('pairingSection');
    } else {
        // Connesso - vai a nuke
        showSection('nukeSection');
        showNukeInitialState();
    }
}

function showNukeInitialState() {
    hideAllNukeStates();
    document.getElementById('nukeInitialState').classList.add('active');
}

function showNukeConfig() {
    hideAllNukeStates();
    document.getElementById('nukeConfig').classList.add('active');
}

function confirmNukeConfig() {
    const message1 = document.getElementById('message1').value.trim();
    const message2 = document.getElementById('message2').value.trim();
    const signature = document.getElementById('signature').value.trim();

    if (!message1) {
        alert(translations[currentLang].error + ': ' + translations[currentLang].message1);
        return;
    }

    // Salva i dati
    window.nukeData = {
        message1,
        message2,
        signature
    };

    // Carica gruppi
    loadGroupsForNuke();
}

async function loadGroupsForNuke() {
    hideAllNukeStates();
    document.getElementById('nukeGroupSelection').classList.add('active');

    const groupsList = document.getElementById('groupsList');
    groupsList.innerHTML = '<p class="text-center">' + translations[currentLang].loading_groups + '</p>';

    try {
        const response = await fetch(`${API_BASE}/api/groups/${USER_ID}`);
        const data = await response.json();

        if (data.success && data.groups.length > 0) {
            groupsList.innerHTML = '';
            data.groups.forEach(group => {
                const groupItem = document.createElement('div');
                groupItem.className = 'group-item';
                groupItem.innerHTML = `
                    <div class="group-name">${group.subject}</div>
                    <div class="group-participants">👥 ${group.participants} membri</div>
                `;
                groupItem.onclick = () => showNukeConfirmation(group);
                groupsList.appendChild(groupItem);
            });
        } else {
            groupsList.innerHTML = '<p class="text-center">Nessun gruppo trovato</p>';
        }
    } catch (error) {
        console.error('Errore caricamento gruppi:', error);
        groupsList.innerHTML = '<p class="text-center">Errore caricamento</p>';
    }
}

function showNukeConfirmation(group) {
    selectedGroupId = group.id;
    hideAllNukeStates();
    document.getElementById('nukeConfirmation').classList.add('active');
    document.getElementById('confirmGroupName').textContent = group.subject;
}

function cancelNuke() {
    selectedGroupId = null;
    showNukeInitialState();
}

function hideAllNukeStates() {
    document.querySelectorAll('.nuke-state').forEach(state => {
        state.classList.remove('active');
    });
}

function resetNukeStates() {
    hideAllNukeStates();
    selectedGroupId = null;
    window.nukeData = null;
}

// ============================================
// PAIRING CODE
// ============================================
async function generatePairingCode() {
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const resultBox = document.getElementById('pairingResult');
    const pairingCode = document.getElementById('pairingCode');

    if (!phoneNumber) {
        alert(translations[currentLang].error + ': ' + translations[currentLang].phone_number);
        return;
    }

    const loadingInterval = showLoading();

    try {
        const response = await fetch(`${API_BASE}/api/pairing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: USER_ID,
                phoneNumber: phoneNumber
            })
        });

        const data = await response.json();

        hideLoading(loadingInterval);

        if (data.success) {
            pairingCode.textContent = data.code;
            resultBox.classList.remove('hidden');
        } else {
            alert(translations[currentLang].error + ': ' + data.error);
            resultBox.classList.add('hidden');
        }
    } catch (error) {
        hideLoading(loadingInterval);
        alert(translations[currentLang].error + ': ' + error.message);
        resultBox.classList.add('hidden');
    }
}

// ============================================
// NUKE EXECUTION
// ============================================
async function executeNuke() {
    if (!selectedGroupId || !window.nukeData) {
        alert(translations[currentLang].error);
        return;
    }

    const loadingInterval = showLoading();

    try {
        const response = await fetch(`${API_BASE}/api/nuke`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: USER_ID,
                groupId: selectedGroupId,
                message1: window.nukeData.message1,
                message2: window.nukeData.message2,
                signature: window.nukeData.signature
            })
        });

        const data = await response.json();

        hideLoading(loadingInterval);

        if (data.success) {
            const resultBox = document.getElementById('nukeResult');
            resultBox.innerHTML = `
                <div style="text-align: center; color: var(--success);">
                    <h3>✅ ${translations[currentLang].success}</h3>
                    <p>${translations[currentLang].operation_completed}</p>
                    <p>${translations[currentLang].members_removed}</p>
                </div>
            `;
            resultBox.classList.remove('hidden');
            
            // Reset dopo 3 secondi
            setTimeout(() => {
                resultBox.classList.add('hidden');
                resetNukeStates();
                showNukeInitialState();
            }, 3000);
        } else {
            alert(translations[currentLang].error + ': ' + data.error);
        }
    } catch (error) {
        hideLoading(loadingInterval);
        alert(translations[currentLang].error + ': ' + error.message);
    }
}

// ============================================
// OSINT
// ============================================
function selectOsintType(type) {
    currentOsintType = type;
    
    // Aggiorna tab attiva
    document.querySelectorAll('.osint-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-type') === type) {
            tab.classList.add('active');
        }
    });

    // Aggiorna label
    const label = document.getElementById('osintLabel');
    const input = document.getElementById('osintQuery');
    
    if (type === 'phone') {
        label.textContent = translations[currentLang].phone_number;
        input.placeholder = '393331234567';
    } else if (type === 'ip') {
        label.textContent = translations[currentLang].ip;
        input.placeholder = '192.168.1.1';
    } else if (type === 'email') {
        label.textContent = translations[currentLang].email;
        input.placeholder = 'esempio@dominio.com';
    }
}

async function executeOsint() {
    const query = document.getElementById('osintQuery').value.trim();
    const resultBox = document.getElementById('osintResult');

    if (!query) {
        alert(translations[currentLang].error + ': Inserisci una query');
        return;
    }

    const loadingInterval = showLoading();

    try {
        const response = await fetch(`${API_BASE}/api/osint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: currentOsintType,
                query: query
            })
        });

        const data = await response.json();

        hideLoading(loadingInterval);

        if (data.success) {
            let resultsHTML = '<h3 style="margin-bottom: 15px; color: var(--neon-blue);">Risultati:</h3>';
            
            if (data.results.data && data.results.data.length > 0) {
                data.results.data.forEach((item, index) => {
                    resultsHTML += `
                        <div style="padding: 10px; margin-bottom: 10px; background: rgba(0, 207, 255, 0.1); border-radius: 8px;">
                            <strong>${item.label}:</strong> ${item.value}
                        </div>
                    `;
                });
            } else {
                resultsHTML += '<p>Nessun risultato trovato</p>';
            }

            resultBox.innerHTML = resultsHTML;
            resultBox.classList.remove('hidden');
        } else {
            alert(translations[currentLang].error + ': ' + data.error);
            resultBox.classList.add('hidden');
        }
    } catch (error) {
        hideLoading(loadingInterval);
        alert(translations[currentLang].error + ': ' + error.message);
        resultBox.classList.add('hidden');
    }
}

// ============================================
// DISCONNESSIONE
// ============================================
async function disconnect() {
    if (!confirm('Sei sicuro di volerti disconnettere?')) {
        return;
    }

    const loadingInterval = showLoading();

    try {
        const response = await fetch(`${API_BASE}/api/disconnect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: USER_ID
            })
        });

        const data = await response.json();

        hideLoading(loadingInterval);

        if (data.success) {
            alert(data.message);
            isConnected = false;
            goHome();
        } else {
            alert(translations[currentLang].error + ': ' + data.error);
        }
    } catch (error) {
        hideLoading(loadingInterval);
        alert(translations[currentLang].error + ': ' + error.message);
    }
}