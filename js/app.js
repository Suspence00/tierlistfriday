/* ============================================================
   app.js — Entry point & view routing
   ============================================================ */

import { getSessionFromURL } from './utils.js';
import { initOrganizer } from './organizer.js';
import { initTierList } from './tierlist.js';
import { initShare } from './share.js';

function init() {
    const session = getSessionFromURL();

    if (session && session.t && session.i) {
        // Participant mode — show tier list
        document.getElementById('organizer-view').classList.add('hidden');
        document.getElementById('participant-view').classList.remove('hidden');
        initTierList(session);
        initShare(!!session.w); // Pass whether webhook is configured
    } else {
        // Organizer mode — show topic builder
        document.getElementById('organizer-view').classList.remove('hidden');
        document.getElementById('participant-view').classList.add('hidden');
        initOrganizer();
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
