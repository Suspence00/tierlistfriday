/* ============================================================
   utils.js — URL encoding/decoding & DOM helpers
   ============================================================ */

/**
 * Encode a session object into a URL-safe string using LZString compression.
 * @param {Object} data - { webhook, topic, items: [{name, img?}] }
 * @returns {string} Compressed, base64-encoded string
 */
export function encodeSession(data) {
    const json = JSON.stringify(data);
    return LZString.compressToEncodedURIComponent(json);
}

/**
 * Decode a URL hash string back into a session object.
 * @param {string} encoded - The compressed string from the URL hash
 * @returns {Object|null} The session data, or null if invalid
 */
export function decodeSession(encoded) {
    try {
        const json = LZString.decompressFromEncodedURIComponent(encoded);
        if (!json) return null;
        return JSON.parse(json);
    } catch (e) {
        console.error('Failed to decode session:', e);
        return null;
    }
}

/**
 * Get session data from the current URL hash.
 * @returns {Object|null}
 */
export function getSessionFromURL() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#data=')) return null;
    const encoded = hash.slice(6); // Remove '#data='
    return decodeSession(encoded);
}

/**
 * Generate a full URL with session data encoded in the hash.
 * @param {Object} data - Session data
 * @returns {string} Full URL
 */
export function generateSessionURL(data) {
    const encoded = encodeSession(data);
    const base = window.location.origin + window.location.pathname;
    return `${base}#data=${encoded}`;
}

/**
 * Simple DOM query shorthand.
 */
export function $(selector) {
    return document.querySelector(selector);
}

export function $$(selector) {
    return document.querySelectorAll(selector);
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 3500) {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('leaving');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

/**
 * Generate a deterministic color from a string (for item card accents).
 * @param {string} str
 * @returns {string} HSL color string
 */
export function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 55%, 50%)`;
}

/**
 * Create a tier item DOM element.
 * @param {Object} item - { name, img? }
 * @returns {HTMLElement}
 */
export function createItemElement(item) {
    const el = document.createElement('div');
    el.className = 'tier-item';
    el.dataset.name = item.name;

    if (item.img) {
        el.dataset.img = item.img;
        const img = document.createElement('img');
        img.className = 'tier-item-img';
        
        const isDataUri = item.img.startsWith('data:');
        if (!isDataUri) img.crossOrigin = 'anonymous';
        
        // Use proxy to ensure we get CORS headers so html2canvas doesn't fail
        img.src = isDataUri ? item.img : 'https://api.allorigins.win/raw?url=' + encodeURIComponent(item.img);
        img.alt = item.name;
        img.draggable = false;
        
        img.onerror = () => {
            if (!isDataUri && !img.dataset.failedProxy) {
                // If proxy fails, try direct as a fallback (though html2canvas might still fail later)
                img.dataset.failedProxy = 'true';
                img.removeAttribute('crossOrigin');
                img.src = item.img;
            } else {
                // If direct fails too, convert to text-only
                img.remove();
                el.classList.add('tier-item--text-only');
                el.style.borderLeftColor = stringToColor(item.name);
            }
        };
        el.appendChild(img);
    } else {
        el.classList.add('tier-item--text-only');
        el.style.borderLeftColor = stringToColor(item.name);
    }

    const nameEl = document.createElement('span');
    nameEl.className = 'tier-item-name';
    nameEl.textContent = item.name;
    el.appendChild(nameEl);

    return el;
}

/**
 * Copy text to clipboard with fallback.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            ta.remove();
            return true;
        } catch {
            ta.remove();
            return false;
        }
    }
}
