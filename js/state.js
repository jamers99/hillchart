// State Management Module
const State = (function () {
    // Hard limits applied to anything arriving from the URL or inputs
    const MAX_SCOPES = 50;
    const MAX_NAME_LENGTH = 80;
    const MAX_TITLE_LENGTH = 100;

    // Default state
    const defaultState = {
        title: 'My Hill Chart',
        scopes: []
    };

    // Current state
    let state = { ...defaultState };

    // Subscribers for state changes
    const subscribers = [];

    // Callback for surfacing load problems (set via init; keeps this module DOM-free)
    let warnCallback = null;

    function warn(message) {
        if (warnCallback) warnCallback(message);
    }

    // lz-string is vendored locally, but degrade to a working (unshareable)
    // app rather than crashing if the file ever fails to load
    let warnedNoLZ = false;
    function lzAvailable() {
        if (typeof LZString !== 'undefined') return true;
        if (!warnedNoLZ) {
            warnedNoLZ = true;
            console.warn('lz-string failed to load; URL sharing is disabled.');
        }
        return false;
    }

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
        const scopes = Array.isArray(minified.s) ? minified.s : [];
        return {
            title: minified.t,
            scopes: scopes.filter(s => s && typeof s === 'object').map(scope => ({
                id: scope.i,
                name: scope.n,
                position: scope.p / 999
            }))
        };
    }

    // Repair anything malformed in a deserialized state. Shared links are
    // user-editable text, so every field must be assumed hostile.
    function sanitize(raw) {
        const warnings = [];
        let repaired = false;

        let title;
        if (typeof raw.title === 'string') {
            title = raw.title.slice(0, MAX_TITLE_LENGTH);
            if (title !== raw.title) repaired = true;
        } else {
            title = defaultState.title;
            repaired = true;
        }

        let scopes = Array.isArray(raw.scopes) ? raw.scopes : [];
        if (scopes.length > MAX_SCOPES) {
            scopes = scopes.slice(0, MAX_SCOPES);
            warnings.push(`This link has too many scopes. Showing the first ${MAX_SCOPES}.`);
        }

        const seen = new Set();
        const cleanScopes = scopes.map(scope => {
            let name;
            if (typeof scope.name === 'string' && scope.name.trim()) {
                name = scope.name.trim().slice(0, MAX_NAME_LENGTH);
                if (name !== scope.name) repaired = true;
            } else {
                name = 'Scope';
                repaired = true;
            }

            const num = Number(scope.position);
            let position;
            if (Number.isFinite(num)) {
                position = Math.min(1, Math.max(0, num));
                if (position !== num) repaired = true;
            } else {
                position = 0;
                repaired = true;
            }

            let id = (typeof scope.id === 'string' && scope.id) ? scope.id.slice(0, 12) : null;
            if (!id || seen.has(id)) {
                id = generateId();
                repaired = true;
            }
            seen.add(id);

            return { id, name, position };
        });

        if (repaired) {
            warnings.push('Some data in this link was invalid and was repaired.');
        }

        return { state: { title, scopes: cleanScopes }, warnings };
    }

    // Serialize state to URL-safe compressed string
    function serialize(state) {
        if (!lzAvailable()) return null;
        const minified = toStorageFormat(state);
        const json = JSON.stringify(minified);
        return LZString.compressToEncodedURIComponent(json);
    }

    // Deserialize state from URL string
    function deserialize(encoded) {
        if (!lzAvailable()) return null;
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
            if (encoded === null) return;
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
        if (!hash) return false;

        const loaded = deserialize(hash);
        if (!loaded) {
            warn("Couldn't read the chart in this link. Starting fresh.");
            return false;
        }

        const { state: clean, warnings } = sanitize(loaded);
        state = { ...defaultState, ...clean };
        warnings.forEach(warn);
        return true;
    }

    // Notify all subscribers of state change
    function notify() {
        subscribers.forEach(cb => cb(state));
    }

    return {
        // Initialize state from URL or defaults.
        // onWarning receives user-facing messages about unreadable/repaired links.
        init(onWarning) {
            warnCallback = onWarning || null;
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
            const cleanName = typeof name === 'string' ? name.trim().slice(0, MAX_NAME_LENGTH) : '';
            const newScope = {
                id: generateId(),
                name: cleanName || 'New Scope',
                position: Math.min(1, Math.max(0, position))
            };
            state.scopes = [...state.scopes, newScope];
            pushToURL(true);
            notify();
            return newScope;
        },

        // Update a scope
        updateScope(id, updates) {
            const clean = { ...updates };
            if (typeof clean.name === 'string') {
                clean.name = clean.name.trim().slice(0, MAX_NAME_LENGTH) || 'Scope';
            }
            if (clean.position !== undefined) {
                const num = Number(clean.position);
                clean.position = Number.isFinite(num) ? Math.min(1, Math.max(0, num)) : 0;
            }
            state.scopes = state.scopes.map(scope =>
                scope.id === id ? { ...scope, ...clean } : scope
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
