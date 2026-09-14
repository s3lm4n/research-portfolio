document.addEventListener('DOMContentLoaded', () => {
    // 2. Image Viewer Dialog
    const viewerButtons = document.querySelectorAll('[data-viewer-src]');
    if (viewerButtons.length > 0) {
        // Create the dialog
        const dialog = document.createElement('dialog');
        dialog.id = 'site-image-viewer';
        dialog.className = 'site-image-viewer';

        dialog.innerHTML = `
            <div class="viewer-content">
                <button class="viewer-close" aria-label="Close viewer">&times;</button>
                <img class="viewer-img" src="" alt="">
                <p class="viewer-caption"></p>
            </div>
        `;
        document.body.appendChild(dialog);

        const imgEl = dialog.querySelector('.viewer-img');
        const captionEl = dialog.querySelector('.viewer-caption');
        const closeBtn = dialog.querySelector('.viewer-close');

        const closeDialog = () => {
            dialog.classList.add('closing');
            // Wait for animation
            setTimeout(() => {
                dialog.close();
                dialog.classList.remove('closing');
            }, 200); // 200ms matches CSS transition
        };

        closeBtn.addEventListener('click', closeDialog);

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog || e.target.classList.contains('viewer-content')) {
                closeDialog();
            }
        });

        viewerButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const src = btn.getAttribute('data-viewer-src');
                const alt = btn.getAttribute('data-viewer-alt') || '';
                const caption = btn.getAttribute('data-viewer-caption') || '';

                imgEl.src = src;
                imgEl.alt = alt;
                captionEl.textContent = caption;

                dialog.showModal();
            });
        });
    }
});
