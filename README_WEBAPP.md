# 🚀 WhatsApp Bot - Mini Web App

## 📋 Panoramica

Questa mini web app funziona come interfaccia grafica sopra il bot Telegram esistente. Il bot rimane invariato e la web app chiama le sue funzioni tramite API REST.

## 🏗️ Architettura

```
┌─────────────────┐
│   Web Browser   │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│  Express API    │
│   (apiServer.js)│
└────────┬────────┘
         │ Importa funzioni
         ▼
┌─────────────────┐
│  Bot Telegram   │
│   (main.js)     │
└─────────────────┘
```

## 📁 Struttura File

```
tg_bot/
├── main.js                    # Bot Telegram (NON MODIFICATO)
├── users.js                   # Gestione utenti (NON MODIFICATO)
├── pairing.js                 # Funzioni pairing (NON MODIFICATO)
├── apiServer.js              # ⭐ Server Express API (NUOVO)
├── package.json
├── public/                   # ⭐ Frontend (NUOVO)
│   ├── index.html           # ⭐ HTML principale
│   ├── style.css            # ⭐ Stili CSS
│   ├── app.js               # ⭐ Logica JavaScript
│   └── background_video.mp4 # Video di sfondo
├── users_session/           # Sessioni WhatsApp
└── users_data/              # Dati utenti
```

## 🎨 Caratteristiche Design

- **Tema**: Nero profondo (#0b0f1a), Blu scuro (#111827), Azzurro neon (#00cfff)
- **Animazioni**: Gradienti animati, effetti glow, transizioni fluide
- **Loading Screen**: Overlay con barra di caricamento animata e percentuale
- **Responsive**: Mobile-first design
- **Multilingua**: Italiano/Inglese con cambio dinamico

## 🚀 Avvio Rapido

### 1. Avvia il Bot Telegram (opzionale)

```bash
cd tg_bot
node main.js
```

### 2. Avvia il Server API

```bash
cd tg_bot
node apiServer.js
```

Il server API si avvierà su `http://localhost:3000`

### 3. Accedi alla Web App

Apri il browser e vai su: `http://localhost:3000`

## 🔧 Funzionalità

### 1. **Connetti WhatsApp (Pairing)**
- Inserisci il numero di telefono
- Genera il codice di pairing
- Inserisci il codice su WhatsApp

### 2. **Nuke**
- Seleziona un gruppo
- Configura messaggi e firma
- Esegui l'operazione

### 3. **OSINT**
- Ricerca per telefono
- Ricerca per IP
- Ricerca per email

### 4. **Navigazione**
- **Home**: Torna alla schermata principale
- **Indietro**: Torna alla sezione precedente
- **Lingua**: Cambia tra Italiano/Inglese

## 📡 API Endpoints

### GET `/api/status/:userId`
Verifica lo stato della connessione WhatsApp

**Risposta:**
```json
{
  "connected": true
}
```

### POST `/api/pairing`
Genera un codice di pairing

**Body:**
```json
{
  "userId": "web_user_123",
  "phoneNumber": "393331234567"
}
```

**Risposta:**
```json
{
  "success": true,
  "code": "ABCD-EFGH-IJKL-MNOP"
}
```

### POST `/api/disconnect`
Disconnette WhatsApp

**Body:**
```json
{
  "userId": "web_user_123"
}
```

### GET `/api/groups/:userId`
Recupera la lista dei gruppi

**Risposta:**
```json
{
  "success": true,
  "groups": [
    {
      "id": "1234567890@g.us",
      "subject": "Nome Gruppo",
      "participants": 150
    }
  ]
}
```

### POST `/api/osint`
Esegue una ricerca OSINT

**Body:**
```json
{
  "type": "phone",
  "query": "393331234567"
}
```

### POST `/api/nuke`
Esegue l'operazione Nuke

**Body:**
```json
{
  "userId": "web_user_123",
  "groupId": "1234567890@g.us",
  "message1": "Primo messaggio",
  "message2": "Secondo messaggio",
  "signature": "SVT by Nome"
}
```

## 🌐 Configurazione

### Porta Server
Modifica la porta in `apiServer.js`:

```javascript
const PORT = process.env.PORT || 3000;
```

### Video di Sfondo
Sostituisci `public/background_video.mp4` con il tuo video preferito.

## 📱 Compatibilità

- ✅ Chrome/Edge (recomandato)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## 🔒 Sicurezza

- Il server API usa CORS per permettere richieste dal frontend
- Le sessioni WhatsApp sono salvate localmente
- Nessun dato viene condiviso con terze parti

## 🐛 Troubleshooting

### Il video non si vede
Assicurati che il file `background_video.mp4` sia nella cartella `public/`

### La connessione WhatsApp non funziona
- Verifica che il numero sia corretto (senza + o spazi)
- Assicurati che il codice di pairing sia inserito entro 3 minuti
- Controlla i log del server per errori

### I gruppi non si caricano
- Verifica di essere connesso a WhatsApp
- Assicurati di avere almeno un gruppo

## 📝 Note Importanti

- ⚠️ **NON modificare** `main.js`, `users.js`, `pairing.js`
- ⚠️ La logica del bot rimane **IDENTICA**
- ⚠️ La web app è solo un **layer grafico**
- ⚠️ Tutte le operazioni usano le funzioni esistenti del bot

## 🎯 Prossimi Passi

Per integrare completamente le funzioni OSINT e Nuke, devi:

1. Importare i plugin reali in `apiServer.js`
2. Sostituire le simulazioni con le chiamate reali
3. Testare tutte le funzionalità

## 📞 Supporto

Per problemi o domande, controlla i log del server API:
```bash
node apiServer.js
```

---

**Creato con ❤️ per NinjaBot**