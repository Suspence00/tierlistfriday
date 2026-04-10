/* ============================================================
   share.js — Image generation, download, + Discord webhook posting
   ============================================================ */

import { $, showToast } from './utils.js';
import { getTierListState } from './tierlist.js';

/**
 * Initialize sharing functionality.
 * @param {boolean} hasWebhook - Whether a Discord webhook URL is configured
 */
export function initShare(hasWebhook) {
    $('#download-btn').addEventListener('click', downloadImage);

    if (hasWebhook) {
        $('#share-btn').addEventListener('click', shareToDiscord);
    } else {
        // Hide the Discord share button if no webhook
        $('#share-btn').classList.add('hidden');
    }
}

/**
 * Validate that the user has ranked items and entered a name.
 * @returns {Object|null} state if valid, null if not
 */
function validateState() {
    const state = getTierListState();

    const status = $('#share-status');
    status.textContent = '';

    const totalRanked = Object.values(state.tiers).reduce((sum, arr) => sum + arr.length, 0);
    if (totalRanked === 0) {
        status.textContent = 'Rank at least one item before sharing!';
        status.className = 'status-msg error';
        showToast('Rank at least one item before sharing!', 'error');
        return null;
    }

    if (!state.name || state.name === 'Anonymous') {
        const nameInput = $('#display-name');
        nameInput.focus();
        nameInput.style.borderColor = 'var(--error)';
        setTimeout(() => nameInput.style.borderColor = '', 2000);
        status.textContent = '❗ Enter your name at the top to enable saving/sharing!';
        status.className = 'status-msg error';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Enter your name first!', 'error');
        return null;
    }

    return state;
}

/**
 * Generate an image canvas of the tier list.
 * @param {Object} state - tier list state
 * @returns {Promise<HTMLCanvasElement>}
 */
async function generateImage(state) {
    // Show capture header with metadata
    const captureHeader = $('#capture-header');
    const captureTopic = $('#capture-topic');
    const captureName = $('#capture-name');

    captureHeader.classList.remove('hidden');
    captureTopic.textContent = state.topic;
    captureName.textContent = state.name;

    // --- CORS CLEANING PHASE ---
    const imageElements = Array.from(document.querySelectorAll('#tier-capture-zone .tier-item-img'));
    const originalSrcs = imageElements.map(img => img.src);
    let proxyBase = (state.proxy || '').trim();

    // Fallback: Check localStorage if the session link is old/doesn't have the proxy
    if (!proxyBase) {
        proxyBase = (localStorage.getItem('tl_proxy') || '').trim();
        if (proxyBase) console.log('Using local proxy fallback:', proxyBase);
    }

    if (proxyBase) {
        // Ensure proxy has a protocol
        if (proxyBase && !proxyBase.startsWith('http')) {
            proxyBase = 'https://' + proxyBase;
        }

        const cleanPromises = imageElements.map(async (img, idx) => {
            if (img.src.startsWith('data:')) return true;

            try {
                const urlObj = new URL(proxyBase);
                urlObj.searchParams.set('url', originalSrcs[idx]);
                const proxyUrl = urlObj.toString();
                
                const resp = await fetch(proxyUrl);
                if (!resp.ok) throw new Error(`Status ${resp.status}`);
                
                const blob = await resp.blob();
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                
                return new Promise((resolve) => {
                    img.onload = () => resolve(true);
                    img.onerror = () => resolve(false);
                    img.src = base64;
                });
            } catch (e) {
                console.error(`Proxy failed for item ${idx}:`, e);
                return false;
            }
        });

        const results = await Promise.all(cleanPromises);
        const successCount = results.filter(Boolean).length;
        showToast(`Ready! ${successCount}/${imageElements.length} images cleaned via proxy.`, 'info', 2000);
        
        // Force a double-tick wait for the layout engine to catch up
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    // Wait a tick for render
    await new Promise(r => setTimeout(r, 100));

    // Generate image
    const captureZone = $('#tier-capture-zone');
    const canvas = await html2canvas(captureZone, {
        backgroundColor: '#111114',
        scale: 2,
        useCORS: true,
        logging: false,
        width: 900,
        windowWidth: 900,
        onclone: (clonedDoc) => {
            clonedDoc.body.classList.add('is-capturing');
        }
    });

    // --- RESTORE PHASE ---
    if (proxyBase) {
        imageElements.forEach((img, i) => {
            img.src = originalSrcs[i];
        });
    }

    // Hide capture header again
    captureHeader.classList.add('hidden');

    return canvas;
}

/**
 * Download the tier list as an image file.
 */
async function downloadImage() {
    const btn = $('#download-btn');
    const state = validateState();
    if (!state) return;

    btn.classList.add('loading');
    btn.querySelector('.share-btn-text').textContent = '⏳ Generating';

    try {
        const canvas = await generateImage(state);

        // Create download link
        const link = document.createElement('a');
        link.download = `tierlist_${state.name.replace(/\s+/g, '_')}_${state.topic.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        showToast('Image downloaded! 📸', 'success');

        // Confetti!
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.7 },
                colors: ['#e8573a', '#d97b1e', '#c4a916', '#3aab5c', '#3b82c4', '#f0ece4'],
            });
        }
    } catch (err) {
        console.error('Download error:', err);
        showToast('Something went wrong generating the image.', 'error');
        $('#capture-header').classList.add('hidden');
    } finally {
        btn.classList.remove('loading');
        btn.querySelector('.share-btn-text').textContent = '💾 Download Image';
    }
}

/**
 * Generate an image of the tier list and post it to Discord via webhook.
 */
async function shareToDiscord() {
    const btn = $('#share-btn');
    const state = validateState();
    if (!state) return;

    if (!state.webhook) {
        showToast('No Discord webhook configured for this tier list.', 'error');
        return;
    }

    btn.classList.add('loading');
    btn.querySelector('.share-btn-text').textContent = '⏳ Generating';

    try {
        const canvas = await generateImage(state);

        btn.querySelector('.share-btn-text').textContent = '⏳ Sending';

        // Convert to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        // Build form data
        const formData = new FormData();
        formData.append('file', blob, `tierlist_${state.name.replace(/\s+/g, '_')}.png`);

        // Build payload
        const payload = {
            username: 'Tierlist Friday',
            embeds: [{
                title: `🏆 ${state.name}'s Tier List`,
                description: `**Topic:** ${state.topic}\n\n[Add your Entry](${window.location.href})`,
                color: 0xe8573a,
                image: { url: 'attachment://tierlist_' + state.name.replace(/\s+/g, '_') + '.png' },
                footer: { text: 'Tierlist Friday' },
                timestamp: new Date().toISOString(),
            }],
        };

        formData.append('payload_json', JSON.stringify(payload));

        // POST to webhook
        const resp = await fetch(state.webhook, {
            method: 'POST',
            body: formData,
        });

        if (resp.ok || resp.status === 204) {
            showToast('Tier list posted to Discord! 🎉', 'success');

            // Confetti!
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 120,
                    spread: 80,
                    origin: { y: 0.7 },
                    colors: ['#e8573a', '#d97b1e', '#c4a916', '#3aab5c', '#3b82c4', '#f0ece4'],
                });
            }
        } else {
            const errText = await resp.text();
            console.error('Webhook error:', resp.status, errText);
            showToast(`Discord rejected the post (${resp.status}). Try again!`, 'error');
        }
    } catch (err) {
        console.error('Share error:', err);
        showToast('Something went wrong. Check the console for details.', 'error');
        $('#capture-header').classList.add('hidden');
    } finally {
        btn.classList.remove('loading');
        btn.querySelector('.share-btn-text').textContent = '🚀 Share to Discord';
    }
}
