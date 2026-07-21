// Main Application Module
const App = (function () {
    let svg;
    let editingScopeId = null;
    let renderQueued = false;

    // Initialize the application
    function init() {
        svg = document.getElementById('hill-svg');

        // Initialize state from URL or defaults; surface load problems as toasts
        State.init((msg) => UI.notify(msg, 'error'));

        // Subscribe to state changes (coalesced through rAF: dragging fires a
        // state update per pointer move, and each render re-measures labels)
        State.subscribe(scheduleRender);

        // Set up event listeners
        setupEventListeners();

        // Initial render
        render();

        // Label widths are measured during render; re-render once the webfont
        // arrives so truncation and collision layout use real metrics
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(scheduleRender);
        }
    }

    function scheduleRender() {
        if (renderQueued) return;
        renderQueued = true;
        requestAnimationFrame(() => {
            renderQueued = false;
            render();
        });
    }

    // Render the entire chart
    function render() {
        const state = State.get();

        // Update title, but never while the user is typing in it (rewriting the
        // value mid-IME-composition breaks CJK input)
        const titleInput = document.getElementById('chart-title');
        if (document.activeElement !== titleInput && titleInput.value !== state.title) {
            titleInput.value = state.title;
        }

        // Render hill curve (always sketchy)
        Hill.render(svg);

        // Render scopes
        Scope.renderAll(svg);
    }

    // Set up all event listeners
    function setupEventListeners() {
        // Title change
        const titleInput = document.getElementById('chart-title');
        titleInput.addEventListener('input', (e) => {
            State.update({ title: e.target.value });
        });

        // Toolbar buttons
        document.getElementById('add-scope-btn').addEventListener('click', showAddScopeModal);
        document.getElementById('help-btn').addEventListener('click', showHelpModal);
        document.getElementById('copy-link-btn').addEventListener('click', Export.copyLink);
        document.getElementById('export-btn').addEventListener('click', Export.copyToClipboard);

        const addModal = document.getElementById('add-scope-modal');
        const scopeNameInput = document.getElementById('scope-name-input');
        const editModal = document.getElementById('edit-scope-modal');
        const editNameInput = document.getElementById('edit-scope-name-input');
        const helpModal = document.getElementById('help-modal');

        // Add modal handlers (Escape/backdrop/focus handled by UI.openModal)
        document.getElementById('modal-cancel').addEventListener('click', () => UI.closeModal(addModal));

        document.getElementById('modal-add').addEventListener('click', () => {
            const name = scopeNameInput.value.trim();
            if (name) {
                State.addScope(name);
                scopeNameInput.value = '';
                UI.closeModal(addModal);
            }
        });

        scopeNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('modal-add').click();
            }
        });

        // Edit modal handlers
        document.getElementById('edit-modal-cancel').addEventListener('click', () => UI.closeModal(editModal));

        document.getElementById('modal-save').addEventListener('click', () => {
            if (editingScopeId) {
                const name = editNameInput.value.trim();
                if (name) {
                    State.updateScope(editingScopeId, { name });
                }
                UI.closeModal(editModal);
            }
        });

        document.getElementById('modal-delete').addEventListener('click', () => {
            if (editingScopeId) {
                State.removeScope(editingScopeId);
                UI.closeModal(editModal);
            }
        });

        editNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('modal-save').click();
            }
        });

        // Help modal handler
        document.getElementById('help-modal-close').addEventListener('click', () => UI.closeModal(helpModal));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger on modified keys, while typing, or while a modal is open
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const t = e.target;
            if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
            if (document.querySelector('.modal-overlay.active')) return;

            if (e.key === 'n' || e.key === 'N') {
                showAddScopeModal();
            }
        });
    }

    // Show add scope modal
    function showAddScopeModal() {
        const modal = document.getElementById('add-scope-modal');
        const input = document.getElementById('scope-name-input');
        UI.openModal(modal, { initialFocus: input });
    }

    // Show edit scope modal
    function showEditScopeModal(scopeId) {
        const scope = State.getScope(scopeId);
        if (!scope) return;

        editingScopeId = scopeId;
        const modal = document.getElementById('edit-scope-modal');
        const input = document.getElementById('edit-scope-name-input');
        input.value = scope.name;
        UI.openModal(modal, {
            initialFocus: input,
            selectText: true,
            onClose: () => { editingScopeId = null; }
        });
    }

    // Show help modal
    function showHelpModal() {
        const modal = document.getElementById('help-modal');
        UI.openModal(modal, { initialFocus: document.getElementById('help-modal-close') });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        showEditScopeModal
    };
})();
