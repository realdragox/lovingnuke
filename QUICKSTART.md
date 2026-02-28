# 🚀 Quick Start - Mini Web App

## 📦 Cosa è stato creato

✅ **Server Express API** (`apiServer.js`) - Espone le funzioni del bot come REST API  
✅ **Frontend HTML** (`public/index.html`) - Interfaccia grafica moderna  
✅ **Stili CSS** (`public/style.css`) - Design con animazioni e effetti neon  
✅ **Logica JavaScript** (`public/app.js`) - Gestione interazioni e chiamate API  
✅ **Video di sfondo** (`public/background_video.mp4`) - Ruotato e pronto all'uso  
✅ **Documentazione completa** - README e guide di integrazione

## 🎯 Avvio Istantaneo

### Opzione 1: Solo Web App (Raccomandato)

```bash
cd tg_bot
node apiServer.js
```

Poi apri: `http://localhost:3000`

### Opzione 2: Bot + Web App

```bash
cd tg_bot
npm run dev
```

Questo avvierà contemporaneamente:
- Bot Telegram su Telegram
- Server API su `http://localhost:3000`

## 🌐 Accesso

Apri il browser e vai su: **http://localhost:3000**

## 📱 Funzionalità Disponibili

### 1. 🔗 Connetti WhatsApp
- Inserisci il numero (es: 393331234567)
- Clicca "Genera Codice"
- Inserisci il codice su WhatsApp

### 2. 💣 Nuke
- Seleziona un gruppo dalla lista
- Scrivi i messaggi
- Clicca "Esegui Nuke"

### 3. 🔍 OSINT
- Scegli tipo (Telefono/IP/Email)
- Inserisci la query
- Clicca "Cerca"

### 4. 🌐 Lingua
- Clicca il pulsante "🌐" in basso
- Cambia tra Italiano/Inglese

## 🎨 Caratteristiche Design

- ✨ Sfondo video animato
- 🌟 Effetti glow neon
- 🎭 Animazioni fluide
- 📱 Mobile-first responsive
- 🌙 Tema scuro elegante
- ⚡ Loading screen con percentuale

## 📊 Stato Connessione

In alto a destra vedi lo stato della connessione WhatsApp:
- 🔴 Non connesso
- 🟢 Connesso

## 🔧 Configurazione

### Cambiare Porta

Modifica `apiServer.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

### Cambiare Video

Sostituisci `public/background_video.mp4` con il tuo video.

## 📝 Note Importanti

⚠️ **ATTENZIONE:**
- Il bot Telegram (`main.js`) NON è stato modificato
- La logica del bot rimane IDENTICA
- La web app è solo un layer grafico
- OSINT e Nuke usano simulazioni (vedi `INTEGRATION_EXAMPLE.md`)

## 🐛 Troubleshooting

### Il server non parte
```bash
# Verifica le dipendenze
cd tg_bot
npm install

# Riavvia
node apiServer.js
```

### Il video non si vede
Assicurati che `public/background_video.mp4` esista.

### La connessione non funziona
- Verifica il numero (senza + o spazi)
- Inserisci il codice entro 3 minuti
- Controlla i log del server

## 📚 Documentazione

- `README_WEBAPP.md` - Documentazione completa
- `INTEGRATION_EXAMPLE.md` - Come integrare plugin reali
- `package.json` - Dipendenze e script

## 🎉 Pronto!

Tutto è pronto per essere usato. Avvia il server e goditi la tua nuova interfaccia grafica!

---

**Creato da SuperNinja** 🥷