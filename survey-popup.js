(() => {
    'use strict';

    // 台灣時間 2026/11/4 23:59 結束；不記錄關閉狀態，每次進站都顯示。
    const endsAt = Date.parse('2026-11-04T23:59:00+08:00');
    const dialog = document.getElementById('survey-popup');
    if (!dialog) return;

    const closeButton = dialog.querySelector('.survey-popup-close');
    let expiryTimer;
    const close = () => {
        if (dialog.open) dialog.close();
        document.body.classList.remove('survey-popup-open');
        clearTimeout(expiryTimer);
    };
    const checkExpiry = () => {
        if (Date.now() >= endsAt) close();
    };
    const open = () => {
        clearTimeout(expiryTimer);
        if (Date.now() >= endsAt) {
            close();
            return;
        }
        if (!dialog.open) {
            dialog.showModal();
            document.body.classList.add('survey-popup-open');
            closeButton.focus({ preventScroll: true });
        }
        // 長時間停留也會在到期時關閉；避免超過瀏覽器計時器上限。
        const wait = Math.min(endsAt - Date.now(), 2147483647);
        expiryTimer = setTimeout(() => {
            if (Date.now() >= endsAt) close();
            else open();
        }, wait);
    };

    closeButton.addEventListener('click', close);
    dialog.addEventListener('close', () => {
        document.body.classList.remove('survey-popup-open');
        clearTimeout(expiryTimer);
    });
    // Escape 使用瀏覽器原生對話框的關閉與焦點管理。
    document.addEventListener('visibilitychange', checkExpiry);
    window.addEventListener('pageshow', event => {
        if (event.persisted) open();
    });
    open();
})();
