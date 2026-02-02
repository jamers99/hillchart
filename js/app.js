// Main Application Module
const App = (function() {
    let svg;
    let editingScopeId = null;

    // Initialize the application
    function init() {
        svg = document.getElementById('hill-svg');

        // Initialize state from URL or defaults
        State.init();

        // Subscribe to state changes
        State.subscribe(render);

        // Set up event listeners
        setupEventListeners();

        // Initial render
        render();
    }

    // Render the entire chart
    function render() {
        const state = State.get();

        // Update title
        document.getElementById('chart-title').value = state.title;

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

        // Add scope button
        document.getElementById('add-scope-btn').addEventListener('click', showAddScopeModal);

        // Copy link button
        document.getElementById('copy-link-btn').addEventListener('click', Export.copyLink);

        // Export image button
        document.getElementById('export-btn').addEventListener('click', Export.copyToClipboard);

        // Add scope modal
        const addModal = document.getElementById('add-scope-modal');
        const scopeNameInput = document.getElementById('scope-name-input');

        document.getElementById('modal-cancel').addEventListener('click', () => {
            addModal.classList.remove('active');
        });

        document.getElementById('modal-add').addEventListener('click', () => {
            const name = scopeNameInput.value.trim();
            if (name) {
                State.addScope(name);
                scopeNameInput.value = '';
                addModal.classList.remove('active');
            }
        });

        // Enter key in add modal
        scopeNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('modal-add').click();
            } else if (e.key === 'Escape') {
                addModal.classList.remove('active');
            }
        });

        // Edit scope modal
        const editModal = document.getElementById('edit-scope-modal');
        const editNameInput = document.getElementById('edit-scope-name-input');

        document.getElementById('edit-modal-cancel').addEventListener('click', () => {
            editModal.classList.remove('active');
            editingScopeId = null;
        });

        document.getElementById('modal-save').addEventListener('click', () => {
            if (editingScopeId) {
                const name = editNameInput.value.trim();
                if (name) {
                    State.updateScope(editingScopeId, { name });
                }
                editModal.classList.remove('active');
                editingScopeId = null;
            }
        });

        document.getElementById('modal-delete').addEventListener('click', () => {
            if (editingScopeId) {
                State.removeScope(editingScopeId);
                editModal.classList.remove('active');
                editingScopeId = null;
            }
        });

        // Enter key in edit modal
        editNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('modal-save').click();
            } else if (e.key === 'Escape') {
                editModal.classList.remove('active');
                editingScopeId = null;
            }
        });

        // Close modals on backdrop click
        addModal.addEventListener('click', (e) => {
            if (e.target === addModal) {
                addModal.classList.remove('active');
            }
        });

        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                editModal.classList.remove('active');
                editingScopeId = null;
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT') return;

            if (e.key === 'n' || e.key === 'N') {
                showAddScopeModal();
            }
        });
    }

    // Show add scope modal
    function showAddScopeModal() {
        const modal = document.getElementById('add-scope-modal');
        const input = document.getElementById('scope-name-input');
        modal.classList.add('active');
        setTimeout(() => input.focus(), 100);
    }

    // Show edit scope modal
    function showEditScopeModal(scopeId) {
        const scope = State.getScope(scopeId);
        if (!scope) return;

        editingScopeId = scopeId;
        const modal = document.getElementById('edit-scope-modal');
        const input = document.getElementById('edit-scope-name-input');
        input.value = scope.name;
        modal.classList.add('active');
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);
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
