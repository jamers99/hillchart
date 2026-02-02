// State Management Module
const State = (function () {
    // Default state
    const defaultState = {
        title: 'My Hill Chart',
        scopes: []
    };

    // Current state
    let state = { ...defaultState };

    // Subscribers for state changes
    const subscribers = [];

    // Generate a short unique ID
    function generateId() {
        return Math.random().toString(36).substring(2, 8);
    }

    // Serialize state to URL-safe string
    function serialize(state) {
        const json = JSON.stringify(state);
        // Use base64 encoding with URI encoding for special chars
        return btoa(unescape(encodeURIComponent(json)));
    }

    // Deserialize state from URL string
    function deserialize(encoded) {
        try {
            const json = decodeURIComponent(escape(atob(encoded)));
            return JSON.parse(json);
        } catch (e) {
            console.warn('Failed to parse state from URL:', e);
            return null;
        }
    }

    // Push state to URL hash (debounced)
    let urlUpdateTimeout;
    function pushToURL(immediate = false) {
        const update = () => {
            const encoded = serialize(state);
            history.replaceState(null, '', `#${encoded}`);
        };

        if (immediate) {
            clearTimeout(urlUpdateTimeout);
            update();
        } else {
            clearTimeout(urlUpdateTimeout);
            urlUpdateTimeout = setTimeout(update, 300);
        }
    }

    // Load state from URL hash
    function loadFromURL() {
        const hash = window.location.hash.slice(1);
        if (hash) {
            const loaded = deserialize(hash);
            if (loaded) {
                state = { ...defaultState, ...loaded };
                return true;
            }
        }
        return false;
    }

    // Notify all subscribers of state change
    function notify() {
        subscribers.forEach(cb => cb(state));
    }

    return {
        // Initialize state from URL or defaults
        init() {
            loadFromURL();

            // Handle browser back/forward
            window.addEventListener('hashchange', () => {
                if (loadFromURL()) {
                    notify();
                }
            });

            return state;
        },

        // Get current state
        get() {
            return { ...state };
        },

        // Update state
        update(partial, skipURL = false) {
            state = { ...state, ...partial };
            if (!skipURL) {
                pushToURL();
            }
            notify();
        },

        // Add a new scope
        addScope(name, position = 0.1) {
            const newScope = {
                id: generateId(),
                name: name.trim() || 'New Scope',
                position: position
            };
            state.scopes = [...state.scopes, newScope];
            pushToURL(true);
            notify();
            return newScope;
        },

        // Update a scope
        updateScope(id, updates) {
            state.scopes = state.scopes.map(scope =>
                scope.id === id ? { ...scope, ...updates } : scope
            );
            pushToURL();
            notify();
        },

        // Remove a scope
        removeScope(id) {
            state.scopes = state.scopes.filter(scope => scope.id !== id);
            pushToURL(true);
            notify();
        },

        // Get scope by ID
        getScope(id) {
            return state.scopes.find(scope => scope.id === id);
        },

        // Subscribe to state changes
        subscribe(callback) {
            subscribers.push(callback);
            // Return unsubscribe function
            return () => {
                const idx = subscribers.indexOf(callback);
                if (idx > -1) subscribers.splice(idx, 1);
            };
        },

        // Get shareable URL
        getShareableURL() {
            pushToURL(true);
            return window.location.href;
        }
    };
})();
