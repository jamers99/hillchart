// Export Module
const Export = (function () {

    // Capture chart as PNG blob by manually converting SVG to canvas
    async function captureAsBlob() {
        const svg = document.getElementById('hill-svg');

        // Wait for fonts to be ready
        await document.fonts.ready;

        try {
            // Clone the SVG
            const svgClone = svg.cloneNode(true);

            // Embed font data into the SVG
            await embedFontInSVG(svgClone);

            // Inline all styles from computed styles
            inlineStyles(svg, svgClone);

            // Get SVG dimensions
            const bbox = svg.getBoundingClientRect();
            const width = bbox.width;
            const height = bbox.height;

            // Convert SVG to string
            const svgString = new XMLSerializer().serializeToString(svgClone);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);

            // Create image from SVG
            const img = new Image();
            img.width = width * 2; // 2x for high DPI
            img.height = height * 2;

            const loadPromise = new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            img.src = svgUrl;
            await loadPromise;

            // Draw to canvas
            const canvas = document.createElement('canvas');
            canvas.width = width * 2;
            canvas.height = height * 2;
            const ctx = canvas.getContext('2d');

            // Dark blue background matching the app
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Clean up
            URL.revokeObjectURL(svgUrl);

            // Convert canvas to blob
            return new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/png');
            });
        } catch (err) {
            console.error('Failed to capture image:', err);
            throw err;
        }
    }

    // Embed font data directly into SVG
    async function embedFontInSVG(svgElement) {
        try {
            // Use the pre-embedded font data from font-data.js
            const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            styleEl.textContent = `
                @font-face {
                    font-family: 'Caveat';
                    font-style: normal;
                    font-weight: 400;
                    src: url(data:font/truetype;charset=utf-8;base64,${CAVEAT_FONT_BASE64}) format('truetype');
                }
            `;

            // Insert at the beginning of the SVG
            svgElement.insertBefore(styleEl, svgElement.firstChild);
        } catch (err) {
            console.error('Failed to embed font:', err);
        }
    }

    // Inline all computed styles into the cloned element
    function inlineStyles(original, clone) {
        // Handle the SVG root
        const originalStyle = window.getComputedStyle(original);
        clone.setAttribute('style', getCSSText(originalStyle));

        // Handle all child elements
        const originalChildren = original.getElementsByTagName('*');
        const cloneChildren = clone.getElementsByTagName('*');

        for (let i = 0; i < originalChildren.length; i++) {
            const originalChild = originalChildren[i];
            const cloneChild = cloneChildren[i];
            const style = window.getComputedStyle(originalChild);

            // Inline critical styles
            cloneChild.setAttribute('style', getCSSText(style));
        }
    }

    // Convert computed style to CSS text with important properties
    function getCSSText(style) {
        const important = [
            'font-family', 'font-size', 'font-weight', 'font-style',
            'fill', 'stroke', 'stroke-width', 'opacity',
            'text-anchor', 'dominant-baseline'
        ];

        return important
            .map(prop => {
                const value = style.getPropertyValue(prop);
                return value ? `${prop}: ${value};` : '';
            })
            .filter(Boolean)
            .join(' ');
    }

    // Copy image to clipboard
    async function copyToClipboard() {
        try {
            const blob = await captureAsBlob();

            if (typeof ClipboardItem !== 'undefined') {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                showNotification('Image copied to clipboard!', 'success');
            } else {
                downloadAsPNG();
            }
        } catch (err) {
            console.error('Clipboard write failed:', err);
            downloadAsPNG();
        }
    }

    // Download as PNG file
    async function downloadAsPNG() {
        try {
            const blob = await captureAsBlob();
            const url = URL.createObjectURL(blob);

            const state = State.get();
            const filename = (state.title || 'hillchart')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') + '.png';

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showNotification('Image downloaded!', 'success');
        } catch (err) {
            console.error('Download failed:', err);
            showNotification('Failed to export image', 'error');
        }
    }

    // Copy shareable link
    function copyLink() {
        const url = State.getShareableURL();

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url)
                .then(() => showNotification('Link copied to clipboard!', 'success'))
                .catch(() => fallbackCopyLink(url));
        } else {
            fallbackCopyLink(url);
        }
    }

    // Fallback for older browsers
    function fallbackCopyLink(url) {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            showNotification('Link copied to clipboard!', 'success');
        } catch (err) {
            showNotification('Failed to copy link', 'error');
        }

        document.body.removeChild(textarea);
    }

    // Show notification
    function showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification show ${type}`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    return {
        copyToClipboard,
        downloadAsPNG,
        copyLink,
        showNotification
    };
})();

// Make showNotification globally accessible
const showNotification = Export.showNotification;
