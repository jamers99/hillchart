// Scope Management Module
const Scope = (function () {
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

    // Currently dragging scope
    let draggingScope = null;
    let svgElement = null;

    // Convert client coordinates to SVG coordinates
    function clientToSVG(clientX, clientY) {
        const pt = svgElement.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        return pt.matrixTransform(svgElement.getScreenCTM().inverse());
    }

    // Handle drag start
    function startDrag(e, scopeId) {
        e.preventDefault();
        draggingScope = scopeId;

        const point = e.touches ? e.touches[0] : e;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    // Handle drag move
    function onDrag(e) {
        if (!draggingScope) return;
        e.preventDefault();

        const point = e.touches ? e.touches[0] : e;
        const svgPoint = clientToSVG(point.clientX, point.clientY);

        // Normalize X position
        const normalizedX = Hill.normalizeX(svgPoint.x);

        // Update scope position in state
        State.updateScope(draggingScope, { position: normalizedX });
    }

    // Handle drag end
    function endDrag() {
        draggingScope = null;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend', endDrag);
    }

    // Calculate vertical offsets for scope labels to prevent overlap
    function calculateLabelOffsets(scopes) {
        const BASE_OFFSET = -24;      // default label position above dot
        const LABEL_SPACING = 28;     // vertical spacing between stacked labels
        const MIN_OFFSET = -250;      // maximum upward offset to stay on-screen
        const PROXIMITY_THRESHOLD = 80; // pixel distance to group nearby scopes

        const labelOffsets = {};
        scopes.forEach(scope => {
            labelOffsets[scope.id] = BASE_OFFSET;
        });

        if (scopes.length < 2) return labelOffsets;

        // Map scopes to their screen positions
        const scopePositions = scopes.map(scope => ({
            index: scopes.indexOf(scope),
            id: scope.id,
            x: Hill.getXAtPosition(scope.position)
        }));

        // Find groups of nearby scopes that need label stacking
        const processed = new Set();
        const groups = [];

        for (let i = 0; i < scopePositions.length; i++) {
            if (processed.has(scopePositions[i].id)) continue;

            const group = [i];
            processed.add(scopePositions[i].id);

            for (let j = i + 1; j < scopePositions.length; j++) {
                if (processed.has(scopePositions[j].id)) continue;
                if (Math.abs(scopePositions[i].x - scopePositions[j].x) < PROXIMITY_THRESHOLD) {
                    group.push(j);
                    processed.add(scopePositions[j].id);
                }
            }

            if (group.length > 1) {
                groups.push(group);
            }
        }

        // Stack labels for each group of overlapping scopes
        groups.forEach(group => {
            group.sort((a, b) => scopePositions[a].x - scopePositions[b].x);
            group.forEach((posIdx, stackLevel) => {
                const offset = BASE_OFFSET - (stackLevel * LABEL_SPACING);
                labelOffsets[scopePositions[posIdx].id] = Math.max(offset, MIN_OFFSET);
            });
        });

        return labelOffsets;
    }

    // Render a single scope dot and label
    function renderScope(scope, layer, svg, labelOffset = 0) {
        const x = Hill.getXAtPosition(scope.position);
        const y = Hill.getYAtPosition(scope.position);
        const color = getColorForName(scope.name);

        // Create SVG group for this scope
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'scope-group');
        group.setAttribute('data-scope-id', scope.id);

        // Render dot (sketchy or fallback)
        if (typeof rough !== 'undefined') {
            const rc = rough.svg(svg);
            const dot = rc.circle(x, y, 26, {
                fill: color,
                fillStyle: 'solid',
                stroke: '#ffffff',
                strokeWidth: 2.5,
                roughness: 0.3,
                bowing: 0.2
            });
            dot.setAttribute('class', 'scope-dot');
            group.appendChild(dot);
        } else {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('class', 'scope-dot');
            dot.setAttribute('cx', x);
            dot.setAttribute('cy', y);
            dot.setAttribute('r', 13);
            dot.setAttribute('fill', color);
            dot.setAttribute('stroke', 'white');
            dot.setAttribute('stroke-width', 2.5);
            group.appendChild(dot);
        }

        // Render label with offset to avoid overlaps
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'scope-label');
        label.setAttribute('x', x);
        label.setAttribute('y', y + labelOffset);
        label.textContent = scope.name;
        group.appendChild(label);

        // Attach event handlers
        group.addEventListener('mousedown', (e) => startDrag(e, scope.id));
        group.addEventListener('touchstart', (e) => startDrag(e, scope.id), { passive: false });
        group.addEventListener('dblclick', () => App.showEditScopeModal(scope.id));

        layer.appendChild(group);

        const viewBox = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
        const svgWidth = viewBox ? viewBox.width : (Hill.config.svgWidth || 800);
        const labelPadding = 6;
        const labelBox = label.getBBox();
        const halfWidth = labelBox.width / 2;
        const minX = halfWidth + labelPadding;
        const maxX = svgWidth - halfWidth - labelPadding;
        let clampedX = x;

        if (minX > maxX) {
            clampedX = svgWidth / 2;
        } else {
            clampedX = Math.min(Math.max(x, minX), maxX);
        }

        if (clampedX !== x) {
            label.setAttribute('x', clampedX);
        }
    }

    // Render all scopes
    function renderAll(svg) {
        svgElement = svg;
        const layer = svg.querySelector('#scopes-layer');
        layer.innerHTML = '';

        const state = State.get();

        // Calculate label offsets to avoid overlaps
        const labelOffsets = calculateLabelOffsets(state.scopes);

        // Render each scope with its calculated label offset
        state.scopes.forEach(scope => renderScope(scope, layer, svg, labelOffsets[scope.id]));
    }

    return {
        renderAll
    };
})();
