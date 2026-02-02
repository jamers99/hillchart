// Export Module
const Export = (function() {

    // Capture chart as PNG blob using canvas (more reliable for fonts)
    async function captureAsBlob() {
        const wrapper = document.getElementById('export-wrapper');
        const svg = document.getElementById('hill-svg');

        // Wait for fonts to be ready
        await document.fonts.ready;

        // Clone the SVG and inline all styles
        const svgClone = svg.cloneNode(true);

        // Get computed styles and inline them on all text elements
        const originalTexts = svg.querySelectorAll('text');
        const clonedTexts = svgClone.querySelectorAll('text');

        originalTexts.forEach((original, i) => {
            const computed = getComputedStyle(original);
            const clone = clonedTexts[i];
            clone.style.fontFamily = 'Caveat, cursive';
            clone.style.fontSize = computed.fontSize;
            clone.style.fontWeight = computed.fontWeight;
            clone.style.fontStyle = computed.fontStyle;
            clone.style.fill = computed.fill;
        });

        // Add inline style block with font-face using data URL
        // We'll fetch the Google Fonts CSS which includes the font URL
        try {
            const fontCSS = await fetchAndEmbedFont();
            if (fontCSS) {
                const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
                styleEl.textContent = fontCSS;
                svgClone.insertBefore(styleEl, svgClone.firstChild);
            }
        } catch (e) {
            console.warn('Could not embed font, using fallback:', e);
        }

        try {
            const dataUrl = await htmlToImage.toPng(wrapper, {
                pixelRatio: 2,
                filter: (node) => {
                    // Replace SVG with our modified clone during capture
                    return true;
                }
            });

            const response = await fetch(dataUrl);
            return response.blob();
        } catch (err) {
            console.error('Failed to capture image:', err);
            throw err;
        }
    }

    // Fetch Google Fonts CSS and convert font to embedded base64
    async function fetchAndEmbedFont() {
        try {
            const cssResponse = await fetch(
                'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap'
            );
            const cssText = await cssResponse.text();

            // Extract woff2 URL from the CSS
            const woff2Match = cssText.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
            if (!woff2Match) {
                return null;
            }

            const fontUrl = woff2Match[1];
            const fontResponse = await fetch(fontUrl);

            if (!fontResponse.ok) {
                return null;
            }

            const fontBuffer = await fontResponse.arrayBuffer();

            // Convert to base64
            const base64 = btoa(
                new Uint8Array(fontBuffer)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            return `
                @font-face {
                    font-family: 'Caveat';
                    font-style: normal;
                    font-weight: 400 700;
                    src: url(data:font/woff2;base64,${base64}) format('woff2');
                }
            `;
        } catch (err) {
            console.error('Failed to fetch font:', err);
            return null;
        }
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
