import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, delay, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import { getUser, saveUser } from './users.js';
import osintSearch, { formatOSINTResults } from './plugins/osint.js';

const TG_TOKEN = '8544068654:AAGlQB9f2FN66OJ6cj-KbPVEzPNVRlCDV10';
const SESSIONS_DIR = './users_session';
const MAIN_IMAGE = './main.jpeg';

if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

const bot = new Telegraf(TG_TOKEN);
const userConnections = new Map();
const reconnectAttempts = new Map();
const pairingRequests = new Map();
const msgRetryCounterCache = new Map();
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_BASE = 5000;

const FULL_BIO = `
† ─────────── ⚡︎ ─────────── †
            **𝐃𝐑𝐀𝐆𝐎𝐗**
† ─────────── ⚡︎ ─────────── †

  » ─────────────────────── «
   𝐔𝐬𝐚𝐧𝐝𝐨 𝐪𝐮𝐞𝐬𝐭𝐨 𝐛𝐨𝐭, 𝐥𝐚 𝐜𝐡𝐚𝐭
   𝐬𝐯𝐚𝐧𝐢𝐬𝐜𝐞 𝐝𝐚 𝐬𝐞𝐫𝐯𝐞𝐫, 𝐛𝐚𝐜𝐤𝐮𝐩
   𝐞 𝐠𝐚𝐥𝐥𝐞𝐫𝐢𝐞. 𝐍𝐨𝐧 𝐫𝐞𝐬𝐭𝐚𝐧𝐨 𝐥𝐨𝐠
   𝐧é 𝐚𝐯𝐯𝐢𝐬𝐢.
  » ─────────────────────── «`;

// ============================================
// VALIDAZIONE NUMERO DI TELEFONO
// ============================================
function validatePhoneNumber(num) {
    if (!num) return { valid: false, error: 'Numero mancante' };
    let cleaned = num.replace(/\D/g, '');
    if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);
    if (cleaned.length < 7) return { valid: false, error: 'Numero troppo corto' };
    return { valid: true, cleaned, error: null };
}

// ============================================
// GENERAZIONE PAIRING CODE (VERSIONE CORRETTA)
// ============================================
async function generatePairing(ctx, num) {
    const userId = ctx.from.id;
    
    // Previeni richieste multiple
    if (pairingRequests.has(userId)) {
        await ctx.reply("⚠️ Hai già una richiesta in corso. Attendi...");
        return;
    }

    // Validazione numero
    const validation = validatePhoneNumber(num);
    if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}\n\nEsempio corretto: 393331234567`);
        return;
    }
    const cleanNum = validation.cleaned;

    pairingRequests.set(userId, true);
    
    const sessionPath = path.join(SESSIONS_DIR, `user_${userId}`);
    
    // Chiudi connessione esistente
    if (userConnections.has(userId)) {
        try {
            const oldConn = userConnections.get(userId);
            oldConn.end();
            userConnections.delete(userId);
        } catch (e) {
            console.error('Errore chiusura connessione:', e);
        }
    }

    // Cancella sessione esistente
    if (fs.existsSync(sessionPath)) {
        try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            await delay(1500);
        } catch (e) {
            console.error('Errore pulizia sessione:', e);
        }
    }

    await ctx.reply("⚙️ **Reset completato.**\n\n🔄 Generazione nuovo codice...", { parse_mode: 'Markdown' });

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        const conn = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
            },
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            mobile: false,
            browser: ["Mac OS", "Chrome", "121.0.0"],
            markOnlineOnConnect: true,
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            retryRequestDelayMs: 250,
            keepAliveIntervalMs: 30000,
            msgRetryCounterCache,
            getMessage: async () => undefined
        });

        conn.ev.on('creds.update', saveCreds);
        userConnections.set(userId, conn);

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log(`✅ Utente ${userId} connesso con pairing code`);
                pairingRequests.delete(userId);
                reconnectAttempts.set(userId, 0);

                try {
                    await bot.telegram.sendMessage(userId, "✅ **WhatsApp Connesso!**\n\n🎉 Pairing completato con successo!", { parse_mode: 'Markdown' });
                    await delay(2000);
                    await sendStartMenu(userId);
                } catch (e) {
                    console.error('Errore invio conferma:', e);
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error instanceof Boom 
                    ? lastDisconnect.error.output.statusCode 
                    : null;

                console.log(`⚠️ Connessione chiusa per ${userId}. Status: ${statusCode}`);

                // Errori che richiedono nuovo pairing
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403 || statusCode === 428) {
                    pairingRequests.delete(userId);
                    userConnections.delete(userId);
                    reconnectAttempts.delete(userId);
                    
                    if (fs.existsSync(sessionPath)) {
                        fs.rmSync(sessionPath, { recursive: true, force: true });
                    }
                    
                    await ctx.reply("❌ **Connessione fallita**\n\nIl codice potrebbe essere scaduto o errato.\n\nUsa /start per generare un nuovo codice.", { parse_mode: 'Markdown' });
                } else {
                    // Tentativo di riconnessione automatica
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    
                    if (shouldReconnect) {
                        const attempts = reconnectAttempts.get(userId) || 0;
                        
                        if (attempts < MAX_RECONNECT_ATTEMPTS) {
                            reconnectAttempts.set(userId, attempts + 1);
                            const delayTime = Math.min(RECONNECT_DELAY_BASE * Math.pow(2, attempts), 60000);
                            
                            console.log(`🔄 Riconnessione ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS} per ${userId} tra ${delayTime/1000}s`);
                            
                            await delay(delayTime);
                            userConnections.delete(userId);
                            await startWA(userId, true);
                        } else {
                            console.log(`❌ Max tentativi raggiunto per ${userId}`);
                            userConnections.delete(userId);
                            reconnectAttempts.delete(userId);
                            pairingRequests.delete(userId);
                            
                            try {
                                await bot.telegram.sendMessage(
                                    userId,
                                    "❌ **Connessione persa**\n\nImpossibile riconnettersi automaticamente.\n\nUsa /start per riconnetterti.",
                                    { parse_mode: 'Markdown' }
                                );
                            } catch (e) {
                                console.error('Errore notifica:', e);
                            }
                        }
                    }
                }
            }
        });

        // Richiesta codice pairing
        await delay(3000);

        if (!conn.authState.creds.registered) {
            try {
                const code = await conn.requestPairingCode(cleanNum);
                const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
                
      await ctx.reply(
        `🔑 \`${formattedCode}\`\n\n⏱ Il codice scade tra 3 minuti`,
        { parse_mode: 'Markdown' }
      );

            } catch (e) {
                console.error('Errore richiesta pairing:', e);
                await ctx.reply("❌ **Errore generazione codice**\n\nRiprova tra qualche secondo.", { parse_mode: 'Markdown' });
                pairingRequests.delete(userId);
                userConnections.delete(userId);
            }
        }
        
        // Timeout pulizia dopo 3 minuti
        setTimeout(() => { 
            if (pairingRequests.has(userId)) {
                pairingRequests.delete(userId);
                console.log(`⏱️ Timeout pairing per ${userId}`);
            }
        }, 180000);

    } catch (error) {
        console.error('Errore critico pairing:', error);
        await ctx.reply("❌ **Errore critico**\n\nImpossibile generare il codice. Riprova più tardi.", { parse_mode: 'Markdown' });
        pairingRequests.delete(userId);
        userConnections.delete(userId);
    }
}

// ============================================
// CONNESSIONE WHATSAPP NORMALE (AUTO-RECONNECT)
// ============================================
async function startWA(userId, isAuto = false) {
    const sessionPath = path.join(SESSIONS_DIR, `user_${userId}`);

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        const conn = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            retryRequestDelayMs: 2000,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            printQRInTerminal: false,
            getMessage: async () => undefined
        });

        userConnections.set(userId, conn);
        conn.ev.on('creds.update', saveCreds);

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log(`✅ Utente ${userId} riconnesso`);
                reconnectAttempts.set(userId, 0);

                if (!isAuto) {
                    await bot.telegram.sendMessage(userId, "✅ **WhatsApp Connesso!**", { parse_mode: 'Markdown' });
                    await sendStartMenu(userId);
                }
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                    ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                    : true;

                const statusCode = lastDisconnect?.error instanceof Boom
                    ? lastDisconnect.error.output.statusCode
                    : null;

                console.log(`⚠️ Connessione chiusa per ${userId}. Codice: ${statusCode}`);

                if (shouldReconnect) {
                    const attempts = reconnectAttempts.get(userId) || 0;

                    if (attempts < MAX_RECONNECT_ATTEMPTS) {
                        reconnectAttempts.set(userId, attempts + 1);
                        const delayTime = Math.min(RECONNECT_DELAY_BASE * Math.pow(2, attempts), 60000);

                        console.log(`🔄 Tentativo ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS} per ${userId} tra ${delayTime/1000}s`);

                        await delay(delayTime);
                        userConnections.delete(userId);
                        await startWA(userId, true);
                    } else {
                        console.log(`❌ Max tentativi per ${userId}`);
                        userConnections.delete(userId);
                        reconnectAttempts.delete(userId);

                        try {
                            await bot.telegram.sendMessage(
                                userId,
                                "❌ **Connessione persa**\n\nUsa /start per riconnetterti.",
                                { parse_mode: 'Markdown' }
                            );
                        } catch (e) {
                            console.error('Errore notifica:', e);
                        }
                    }
                } else {
                    console.log(`🚪 Logout per ${userId}`);
                    userConnections.delete(userId);
                    reconnectAttempts.delete(userId);
                }
            }
        });

        conn.ws.on('error', (error) => {
            console.error(`⚠️ WebSocket error per ${userId}:`, error.message);
        });

        const keepAliveInterval = setInterval(() => {
            if (conn.ws.readyState === 1) {
                try {
                    conn.ws.ping();
                } catch (e) {
                    console.error('Errore ping:', e);
                }
            } else {
                clearInterval(keepAliveInterval);
            }
        }, 25000);

        return conn;
    } catch (error) {
        console.error(`❌ Errore inizializzazione ${userId}:`, error);

        const attempts = reconnectAttempts.get(userId) || 0;
        if (attempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts.set(userId, attempts + 1);
            await delay(RECONNECT_DELAY_BASE);
            return startWA(userId, isAuto);
        }

        throw error;
    }
}

// ============================================
// MENU TELEGRAM
// ============================================
const sendStartMenu = async (chatId) => {
    const buttons = [
        [Markup.button.callback('💣 Nuke', 'nuke_menu')],
        [Markup.button.callback('🔎 Osint', 'osint_menu')]
    ];

    const options = { caption: FULL_BIO, parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) };

    try {
        if (fs.existsSync(MAIN_IMAGE)) {
            await bot.telegram.sendPhoto(chatId, { source: fs.readFileSync(MAIN_IMAGE) }, options);
        } else {
            await bot.telegram.sendMessage(chatId, FULL_BIO, options);
        }
    } catch (error) {
        console.error('Errore menu:', error);
    }
};

const sendNukeMenu = async (chatId) => {
    const isConnected = userConnections.has(chatId);
    let buttons = [];

    if (isConnected) {
        buttons = [
            [Markup.button.callback('🚀 Avvia Nuke', 'svt_manual')],
            [Markup.button.callback('🔄 Reset / Cambia Numero', 'collega')],
            [Markup.button.callback('❌ Disconnetti', 'disconnect')],
            [Markup.button.callback('🔙 Indietro', 'back_main')]
        ];
    } else {
        buttons = [
            [Markup.button.callback('🤖 Connetti WhatsApp', 'collega')],
            [Markup.button.callback('🔙 Indietro', 'back_main')]
        ];
    }

    const options = { caption: FULL_BIO, parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) };

    try {
        if (fs.existsSync(MAIN_IMAGE)) {
            await bot.telegram.sendPhoto(chatId, { source: fs.readFileSync(MAIN_IMAGE) }, options);
        } else {
            await bot.telegram.sendMessage(chatId, FULL_BIO, options);
        }
    } catch (error) {
        console.error('Errore menu nuke:', error);
    }
};

const sendOsintMenu = async (chatId) => {
    const buttons = [
        [Markup.button.callback('📲 Telefono', 'osint_phone')],
        [Markup.button.callback('📍 IP', 'osint_ip')],
        [Markup.button.callback('✉️ Email', 'osint_email')],
        [Markup.button.callback('🔙 Indietro', 'back_main')]
    ];

    const options = { caption: FULL_BIO, parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) };

    try {
        if (fs.existsSync(MAIN_IMAGE)) {
            await bot.telegram.sendPhoto(chatId, { source: fs.readFileSync(MAIN_IMAGE) }, options);
        } else {
            await bot.telegram.sendMessage(chatId, FULL_BIO, options);
        }
    } catch (error) {
        console.error('Errore menu osint:', error);
    }
};

// ============================================
// HANDLERS TELEGRAM
// ============================================
bot.start((ctx) => sendStartMenu(ctx.chat.id));

bot.action('nuke_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await sendNukeMenu(ctx.from.id);
});

bot.action('osint_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await sendOsintMenu(ctx.from.id);
});

bot.action('back_main', async (ctx) => {
    await ctx.answerCbQuery();
    await sendStartMenu(ctx.from.id);
});

bot.action('osint_phone', async (ctx) => {
    await ctx.answerCbQuery();
    const u = getUser(ctx.from.id);
    u.step = 'WAIT_OSINT_PHONE';
    saveUser(ctx.from.id, u);
    ctx.reply("📲 Inserisci il numero di telefono da cercare:\n\nFormato: +39xxxxxxxxxx o 39xxxxxxxxxx");
});

bot.action('osint_ip', async (ctx) => {
    await ctx.answerCbQuery();
    const u = getUser(ctx.from.id);
    u.step = 'WAIT_OSINT_IP';
    saveUser(ctx.from.id, u);
    ctx.reply("📍 Inserisci l'indirizzo IP da cercare:\n\nFormato: xxx.xxx.xxx.xxx");
});

bot.action('osint_email', async (ctx) => {
    await ctx.answerCbQuery();
    const u = getUser(ctx.from.id);
    u.step = 'WAIT_OSINT_EMAIL';
    saveUser(ctx.from.id, u);
    ctx.reply("✉️ Inserisci l'email da cercare:\n\nFormato: esempio@dominio.com");
});

bot.action('collega', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const user = getUser(userId);
    const registeredNumbers = user.numbers || [];
    const buttons = registeredNumbers.map(n => [Markup.button.callback(`📱 ${n}`, `use_num:${n}`)]);
    buttons.push([Markup.button.callback("➕ Nuovo Numero", "new_num_input")]);
    ctx.reply("Seleziona o inserisci un numero:", Markup.inlineKeyboard(buttons));
});

bot.action('disconnect', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const conn = userConnections.get(userId);

    if (conn) {
        try {
            await conn.logout();
            userConnections.delete(userId);
            reconnectAttempts.delete(userId);
            pairingRequests.delete(userId);

            const sessionPath = path.join(SESSIONS_DIR, `user_${userId}`);
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }

            await ctx.reply("✅ **Disconnesso con successo!**\n\nUsa /start per riconnetterti.", { parse_mode: 'Markdown' });
        } catch (e) {
            console.error('Errore disconnessione:', e);
            await ctx.reply("❌ Errore durante la disconnessione. Riprova.");
        }
    } else {
        await ctx.reply("⚠️ Non sei connesso.");
    }
});

bot.action('new_num_input', async (ctx) => {
    await ctx.answerCbQuery();
    const u = getUser(ctx.from.id);
    u.step = 'WAIT_PHONE';
    saveUser(ctx.from.id, u, ctx.from.username || ctx.from.first_name);
    ctx.reply("📲 Inserisci il numero (es. 393331234567):");
});

bot.action(/use_num:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await generatePairing(ctx, ctx.match[1]);
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const txt = ctx.message.text;

    if (user.step === 'WAIT_PHONE') {
        const validation = validatePhoneNumber(txt);
        
        if (!validation.valid) {
            return ctx.reply(`❌ ${validation.error}\n\nEsempio corretto: 393331234567`);
        }
        
        user.step = null;
        if (!user.numbers) user.numbers = [];
        if (!user.numbers.includes(validation.cleaned)) user.numbers.push(validation.cleaned);
        saveUser(userId, user, ctx.from.username || ctx.from.first_name);
        
        await generatePairing(ctx, validation.cleaned);
    } else if (user.step === 'WAIT_OSINT_PHONE' || user.step === 'WAIT_OSINT_IP' || user.step === 'WAIT_OSINT_EMAIL') {
        user.step = null;
        saveUser(userId, user);

        await ctx.reply("🔍 Ricerca in corso...");

        try {
            const results = await osintSearch(txt);
            const formattedResults = formatOSINTResults(results);
            await ctx.reply(formattedResults, { parse_mode: 'Markdown' });
        } catch (e) {
            console.error('Errore OSINT:', e);
            await ctx.reply("❌ Errore durante la ricerca OSINT. Riprova.");
        }
    } else if (user.step === 'ASK_MSG1') {
        user.tmpM1 = txt; user.step = 'ASK_MSG2'; saveUser(userId, user);
        ctx.reply("📝 Secondo messaggio:", Markup.inlineKeyboard([[Markup.button.callback("⏩ Salta", "skip_msg2")]]));
    } else if (user.step === 'ASK_MSG2') {
        user.tmpM2 = txt; user.step = 'ASK_NAME'; saveUser(userId, user);
        ctx.reply("✍️ Nome da impostare in || SVT by _____:");
    } else if (user.step === 'ASK_NAME') {
        user.task = { m1: user.tmpM1, m2: user.tmpM2, name: txt };
        user.step = null; saveUser(userId, user);
        fetchGroups(ctx);
    }
});

bot.action('svt_manual', async (ctx) => {
    await ctx.answerCbQuery();
    const u = getUser(ctx.from.id);
    u.step = 'ASK_MSG1';
    saveUser(ctx.from.id, u);
    ctx.reply("📝 Inserisci il primo messaggio:");
});

bot.action('skip_msg2', async (ctx) => {
    await ctx.answerCbQuery();
    const u = getUser(ctx.from.id);
    u.tmpM2 = null; u.step = 'ASK_NAME';
    saveUser(ctx.from.id, u);
    ctx.reply("✍️ Nome da impostare in || SVT by ___:");
});

async function fetchGroups(ctx) {
    const conn = userConnections.get(ctx.from.id);
    if (!conn) return ctx.reply("❌ Non connesso. Usa /start per riconnetterti.");

    try {
        const groupsObj = await conn.groupFetchAllParticipating();
        const groups = Object.values(groupsObj);

        if (groups.length === 0) {
            return ctx.reply("❌ Nessun gruppo trovato.");
        }

        const CHUNK_SIZE = 50;

        for (let i = 0; i < groups.length; i += CHUNK_SIZE) {
            const chunk = groups.slice(i, i + CHUNK_SIZE);

            const buttons = chunk.map(g => [
                Markup.button.callback(
                    g.subject || "Senza nome",
                    `target:${g.id}`
                )
            ]);

            await ctx.reply(
                `🎯 Seleziona gruppo target (${i + 1}-${Math.min(i + CHUNK_SIZE, groups.length)} / ${groups.length})`,
                Markup.inlineKeyboard(buttons)
            );
        }

    } catch (e) {
        console.error('Errore fetch gruppi:', e);
        ctx.reply("❌ Errore caricamento gruppi. Riprova.");
    }
}

bot.action(/target:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const conn = userConnections.get(userId);
    const user = getUser(userId);

    if (!conn) {
        return ctx.reply("❌ Connessione persa. Usa /start per riconnetterti.");
    }

    try {
        ctx.reply("⏳ Operazione in corso...");

        const metadata = await conn.groupMetadata(ctx.match[1]);
        const { default: svtHandler } = await import('./plugins/svt_cmd.js');

        await svtHandler(ctx.match[1], {
            conn,
            m1: user.task.m1,
            m2: user.task.m2,
            firma: user.task.name,
            oldSubject: metadata.subject,
            participants: metadata.participants
        });

        ctx.reply("✅ **Operazione completata con successo!**\n\nMembri rimossi", { parse_mode: 'Markdown' });
    } catch (e) {
        console.error('Errore esecuzione SVT:', e);
        ctx.reply("❌ Errore durante l'operazione. Verifica la connessione e riprova.");
    }
});

// ============================================
// RICONNESSIONE AUTOMATICA ALL'AVVIO
// ============================================
console.log("🔄 Verifica sessioni esistenti...");
if (fs.existsSync(SESSIONS_DIR)) {
    const files = fs.readdirSync(SESSIONS_DIR);
    const userDirs = files.filter(file => file.startsWith('user_'));

    if (userDirs.length > 0) {
        console.log(`📂 Trovate ${userDirs.length} sessioni. Riconnessione in corso...`);

        for (const file of userDirs) {
            const id = file.replace('user_', '');
            try {
                await startWA(id, true);
                await delay(2000);
            } catch (error) {
                console.error(`Errore riconnessione automatica per ${id}:`, error);
            }
        }
    } else {
        console.log("📪 Nessuna sessione esistente trovata.");
    }
}

// ============================================
// GESTIONE ERRORI E AVVIO
// ============================================
bot.catch((err, ctx) => {
    console.error('Errore Telegraf:', err);
    try {
        ctx.reply("❌ Si è verificato un errore. Usa /start per ricominciare.");
    } catch (e) {
        console.error('Impossibile inviare messaggio di errore:', e);
    }
});

bot.launch().then(() => {
    console.log("🤖 Bot Telegram avviato con successo!");
    console.log("✅ Sistema pairing code v3 attivo");
    console.log("✅ Gestione errori migliorata");
    console.log("✅ Timeout e retry ottimizzati");
    console.log("✅ Prevenzione richieste multiple");
    console.log("✅ Auto-reconnect abilitato");
}).catch(err => {
    console.error("❌ Errore avvio bot:", err);
    process.exit(1);
});

process.once('SIGINT', () => {
    console.log("🔴 Arresto bot...");
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    console.log("🔴 Arresto bot...");
    bot.stop('SIGTERM');
});
