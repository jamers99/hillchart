// Hill Curve Rendering Module
const Hill = (function () {
    // Hill configuration
    const config = {
        padding: 40,
        amplitude: 180,
        baselineY: 250,
        strokeWidth: 3
    };

    // Attempt to calculate Y position for a normalized X position (0-1)
    // Using a bell curve / gaussian-like shape
    function getYAtPosition(normalizedX) {
        // Bell curve: e^(-(x-0.5)^2 / (2 * sigma^2))
        // Sigma controls the width of the bell (smaller = more exaggerated/peaked)
        const sigma = 0.18;
        const peak = 0.5;
        const exponent = -Math.pow(normalizedX - peak, 2) / (2 * sigma * sigma);
        const bellValue = Math.exp(exponent);

        const y = config.baselineY - config.amplitude * bellValue;
        return y;
    }

    // Generate SVG path data for the hill curve
    function generatePath(width, height) {
        const startX = config.padding;
        const endX = width - config.padding;
        const curveWidth = endX - startX;

        // Generate points along the bell curve
        const points = [];
        const steps = 60;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = startX + t * curveWidth;
            const y = getYAtPosition(t);
            points.push({ x, y });
        }

        // Create smooth SVG path using quadratic bezier curves
        let path = `M ${points[0].x} ${points[0].y}`;

        for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            path += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
        }

        // Final point
        const last = points[points.length - 1];
        const secondLast = points[points.length - 2];
        path += ` Q ${secondLast.x} ${secondLast.y} ${last.x} ${last.y}`;

        return path;
    }

    // Calculate actual X coordinate from normalized position
    function getXAtPosition(normalizedX, svgWidth = 800) {
        const startX = config.padding;
        const endX = svgWidth - config.padding;
        return startX + normalizedX * (endX - startX);
    }

    // Convert mouse/touch X to normalized position (0-1)
    function normalizeX(x, svgWidth = 800) {
        const startX = config.padding;
        const endX = svgWidth - config.padding;
        const clamped = Math.max(startX, Math.min(endX, x));
        return (clamped - startX) / (endX - startX);
    }

    // Render the hill curve to SVG
    function render(svgElement) {
        const curveGroup = svgElement.querySelector('#hill-curve');
        curveGroup.innerHTML = '';

        const viewBox = svgElement.viewBox.baseVal;
        const width = viewBox.width;
        const height = viewBox.height;

        const pathData = generatePath(width, height);

        // Clean SVG path for the hill curve
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', pathData);
        pathElement.setAttribute('stroke', '#f97316');
        pathElement.setAttribute('stroke-width', config.strokeWidth);
        pathElement.setAttribute('fill', 'none');
        pathElement.setAttribute('stroke-linecap', 'round');
        pathElement.setAttribute('stroke-linejoin', 'round');
        curveGroup.appendChild(pathElement);

        // Add center divider line (dashed)
        const centerX = width / 2;
        const dividerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        dividerLine.setAttribute('x1', centerX);
        dividerLine.setAttribute('y1', config.baselineY - config.amplitude - 20);
        dividerLine.setAttribute('x2', centerX);
        dividerLine.setAttribute('y2', config.baselineY + 15);
        dividerLine.setAttribute('stroke', '#4a5568');
        dividerLine.setAttribute('stroke-width', 1.5);
        dividerLine.setAttribute('stroke-dasharray', '5,5');
        curveGroup.appendChild(dividerLine);
    }

    return {
        render,
        getYAtPosition,
        getXAtPosition,
        normalizeX,
        config
    };
})();
