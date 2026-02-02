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

    // Render a single scope
    function renderScope(scope, layer, svg) {
        const x = Hill.getXAtPosition(scope.position);
        const y = Hill.getYAtPosition(scope.position);
        const color = getColorForName(scope.name);

        // Create group
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'scope-group');
        group.setAttribute('data-scope-id', scope.id);

        // Create sketchy dot using Rough.js
        if (typeof rough !== 'undefined') {
            const rc = rough.svg(svg);
            const roughCircle = rc.circle(x, y, 26, {
                fill: color,
                fillStyle: 'solid',
                stroke: '#ffffff',
                strokeWidth: 2.5,
                roughness: 0.3,
                bowing: 0.2
            });
            roughCircle.setAttribute('class', 'scope-dot');
            group.appendChild(roughCircle);
        } else {
            // Fallback to regular circle
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

        // Create label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'scope-label');
        label.setAttribute('x', x);
        label.setAttribute('y', y - 24);
        label.textContent = scope.name;

        group.appendChild(label);

        // Add drag handlers
        group.addEventListener('mousedown', (e) => startDrag(e, scope.id));
        group.addEventListener('touchstart', (e) => startDrag(e, scope.id), { passive: false });

        // Add double-click to edit
        group.addEventListener('dblclick', () => {
            App.showEditScopeModal(scope.id);
        });

        layer.appendChild(group);
    }

    // Render all scopes
    function renderAll(svg) {
        svgElement = svg;
        const layer = svg.querySelector('#scopes-layer');
        layer.innerHTML = '';

        const state = State.get();
        state.scopes.forEach(scope => renderScope(scope, layer, svg));
    }

    return {
        renderAll
    };
})();
