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

    // Convert state to minified format for storage (0-1 positions to 0-999 integers)
    function toStorageFormat(state) {
        return {
            t: state.title,
            s: state.scopes.map(scope => ({
                i: scope.id,
                n: scope.name,
                p: Math.round(scope.position * 999)
            }))
        };
    }

    // Convert minified state back to internal format (0-999 positions to 0-1 floats)
    function fromStorageFormat(minified) {
        return {
            title: minified.t,
            scopes: minified.s.map(scope => ({
                id: scope.i,
                name: scope.n,
                position: scope.p / 999
            }))
        };
    }

    // Serialize state to URL-safe compressed string
    function serialize(state) {
        const minified = toStorageFormat(state);
        const json = JSON.stringify(minified);
        return LZString.compressToEncodedURIComponent(json);
    }

    // Deserialize state from URL string
    function deserialize(encoded) {
        try {
            const json = LZString.decompressFromEncodedURIComponent(encoded);
            if (!json) {
                console.warn('Failed to decompress state from URL');
                return null;
            }
            const minified = JSON.parse(json);
            return fromStorageFormat(minified);
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
        addScope(name, position = 0) {
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
