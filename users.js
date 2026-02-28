import fs from 'fs';
import path from 'path';

const USERS_DIR = './users_data';

// Crea la cartella se non esiste
if (!fs.existsSync(USERS_DIR)) {
    fs.mkdirSync(USERS_DIR);
}

/**
 * Salva i dati dell'utente includendo il nome nel nome del file
 * @param {number|string} userId - ID Telegram
 * @param {object} data - Dati dell'utente
 * @param {string} username - Username o Nome dell'utente
 */
export const saveUser = (userId, data, username = 'unknown') => {
    // Pulisce il nome per evitare caratteri vietati nei file
    const safeName = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = path.join(USERS_DIR, `${userId}_${safeName}.json`);
    
    // Rimuove eventuali vecchi file dello stesso utente con nomi diversi
    const files = fs.readdirSync(USERS_DIR);
    files.forEach(file => {
        if (file.startsWith(`${userId}_`)) {
            fs.unlinkSync(path.join(USERS_DIR, file));
        }
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

/**
 * Recupera i dati dell'utente
 */
export const getUser = (userId) => {
    const files = fs.readdirSync(USERS_DIR);
    const userFile = files.find(file => file.startsWith(`${userId}_`));

    if (userFile) {
        const rawData = fs.readFileSync(path.join(USERS_DIR, userFile));
        return JSON.parse(rawData);
    }

    // Se l'utente non esiste, restituisce un oggetto vuoto predefinito
    return {
        numbers: [],
        step: null,
        task: {}
    };
};

