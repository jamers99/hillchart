// Export Module
const Export = (function () {

    // Capture chart as PNG blob
    async function captureAsBlob() {
        const svg = document.getElementById('hill-svg');

        // Wait for fonts to be ready
        await document.fonts.ready;

        try {
            // Clone and prepare SVG for export
            const svgClone = svg.cloneNode(true);
            embedFontInSVG(svgClone);
            inlineTextStyles(svgClone);

            // Get dimensions and convert to canvas
            const bbox = svg.getBoundingClientRect();
            const canvas = await svgToCanvas(svgClone, bbox.width, bbox.height);

            // Convert canvas to blob
            return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        } catch (err) {
            console.error('Failed to capture image:', err);
            throw err;
        }
    }

    // Embed font data into SVG
    function embedFontInSVG(svgElement) {
        const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = `
            @font-face {
                font-family: 'Caveat';
                font-style: normal;
                font-weight: 400;
                src: url(data:font/truetype;charset=utf-8;base64,${CAVEAT_FONT_BASE64}) format('truetype');
            }
            text {
                font-family: 'Caveat', cursive;
                fill: #eaeaea;
            }
        `;
        svgElement.insertBefore(styleEl, svgElement.firstChild);
    }

    // Inline styles for text elements only (SVG attributes are already inline)
    function inlineTextStyles(svgElement) {
        const texts = svgElement.querySelectorAll('text');
        texts.forEach(text => {
            if (!text.hasAttribute('fill')) {
                text.setAttribute('fill', '#eaeaea');
            }
        });
    }

    // Convert SVG to canvas with background
    async function svgToCanvas(svgElement, width, height) {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.width = width * 2;
        img.height = height * 2;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = svgUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');

        // Background color
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        URL.revokeObjectURL(svgUrl);
        return canvas;
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
        copyLink
    };
})();
