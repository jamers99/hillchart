// Shared UI Module (notifications + modal management)
const UI = (function () {
    let notifyTimer;

    function notify(message, type = 'success') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        notification.textContent = message;
        notification.className = `notification show ${type}`;
        clearTimeout(notifyTimer);
        notifyTimer = setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Modal management: one modal open at a time, with focus trap,
    // Escape to close, and focus returned to the opener on close.
    let activeOverlay = null;
    let returnFocusEl = null;
    let onCloseCb = null;

    function focusables(overlay) {
        return Array.from(overlay.querySelectorAll('button, input, a[href]'));
    }

    function onKeydown(e) {
        if (!activeOverlay) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeModal(activeOverlay);
        } else if (e.key === 'Tab') {
            const items = focusables(activeOverlay);
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    function onBackdropClick(e) {
        if (e.target === activeOverlay) closeModal(activeOverlay);
    }

    function openModal(overlay, opts = {}) {
        if (activeOverlay && activeOverlay !== overlay) closeModal(activeOverlay);
        activeOverlay = overlay;
        returnFocusEl = opts.returnFocus || document.activeElement;
        onCloseCb = opts.onClose || null;
        overlay.classList.add('active');
        document.addEventListener('keydown', onKeydown);
        overlay.addEventListener('click', onBackdropClick);
        const target = opts.initialFocus || focusables(overlay)[0];
        if (target) {
            // The overlay's visibility transition means the element still computes
            // as hidden on the first frame, and focus() on a hidden element is a
            // no-op; wait until the transition is underway
            setTimeout(() => {
                target.focus();
                if (opts.selectText && typeof target.select === 'function') target.select();
            }, 100);
        }
    }

    function closeModal(overlay) {
        if (!overlay) return;
        overlay.classList.remove('active');
        if (overlay !== activeOverlay) return;
        document.removeEventListener('keydown', onKeydown);
        overlay.removeEventListener('click', onBackdropClick);
        activeOverlay = null;
        const cb = onCloseCb;
        onCloseCb = null;
        if (returnFocusEl && typeof returnFocusEl.focus === 'function') {
            returnFocusEl.focus();
        }
        returnFocusEl = null;
        if (cb) cb();
    }

    return { notify, openModal, closeModal };
})();
