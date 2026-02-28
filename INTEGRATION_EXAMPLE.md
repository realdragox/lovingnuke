# 🔌 Esempio Integrazione Plugin Reali

Questo documento mostra come integrare i plugin OSINT e Nuke reali nel server API.

## 📝 Importare Plugin OSINT

Nel file `apiServer.js`, sostituisci la simulazione OSINT con:

```javascript
// Aggiungi questo import all'inizio del file
import osintSearch, { formatOSINTResults } from './plugins/osint.js';

// Sostituisci l'endpoint /api/osint con:
app.post('/api/osint', async (req, res) => {
    const { type, query } = req.body;
    
    if (!type || !query) {
        return res.status(400).json({ success: false, error: 'type e query richiesti' });
    }

    try {
        // Chiama la funzione reale del plugin
        const results = await osintSearch(query);
        const formattedResults = formatOSINTResults(results);

        res.json({ 
            success: true, 
            results: {
                type,
                query,
                data: results,
                formatted: formattedResults,
                timestamp: new Date().toISOString()
            }
        });
    } catch (e) {
        console.error('Errore OSINT:', e);
        res.status(500).json({ success: false, error: 'Errore durante la ricerca OSINT' });
    }
});
```

## 📝 Importare Plugin Nuke

Nel file `apiServer.js`, sostituisci la simulazione Nuke con:

```javascript
// Sostituisci l'endpoint /api/nuke con:
app.post('/api/nuke', async (req, res) => {
    const { userId, groupId, message1, message2, signature } = req.body;
    
    if (!userId || !groupId) {
        return res.status(400).json({ success: false, error: 'userId e groupId richiesti' });
    }

    const conn = userConnections.get(userId);
    if (!conn) {
        return res.status(400).json({ success: false, error: 'Non connesso' });
    }

    try {
        // Recupera metadata del gruppo
        const metadata = await conn.groupMetadata(groupId);

        // Importa e usa il plugin SVT reale
        const { default: svtHandler } = await import('./plugins/svt_cmd.js');

        // Esegui l'operazione
        await svtHandler(groupId, {
            conn,
            m1: message1,
            m2: message2,
            firma: signature,
            oldSubject: metadata.subject,
            participants: metadata.participants
        });

        res.json({ 
            success: true, 
            message: 'Operazione completata con successo',
            groupId,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error('Errore Nuke:', e);
        res.status(500).json({ success: false, error: 'Errore durante l\'operazione' });
    }
});
```

## 📁 Struttura Plugin

Assicurati di avere i plugin nella cartella `plugins/`:

```
tg_bot/
├── plugins/
│   ├── osint.js       # Plugin OSINT
│   └── svt_cmd.js     # Plugin Nuke/SVT
```

## 🧪 Testare l'Integrazione

1. **Test OSINT:**
```bash
curl -X POST http://localhost:3000/api/osint \
  -H "Content-Type: application/json" \
  -d '{"type":"phone","query":"393331234567"}'
```

2. **Test Nuke:**
```bash
curl -X POST http://localhost:3000/api/nuke \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"web_user_123",
    "groupId":"1234567890@g.us",
    "message1":"Test",
    "message2":"",
    "signature":"Test"
  }'
```

## ⚠️ Note Importanti

1. **Plugin OSINT**: Se non hai il file `plugins/osint.js`, devi crearlo o rimuovere la funzionalità OSINT.

2. **Plugin Nuke**: Se non hai il file `plugins/svt_cmd.js`, devi crearlo o rimuovere la funzionalità Nuke.

3. **Permessi**: Assicurati che i plugin abbiano i permessi necessari per accedere alle connessioni WhatsApp.

4. **Error Handling**: I plugin dovrebbero gestire gli errori in modo appropriato e restituire messaggi chiari.

## 🔄 Versione Attuale

Attualmente il server API usa **simulazioni** per OSINT e Nuke. Per usare le funzionalità reali:

1. Copia i plugin dal bot originale nella cartella `plugins/`
2. Modifica `apiServer.js` seguendo gli esempi sopra
3. Riavvia il server API

## 📞 Supporto

Se hai problemi con l'integrazione, controlla:
- I log del server API
- I log del bot Telegram
- La documentazione dei plugin originali