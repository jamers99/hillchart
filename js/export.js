const Export = (function () {
    async function captureAsBlob() {
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const exportWrapper = document.getElementById('export-wrapper');
        const svg = document.getElementById('hill-svg');
        if (!exportWrapper || !svg) {
            throw new Error('Export unavailable: missing wrapper or svg');
        }

        const svgClone = svg.cloneNode(true);
        embedFontInSVG(svgClone);
        inlineTextStyles(svgClone);

        const wrapperRect = exportWrapper.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        const computedStyles = window.getComputedStyle(exportWrapper);
        const padding = readBoxValues(computedStyles, 'padding');
        const border = readBoxValues(computedStyles, 'border');
        const backgroundColor = computedStyles.backgroundColor || '#1a1a2e';
        const borderColor = computedStyles.borderTopColor || '#2a2a4a';

        const innerWidth = wrapperRect.width - padding.left - padding.right - border.left - border.right;
        const innerHeight = wrapperRect.height - padding.top - padding.bottom - border.top - border.bottom;
        const drawWidth = Math.max(1, innerWidth || svgRect.width);
        const drawHeight = Math.max(1, innerHeight || svgRect.height);

        const canvas = await svgToCanvas(svgClone, {
            wrapperWidth: wrapperRect.width,
            wrapperHeight: wrapperRect.height,
            drawWidth,
            drawHeight,
            offsetX: padding.left + border.left,
            offsetY: padding.top + border.top,
            backgroundColor,
            borderColor,
            borderWidth: border.top
        });

        return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    }

    function embedFontInSVG(svgElement) {
        const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = `
            @font-face {
                font-family: 'Caveat';
                font-style: normal;
                font-weight: 400;
                src: url(data:font/truetype;charset=utf-8;base64,${CAVEAT_FONT_BASE64}) format('truetype');
            }
            @font-face {
                font-family: 'Caveat';
                font-style: normal;
                font-weight: 700;
                src: url(data:font/truetype;charset=utf-8;base64,${CAVEAT_FONT_BASE64}) format('truetype');
            }
            text {
                font-family: 'Caveat', cursive;
                fill: #eaeaea;
            }
        `;
        svgElement.insertBefore(styleEl, svgElement.firstChild);
    }

    function inlineTextStyles(svgElement) {
        const texts = svgElement.querySelectorAll('text');
        texts.forEach(text => {
            text.setAttribute('font-family', 'Caveat, cursive');
            if (text.classList.contains('scope-label')) {
                text.setAttribute('fill', '#eaeaea');
                text.setAttribute('font-size', '22px');
                text.setAttribute('font-weight', '700');
                text.setAttribute('text-anchor', 'middle');
            } else if (text.classList.contains('hill-label')) {
                text.setAttribute('fill', '#a0a0a0');
                text.setAttribute('font-size', '22px');
                text.setAttribute('font-style', 'italic');
                text.setAttribute('text-anchor', 'middle');
            } else if (!text.hasAttribute('fill')) {
                text.setAttribute('fill', '#eaeaea');
            }
        });
    }

    async function svgToCanvas(svgElement, options) {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.width = options.drawWidth * 2;
        img.height = options.drawHeight * 2;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = svgUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, options.wrapperWidth) * 2;
        canvas.height = Math.max(1, options.wrapperHeight) * 2;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = options.backgroundColor || '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (options.borderWidth > 0) {
            ctx.strokeStyle = options.borderColor || '#2a2a4a';
            ctx.lineWidth = options.borderWidth * 2;
            const inset = ctx.lineWidth / 2;
            ctx.strokeRect(inset, inset, canvas.width - ctx.lineWidth, canvas.height - ctx.lineWidth);
        }

        const offsetX = options.offsetX * 2;
        const offsetY = options.offsetY * 2;
        const drawWidth = options.drawWidth * 2;
        const drawHeight = options.drawHeight * 2;
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        URL.revokeObjectURL(svgUrl);
        return canvas;
    }

    function readBoxValues(style, prefix) {
        const top = parseFloat(style[`${prefix}Top`]) || 0;
        const right = parseFloat(style[`${prefix}Right`]) || 0;
        const bottom = parseFloat(style[`${prefix}Bottom`]) || 0;
        const left = parseFloat(style[`${prefix}Left`]) || 0;
        return { top, right, bottom, left };
    }

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

    function copyLink() {
        const url = State.getShareableURL();
        const state = State.get();
        const title = state.title || 'Hill Chart';
        const markdownLink = `[${title}](${url})`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(markdownLink)
                .then(() => showNotification('Markdown link copied to clipboard!', 'success'))
                .catch(() => fallbackCopyLink(markdownLink));
        } else {
            fallbackCopyLink(markdownLink);
        }
    }

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
