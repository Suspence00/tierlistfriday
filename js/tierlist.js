/* ============================================================
   tierlist.js — Drag-and-drop tier ranking for participants
   ============================================================ */

import { $, $$, showToast, createItemElement, autoFindImage } from './utils.js';

let sessionData = null;

/**
 * Initialize the tier list view with decoded session data.
 * @param {Object} data - { w: webhook, t: topic, i: [{n, g?}] }
 */
export function initTierList(data) {
    sessionData = data;

    // Set topic title
    $('#tier-topic-title').textContent = data.t;

    // Name starts blank — user must enter it fresh each time
    // Save name on change for the capture header
    $('#display-name').addEventListener('input', (e) => {
        localStorage.setItem('tl_displayname', e.target.value.trim());
    });

    // "Create New" button — go back to organizer
    $('#create-new-btn').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = window.location.origin + window.location.pathname;
    });

    // "Edit Tierlist" button — returns to organizer with CURRENT items
    $('#edit-tierlist-btn').addEventListener('click', (e) => {
        e.preventDefault();
        const state = getTierListState();
        
        // Flatten all items from tiers and pool into a single array
        const allItems = [];
        Object.values(state.tiers).forEach(tierArr => allItems.push(...tierArr));
        allItems.push(...state.unranked);
        
        // Dynamically import organizer to avoid circular dependency issues
        import('./organizer.js').then(module => {
            module.loadIntoOrganizer(state.topic, allItems, state.proxy);
        });
    });

    // Populate item pool
    const pool = $('#item-pool');
    pool.innerHTML = '';

    for (const rawItem of data.i) {
        const item = { name: rawItem.n, img: rawItem.g };
        const el = createItemElement(item);
        pool.appendChild(el);
    }

    // Initialize SortableJS on pool and all tier rows
    initSortable();

    // Custom item UI
    bindCustomItemEvents();

    // Tap to move functionality
    bindTapToMove();
}

function initSortable() {
    const groupConfig = {
        name: 'tierlist',
        pull: true,
        put: true,
    };

    const commonOptions = {
        group: groupConfig,
        animation: 180,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        delay: 50,
        delayOnTouchOnly: true,
        touchStartThreshold: 3,
    };

    // Pool
    new Sortable($('#item-pool'), { ...commonOptions });

    // Tier rows
    const tiers = ['s', 'a', 'b', 'c', 'd', 'f'];
    for (const tier of tiers) {
        new Sortable($(`#tier-${tier}`), { ...commonOptions });
    }
}

function bindCustomItemEvents() {
    const addBtn = $('#add-custom-btn');
    const form = $('#custom-item-form');
    const nameInput = $('#custom-item-name');
    const imgInput = $('#custom-item-image');
    const confirmBtn = $('#custom-item-add-btn');
    const cancelBtn = $('#custom-item-cancel-btn');

    addBtn.addEventListener('click', () => {
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) {
            nameInput.focus();
        }
    });

    cancelBtn.addEventListener('click', () => {
        form.classList.add('hidden');
        nameInput.value = '';
        imgInput.value = '';
    });

    const searchBtn = $('#custom-search-image-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const name = nameInput.value.trim();
            if (!name) {
                showToast('Enter an item name first to search for an image.', 'error');
                nameInput.focus();
                return;
            }

            const originalText = searchBtn.textContent;
            searchBtn.textContent = '⏳';
            searchBtn.disabled = true;

            const url = await autoFindImage(name);
            if (url) {
                imgInput.value = url;
                showToast('Image found!', 'success');
            }
            
            searchBtn.textContent = originalText;
            searchBtn.disabled = false;
        });
    }

    confirmBtn.addEventListener('click', addCustomItem);
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addCustomItem();
    });

    function addCustomItem() {
        const name = nameInput.value.trim();
        if (!name) {
            nameInput.focus();
            return;
        }

        // Check for duplicates across all zones
        const allItems = $$('.tier-item');
        for (const el of allItems) {
            if (el.dataset.name.toLowerCase() === name.toLowerCase()) {
                showToast('Item already exists!', 'error');
                return;
            }
        }

        const img = imgInput.value.trim() || undefined;
        const item = { name, img };
        const el = createItemElement(item);
        
        // Add to pool with a subtle entrance
        el.style.opacity = '0';
        el.style.transform = 'scale(0.8)';
        $('#item-pool').appendChild(el);
        
        requestAnimationFrame(() => {
            el.style.transition = 'opacity 0.25s, transform 0.25s';
            el.style.opacity = '1';
            el.style.transform = 'scale(1)';
        });

        nameInput.value = '';
        imgInput.value = '';
        nameInput.focus();
        showToast(`Added "${name}"`, 'success');
    }
}

/**
 * Get the current tier list state as a summary object.
 * @returns {Object} { topic, name, tiers: { S: [...], A: [...], ... }, unranked: [...] }
 */
export function getTierListState() {
    const tiers = {};
    const tierIds = ['s', 'a', 'b', 'c', 'd', 'f'];

    for (const tid of tierIds) {
        const items = Array.from($$(`#tier-${tid} .tier-item`));
        tiers[tid.toUpperCase()] = items.map(el => ({
            name: el.dataset.name,
            img: el.dataset.img || undefined,
        }));
    }

    const unranked = Array.from($$('#item-pool .tier-item')).map(el => ({
        name: el.dataset.name,
        img: el.dataset.img || undefined,
    }));

    return {
        topic: sessionData.t,
        name: $('#display-name').value.trim() || 'Anonymous',
        tiers,
        unranked,
        webhook: sessionData.w,
        proxy: sessionData.p,
    };
}

let selectedItemForMove = null;

function bindTapToMove() {
    document.addEventListener('click', (e) => {
        // 1. Click on item
        const itemClicked = e.target.closest('.tier-item');
        if (itemClicked) {
            if (selectedItemForMove === itemClicked) {
                // Deselect current item
                itemClicked.classList.remove('selected-for-move');
                selectedItemForMove = null;
            } else {
                // Select new item
                if (selectedItemForMove) {
                    selectedItemForMove.classList.remove('selected-for-move');
                }
                itemClicked.classList.add('selected-for-move');
                selectedItemForMove = itemClicked;
            }
            return;
        }

        // 2. Click on destination with an active item
        if (selectedItemForMove) {
            const tierRow = e.target.closest('.tier-row');
            const pool = e.target.closest('.pool-section'); // More forgiving hit area for the pool

            let targetContainer = null;
            if (tierRow) targetContainer = tierRow.querySelector('.tier-items');
            else if (pool) targetContainer = pool.querySelector('.item-pool');

            if (targetContainer) {
                targetContainer.appendChild(selectedItemForMove);
            }
            
            // Clear selection
            selectedItemForMove.classList.remove('selected-for-move');
            selectedItemForMove = null;
        }
    });
}
