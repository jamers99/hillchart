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
        svgClone.querySelectorAll('.empty-hint').forEach(el => el.remove());
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

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas export produced no image'));
                }
            }, 'image/png');
        });
    }

    function embedFontInSVG(svgElement) {
        const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = `
            @font-face {
                font-family: 'Open Sans';
                font-style: normal;
                font-weight: 400;
                src: url(data:font/woff2;charset=utf-8;base64,${OPEN_SANS_400_BASE64}) format('woff2');
            }
            @font-face {
                font-family: 'Open Sans';
                font-style: normal;
                font-weight: 700;
                src: url(data:font/woff2;charset=utf-8;base64,${OPEN_SANS_700_BASE64}) format('woff2');
            }
            text {
                font-family: 'Open Sans', sans-serif;
                fill: #eaeaea;
            }
        `;
        svgElement.insertBefore(styleEl, svgElement.firstChild);
    }

    function inlineTextStyles(svgElement) {
        const texts = svgElement.querySelectorAll('text');
        texts.forEach(text => {
            text.setAttribute('font-family', 'Open Sans, sans-serif');
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

        try {
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

            return canvas;
        } finally {
            URL.revokeObjectURL(svgUrl);
        }
    }

    function readBoxValues(style, prefix) {
        const top = parseFloat(style[`${prefix}Top`]) || 0;
        const right = parseFloat(style[`${prefix}Right`]) || 0;
        const bottom = parseFloat(style[`${prefix}Bottom`]) || 0;
        const left = parseFloat(style[`${prefix}Left`]) || 0;
        return { top, right, bottom, left };
    }

    // Deliberately not async: Safari only allows clipboard writes that are
    // constructed synchronously within the user gesture, so the ClipboardItem
    // gets the pending blob promise as its value.
    function copyToClipboard() {
        if (typeof ClipboardItem === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
            downloadAsPNG();
            return;
        }

        const blobPromise = captureAsBlob();
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])
            .then(() => UI.notify('Image copied to clipboard!', 'success'))
            .catch((err) => {
                if (err instanceof TypeError) {
                    // Older Chromium rejects promise values inside ClipboardItem;
                    // retry with the resolved blob
                    blobPromise
                        .then(blob => navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]))
                        .then(() => UI.notify('Image copied to clipboard!', 'success'))
                        .catch((retryErr) => {
                            console.error('Clipboard write failed:', retryErr);
                            downloadAsPNG();
                        });
                } else {
                    console.error('Clipboard write failed:', err);
                    downloadAsPNG();
                }
            });
    }

    async function downloadAsPNG() {
        try {
            const blob = await captureAsBlob();
            const url = URL.createObjectURL(blob);

            const state = State.get();
            const slug = (state.title || '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            const filename = (slug || 'hillchart') + '.png';

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            UI.notify('Image downloaded!', 'success');
        } catch (err) {
            console.error('Download failed:', err);
            UI.notify('Failed to export image', 'error');
        }
    }

    function copyLink() {
        const url = State.getShareableURL();
        const state = State.get();
        // Escape markdown link-text specials so titles like "[wip] chart" stay valid
        const title = (state.title || 'Hill Chart').replace(/([\\\[\]])/g, '\\$1');
        const markdownLink = `[${title}](${url})`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(markdownLink)
                .then(() => UI.notify('Markdown link copied to clipboard!', 'success'))
                .catch(() => fallbackCopyLink(markdownLink));
        } else {
            fallbackCopyLink(markdownLink);
        }
    }

    function fallbackCopyLink(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            UI.notify('Link copied to clipboard!', 'success');
        } catch (err) {
            UI.notify('Failed to copy link', 'error');
        }

        document.body.removeChild(textarea);
    }

    return {
        copyToClipboard,
        copyLink
    };
})();
