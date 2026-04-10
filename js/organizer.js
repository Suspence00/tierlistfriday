/* ============================================================
   organizer.js — Topic builder, webhook config, link generator
   ============================================================ */

import { $, showToast, generateSessionURL, copyToClipboard } from './utils.js';

let items = []; // { name: string, img?: string }
let eventsBound = false;

/**
 * Initialize the organizer view.
 */
export function initOrganizer() {
    loadWebhook();
    bindEvents();
    renderItems();
    updateItemCount();
}

/**
 * Load existing data into the organizer to edit it.
 */
export function loadIntoOrganizer(topic, initialItems) {
    $('#topic-name').value = topic;
    items = initialItems;
    
    // Make sure events are bound if we skipped initOrganizer (i.e. direct link to tier list)
    bindEvents();
    
    renderItems();
    updateItemCount();

    // Switch views
    document.getElementById('organizer-view').classList.remove('hidden');
    document.getElementById('participant-view').classList.add('hidden');
    window.location.hash = ''; // Clear hash so reload doesn't recreate tier list
}

function loadWebhook() {
    const saved = localStorage.getItem('tl_webhook');
    if (saved) {
        $('#webhook-url').value = saved;
    }
}

function saveWebhook() {
    const url = $('#webhook-url').value.trim();
    if (url) {
        localStorage.setItem('tl_webhook', url);
    }
}

function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    // Webhook test
    $('#test-webhook-btn').addEventListener('click', testWebhook);
    $('#webhook-url').addEventListener('change', saveWebhook);

    // Add item
    $('#add-item-btn').addEventListener('click', addItem);
    $('#new-item-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addItem();
    });

    // Bulk add
    $('#bulk-add-toggle').addEventListener('click', toggleBulkAdd);
    $('#bulk-add-btn').addEventListener('click', bulkAdd);

    // Generate link
    $('#generate-link-btn').addEventListener('click', generateLink);
    $('#copy-link-btn')?.addEventListener('click', copyLink);
    $('#open-tierlist-btn')?.addEventListener('click', openTierList);
}

async function testWebhook() {
    const url = $('#webhook-url').value.trim();
    const status = $('#webhook-status');

    if (!url || !url.startsWith('https://discord.com/api/webhooks/')) {
        status.textContent = 'Enter a valid Discord webhook URL.';
        status.className = 'status-msg error';
        return;
    }

    saveWebhook();
    status.textContent = 'Sending test...';
    status.className = 'status-msg';

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: '🏆 **Tierlist Friday** webhook is connected! Let the rankings begin.',
                username: 'Tierlist Friday',
            }),
        });

        if (resp.ok || resp.status === 204) {
            status.textContent = '✓ Test message sent! Check your Discord channel.';
            status.className = 'status-msg success';
        } else {
            const err = await resp.text();
            status.textContent = `Failed (${resp.status}): ${err}`;
            status.className = 'status-msg error';
        }
    } catch (e) {
        status.textContent = `Network error: ${e.message}`;
        status.className = 'status-msg error';
    }
}

function addItem() {
    const nameInput = $('#new-item-name');
    const imgInput = $('#new-item-image');
    const name = nameInput.value.trim();

    if (!name) {
        nameInput.focus();
        return;
    }

    // Prevent duplicates
    if (items.some(i => i.name.toLowerCase() === name.toLowerCase())) {
        showToast('Item already exists!', 'error');
        return;
    }

    const img = imgInput.value.trim() || undefined;
    items.push({ name, img });
    nameInput.value = '';
    imgInput.value = '';
    nameInput.focus();
    renderItems();
}

function editItem(index) {
    const item = items[index];
    
    // Remove it from the list
    items.splice(index, 1);
    
    // Put its data back into the form fields
    $('#new-item-name').value = item.name;
    $('#new-item-image').value = item.img || '';
    
    // Focus to let them edit
    $('#new-item-name').focus();
    
    renderItems();
}

function removeItem(index) {
    items.splice(index, 1);
    renderItems();
}

function toggleBulkAdd() {
    const area = $('#bulk-add-area');
    area.classList.toggle('hidden');
    if (!area.classList.contains('hidden')) {
        $('#bulk-add-text').focus();
    }
}

function bulkAdd() {
    // Auto-flush any pending item in the name input first
    flushPendingItem();

    const text = $('#bulk-add-text').value;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let added = 0;
    let skipped = 0;

    for (const line of lines) {
        if (!items.some(i => i.name.toLowerCase() === line.toLowerCase())) {
            items.push({ name: line });
            added++;
        } else {
            skipped++;
        }
    }

    $('#bulk-add-text').value = '';
    $('#bulk-add-area').classList.add('hidden');
    renderItems();

    let msg = `Added ${added} item${added !== 1 ? 's' : ''}`;
    if (skipped > 0) msg += ` (${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped)`;
    showToast(msg, added > 0 ? 'success' : 'error');
}

/**
 * If there's text sitting in the name input, add it as an item.
 * Prevents losing items when the user types a name then clicks
 * Bulk Add or Generate Link instead of "+ Add".
 */
function flushPendingItem() {
    const nameInput = $('#new-item-name');
    const name = nameInput.value.trim();
    if (!name) return;
    if (items.some(i => i.name.toLowerCase() === name.toLowerCase())) return;

    const imgInput = $('#new-item-image');
    const img = imgInput.value.trim() || undefined;
    items.push({ name, img });
    nameInput.value = '';
    imgInput.value = '';
}

function renderItems() {
    const list = $('#item-list');
    list.innerHTML = '';

    // Update item count
    updateItemCount();

    if (items.length === 0) {
        list.innerHTML = '<p class="section-desc" style="text-align:center; padding: 24px;">No items yet. Add some above!</p>';
        return;
    }

    items.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'item-entry';
        row.innerHTML = `
            <span class="item-entry-drag" title="Drag to reorder">⠿</span>
            ${item.img ? `<img class="item-entry-thumb" src="${escapeAttr(item.img)}" alt="" onerror="this.style.display='none'">` : ''}
            <span class="item-entry-name">${escapeHTML(item.name)}</span>
            ${item.img ? `<span class="item-entry-img" title="${escapeAttr(item.img)}">${truncate(item.img, 30)}</span>` : ''}
            <div style="display:flex; gap:4px; margin-left:auto;">
                <button class="btn btn-edit" data-idx="${idx}" title="Edit" style="background:transparent; border:none; opacity:0.5; cursor:pointer;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.5">✏️</button>
                <button class="btn btn-danger" data-idx="${idx}" title="Remove">✕</button>
            </div>
        `;
        row.querySelector('.btn-edit').addEventListener('click', () => editItem(idx));
        row.querySelector('.btn-danger').addEventListener('click', () => removeItem(idx));
        list.appendChild(row);
    });

    // Make list sortable
    if (list._sortable) list._sortable.destroy();
    list._sortable = new Sortable(list, {
        animation: 150,
        handle: '.item-entry-drag',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
            const [moved] = items.splice(evt.oldIndex, 1);
            items.splice(evt.newIndex, 0, moved);
        },
    });
}

function updateItemCount() {
    let counter = $('#item-count');
    if (!counter) {
        // Create the counter element once
        counter = document.createElement('div');
        counter.id = 'item-count';
        counter.className = 'item-count';
        const section = $('#items-section');
        const sectionHeader = section.querySelector('.section-header');
        sectionHeader.appendChild(counter);
    }
    if (items.length === 0) {
        counter.textContent = '';
    } else {
        counter.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
    }
}

function generateLink() {
    // Auto-flush any pending item in the name input
    flushPendingItem();
    renderItems();

    const webhook = $('#webhook-url').value.trim();
    const topic = $('#topic-name').value.trim();
    const status = $('#generate-status');

    // Validate webhook format only if provided
    if (webhook && !webhook.startsWith('https://discord.com/api/webhooks/')) {
        status.textContent = 'That doesn\'t look like a valid Discord webhook URL.';
        status.className = 'status-msg error';
        return;
    }
    if (!topic) {
        status.textContent = 'Please enter a topic name.';
        status.className = 'status-msg error';
        return;
    }
    if (items.length < 2) {
        status.textContent = `Add at least 2 items to rank. Currently: ${items.length}.`;
        status.className = 'status-msg error';
        return;
    }

    if (webhook) saveWebhook();

    const sessionData = {
        w: webhook || '',
        t: topic,
        i: items.map(item => item.img ? { n: item.name, g: item.img } : { n: item.name }),
    };

    const url = generateSessionURL(sessionData);
    const linkArea = $('#generated-link-area');
    const linkInput = $('#generated-link');

    linkInput.value = url;
    linkArea.classList.remove('hidden');
    status.textContent = '';

    // Auto copy
    copyLink();

    if (!webhook) {
        status.textContent = 'No webhook set — Discord sharing will be disabled. Download will still work!';
        status.className = 'status-msg';
        status.style.color = 'var(--text-secondary)';
    }
}

function openTierList() {
    const linkInput = $('#generated-link');
    if (linkInput.value) {
        window.open(linkInput.value, '_blank');
    }
}

async function copyLink() {
    const linkInput = $('#generated-link');
    const ok = await copyToClipboard(linkInput.value);
    if (ok) {
        showToast('Link copied to clipboard!', 'success');
    } else {
        showToast('Copy failed — select and copy manually', 'error');
        linkInput.select();
    }
}

// --- Helpers ---
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
}
