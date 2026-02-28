import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const msgRetryCounterCache = new Map();

export async function generatePairing(ctx, num, config) {
    const userId = ctx.from.id;
    const { sessionsDir, bot, userConnections, pairingRequests, sendStartMenu } = config;

    // --- RESET PREVENTIVO ---
    if (pairingRequests.has(userId)) pairingRequests.delete(userId);
    
    // Validazione
    const validation = validatePhoneNumber(num);
    if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}`);
        return;
    }
    const cleanNum = validation.cleaned;

    pairingRequests.set(userId, true);
    
    // Percorso sessione
    const sessionPath = path.join(sessionsDir, `user_${userId}`);
    
    // Uccidi connessioni precedenti
    if (userConnections.has(userId)) {
        try { userConnections.get(userId).end(); } catch {}
        userConnections.delete(userId);
    }

    // CANCELLAZIONE FORZATA FILES
    if (fs.existsSync(sessionPath)) {
        try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            await delay(1000); // 1 secondo di pausa per il disco
        } catch (e) {
            console.error(`Errore pulizia:`, e);
        }
    }

    await ctx.reply("⚙️ *Reset completato.*\nGenerazione nuovo codice in corso...", { parse_mode: 'Markdown' });

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        // CONFIGURAZIONE "MAC OS" (Spesso sblocca la situazione quando Linux fallisce)
        const conn = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
            },
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            mobile: false,
            
            // CAMBIO BROWSER: Usiamo Mac OS Chrome per aggirare blocchi
            browser: ["Mac OS", "Chrome", "121.0.6167.103"],
            
            markOnlineOnConnect: true,
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            
            // PARAMETRI CONNESSIONE
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 60000,
            
            // FIX "ATTENDI": 250ms (Non cambiarlo o si blocca il telefono)
            retryRequestDelayMs: 250, 
            keepAliveIntervalMs: 2000, // Ping molto aggressivo
            
            msgRetryCounterCache,
            getMessage: async () => ({ conversation: 'Hello' })
        });

        conn.ev.on('creds.update', saveCreds);
        userConnections.set(userId, conn);

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            // --- SE SI CONNETTE ---
            if (connection === 'open') {
                pairingRequests.delete(userId);

                // LOG DI CONTROLLO
                console.log(`>> CONNESSIONE APERTA PER ${userId} <<`);

                // NOTIFICA TELEGRAM
                try {
                    await bot.telegram.sendMessage(userId, "✅ **CONNESSO!**\n\nCaricamento menu...", { parse_mode: 'Markdown' });
                } catch (e) {
                    console.error("Errore notifica:", e);
                }
                
                await delay(2000);
                try {
                    await sendStartMenu(userId);
                } catch (e) {
                    console.error("Errore menu:", e);
                }
            }

            // --- SE SI DISCONNETTE ---
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error instanceof Boom 
                    ? lastDisconnect.error.output.statusCode 
                    : null;

                // 401 = Disconnesso dal telefono
                // 515 = Riavvio necessario (ignorare, si riconnette solo)
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403) {
                    pairingRequests.delete(userId);
                    userConnections.delete(userId);
                    if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
                    await ctx.reply("❌ Connessione fallita. Riprova.");
                }
            }
        });

        // RICHIESTA CODICE
        await delay(2000);

        if (!conn.authState.creds.me) {
            try {
                const code = await conn.requestPairingCode(cleanNum);
                const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
                await ctx.reply(`Codice Pairing:\n\`${formattedCode}\``, { parse_mode: 'Markdown' });
            } catch (e) {
                await ctx.reply("⚠️ Errore connessione WhatsApp. Riprova.");
                pairingRequests.delete(userId);
            }
        }
        
        // Timeout
        setTimeout(() => { 
             if(pairingRequests.has(userId)) pairingRequests.delete(userId); 
        }, 180000);

    } catch (error) {
        console.error('Errore:', error);
        await ctx.reply("❌ Errore critico.");
    }
}

export function validatePhoneNumber(num) {
    if (!num) return { valid: false, error: 'Manca numero' };
    let cleaned = num.replace(/\D/g, '');
    if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);
    if (cleaned.length < 7) return { valid: false, error: 'Numero corto' };
    return { valid: true, cleaned, error: null };
}

