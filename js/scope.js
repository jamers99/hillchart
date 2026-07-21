// Scope Management Module
const Scope = (function () {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Label layout constants (SVG viewBox units)
    const BASE_OFFSET = 24;       // label sits this far above its dot
    const LABEL_SPACING = 28;     // vertical step when labels are pushed up
    const LABEL_GAP = 12;         // min horizontal gap between neighboring labels
    const MIN_LABEL_Y = 22;       // labels never rise above this (22px font ascent)
    const MAX_LABEL_WIDTH = 300;  // labels longer than this get truncated with …
    const EDGE_PADDING = 6;       // min distance from label to viewBox edge

    // Color palette for scopes - will be selected based on name hash
    const colors = [
        '#22c55e', // green
        '#3b82f6', // blue
        '#f97316', // orange
        '#ec4899', // pink
        '#8b5cf6', // purple
        '#14b8a6', // teal
        '#f59e0b', // amber
        '#ef4444', // red
        '#06b6d4', // cyan
        '#84cc16'  // lime
    ];

    // Generate consistent color from scope name
    function getColorForName(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            const char = name.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    // Stable RoughJS seed per scope, so dots keep their sketch across re-renders
    // instead of re-randomizing (visible wiggle) on every drag frame
    function seedFromId(id) {
        let seed = 0;
        for (let i = 0; i < id.length; i++) {
            seed = (seed * 31 + id.charCodeAt(i)) % 2147483647;
        }
        return seed + 1;
    }

    // Currently dragging scope
    let draggingScope = null;
    let svgElement = null;

    // Last tap on a scope, for double-tap-to-edit on touch/pen
    let lastTap = null;

    // Convert client coordinates to SVG coordinates
    function clientToSVG(clientX, clientY) {
        const ctm = svgElement.getScreenCTM();
        if (!ctm) return null;
        const pt = svgElement.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        return pt.matrixTransform(ctm.inverse());
    }

    // Handle drag start
    function startDrag(e, scopeId) {
        e.preventDefault();
        draggingScope = scopeId;

        // Capture on the SVG root, not the dot: every drag move re-renders and
        // destroys the dot element, which would silently kill its capture
        if (svgElement && svgElement.setPointerCapture && e.pointerId !== undefined) {
            try {
                svgElement.setPointerCapture(e.pointerId);
            } catch (err) {
                // capture is best-effort; document listeners still receive events
            }
        }

        document.addEventListener('pointermove', onDrag);
        document.addEventListener('pointerup', endDrag);
        document.addEventListener('pointercancel', endDrag);
    }

    // Handle drag move
    function onDrag(e) {
        if (!draggingScope) return;
        e.preventDefault();

        const svgPoint = clientToSVG(e.clientX, e.clientY);
        if (!svgPoint) return;

        const normalizedX = Hill.normalizeX(svgPoint.x);
        State.updateScope(draggingScope, { position: normalizedX });
    }

    // Handle drag end
    function endDrag() {
        draggingScope = null;
        document.removeEventListener('pointermove', onDrag);
        document.removeEventListener('pointerup', endDrag);
        document.removeEventListener('pointercancel', endDrag);
    }

    // Double-tap opens the edit modal on touch/pen, where dblclick is unreliable
    function handleTap(e, scopeId) {
        if (e.pointerType === 'mouse') return;
        const now = Date.now();
        if (lastTap && lastTap.id === scopeId && now - lastTap.time < 350 &&
            Math.abs(e.clientX - lastTap.x) < 24 && Math.abs(e.clientY - lastTap.y) < 24) {
            lastTap = null;
            App.showEditScopeModal(scopeId);
        } else {
            lastTap = { id: scopeId, time: now, x: e.clientX, y: e.clientY };
        }
    }

    // Shorten a label until it fits, keeping the full name available on hover
    function truncateLabel(label, fullName) {
        const fullLength = label.getComputedTextLength();
        if (fullLength <= MAX_LABEL_WIDTH) return;

        let keep = Math.max(1, Math.floor(fullName.length * MAX_LABEL_WIDTH / fullLength));
        label.textContent = fullName.slice(0, keep).trimEnd() + '…';
        while (keep > 1 && label.getComputedTextLength() > MAX_LABEL_WIDTH) {
            keep--;
            label.textContent = fullName.slice(0, keep).trimEnd() + '…';
        }
    }

    // Place labels so they never overlap. Works in absolute-y space (labels ride
    // the curve, so fixed "tracks" would not be horizontal lines): sort by dot x,
    // then push each label up in LABEL_SPACING steps until it clears every
    // already-placed label whose horizontal interval it intersects.
    function layoutLabels(records, svgWidth) {
        const placed = [];
        const ordered = [...records].sort((a, b) => a.dotX - b.dotX || (a.id < b.id ? -1 : 1));

        ordered.forEach(rec => {
            const width = rec.label.getComputedTextLength();
            const halfWidth = width / 2;

            // Clamp label center inside the viewBox (backstop for edge dots)
            const minX = halfWidth + EDGE_PADDING;
            const maxX = svgWidth - halfWidth - EDGE_PADDING;
            const cx = minX > maxX ? svgWidth / 2 : Math.min(Math.max(rec.dotX, minX), maxX);

            const start = cx - halfWidth - LABEL_GAP;
            const end = cx + halfWidth + LABEL_GAP;
            const naturalY = rec.dotY - BASE_OFFSET;
            let y = naturalY;

            const collides = () => placed.some(p =>
                start < p.end && end > p.start && Math.abs(y - p.y) < LABEL_SPACING
            );
            while (collides() && y - LABEL_SPACING >= MIN_LABEL_Y) {
                y -= LABEL_SPACING;
            }
            // If still colliding at the top, accept slight overlap over clipping
            placed.push({ start, end, y });

            rec.label.setAttribute('x', cx);
            rec.label.setAttribute('y', y);

            // Leader line when a label sits far from its dot, so ownership stays clear.
            // Styled via attributes (not CSS) so it survives SVG image export.
            const displaced = naturalY - y >= 2 * LABEL_SPACING || Math.abs(cx - rec.dotX) > 30;
            if (displaced) {
                const leader = document.createElementNS(SVG_NS, 'line');
                leader.setAttribute('class', 'label-leader');
                leader.setAttribute('x1', cx);
                leader.setAttribute('y1', y + 4);
                leader.setAttribute('x2', rec.dotX);
                leader.setAttribute('y2', rec.dotY - 16);
                leader.setAttribute('stroke', '#4a5568');
                leader.setAttribute('stroke-width', 1);
                leader.setAttribute('stroke-dasharray', '3,3');
                leader.setAttribute('opacity', 0.6);
                rec.group.insertBefore(leader, rec.group.firstChild);
            }
        });
    }

    // Render a single scope dot and label at its natural position
    function renderScope(scope, layer, svg) {
        const x = Hill.getXAtPosition(scope.position);
        const y = Hill.getYAtPosition(scope.position);
        const color = getColorForName(scope.name);

        // Create SVG group for this scope
        const group = document.createElementNS(SVG_NS, 'g');
        group.setAttribute('class', 'scope-group');
        group.setAttribute('data-scope-id', scope.id);

        // Native tooltip with the full (possibly truncated) name
        const titleEl = document.createElementNS(SVG_NS, 'title');
        titleEl.textContent = scope.name;
        group.appendChild(titleEl);

        // Render dot (sketchy or fallback)
        if (typeof rough !== 'undefined') {
            const rc = rough.svg(svg);
            const dot = rc.circle(x, y, 26, {
                fill: color,
                fillStyle: 'solid',
                stroke: '#ffffff',
                strokeWidth: 2.5,
                roughness: 0.3,
                bowing: 0.2,
                seed: seedFromId(scope.id)
            });
            dot.setAttribute('class', 'scope-dot');
            group.appendChild(dot);
        } else {
            const dot = document.createElementNS(SVG_NS, 'circle');
            dot.setAttribute('class', 'scope-dot');
            dot.setAttribute('cx', x);
            dot.setAttribute('cy', y);
            dot.setAttribute('r', 13);
            dot.setAttribute('fill', color);
            dot.setAttribute('stroke', 'white');
            dot.setAttribute('stroke-width', 2.5);
            group.appendChild(dot);
        }

        // Render label; layoutLabels() adjusts x/y after measuring
        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('class', 'scope-label');
        label.setAttribute('x', x);
        label.setAttribute('y', y - BASE_OFFSET);
        label.textContent = scope.name;
        group.appendChild(label);

        // Attach event handlers
        group.addEventListener('pointerdown', (e) => startDrag(e, scope.id));
        group.addEventListener('pointerup', (e) => handleTap(e, scope.id));
        group.addEventListener('dblclick', () => App.showEditScopeModal(scope.id));

        layer.appendChild(group);

        return { id: scope.id, dotX: x, dotY: y, group, label, name: scope.name };
    }

    // Hint shown when the chart has no scopes yet (stripped from image export)
    function renderEmptyHint(layer, svgWidth) {
        const hint = document.createElementNS(SVG_NS, 'text');
        hint.setAttribute('class', 'empty-hint');
        hint.setAttribute('x', svgWidth / 2);
        hint.setAttribute('y', 55);
        hint.textContent = 'Click + Add Scope (or press N) to add your first scope';
        layer.appendChild(hint);
    }

    // Render all scopes
    function renderAll(svg) {
        svgElement = svg;
        const layer = svg.querySelector('#scopes-layer');
        layer.innerHTML = '';

        const state = State.get();

        const viewBox = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
        const svgWidth = viewBox ? viewBox.width : (Hill.config.svgWidth || 900);

        if (state.scopes.length === 0) {
            renderEmptyHint(layer, svgWidth);
            return;
        }

        // Two passes: render everything at natural position first, then measure
        // real label widths and resolve collisions
        const records = state.scopes.map(scope => renderScope(scope, layer, svg));
        records.forEach(rec => truncateLabel(rec.label, rec.name));
        layoutLabels(records, svgWidth);
    }

    return {
        renderAll
    };
})();
