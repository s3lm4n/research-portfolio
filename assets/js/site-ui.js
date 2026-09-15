document.addEventListener('DOMContentLoaded', () => {
    // =========================================================
    // 1. Smart Editorial Header (Scroll-direction aware)
    // =========================================================
    const headers = document.querySelectorAll('[data-smart-header], .site-header');
    if (headers.length > 0) {
        let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
        let isTicking = false;
        const SCROLL_THRESHOLD = 120;
        const DELTA = 6;

        const updateHeaders = () => {
            const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

            headers.forEach(header => {
                // Near page top: always fully visible
                if (currentScrollY <= SCROLL_THRESHOLD) {
                    header.classList.remove('site-header--hidden');
                } else if (currentScrollY > lastScrollY + DELTA) {
                    // Scrolling down beyond threshold: smoothly hide
                    header.classList.add('site-header--hidden');
                } else if (currentScrollY < lastScrollY - DELTA) {
                    // Scrolling up: immediately reveal
                    header.classList.remove('site-header--hidden');
                }
            });

            lastScrollY = Math.max(0, currentScrollY);
            isTicking = false;
        };

        window.addEventListener('scroll', () => {
            if (!isTicking) {
                window.requestAnimationFrame(updateHeaders);
                isTicking = true;
            }
        }, { passive: true });

        // Accessibility: ensure header is visible when keyboard focus enters it
        headers.forEach(header => {
            header.addEventListener('focusin', () => {
                header.classList.remove('site-header--hidden');
            });
        });
    }

    // =========================================================
    // 2. Editorial Share Controls
    // =========================================================
    const shareContainers = document.querySelectorAll('.share-container, [data-share-container]');
    if (shareContainers.length > 0) {
        const canonicalEl = document.querySelector('link[rel="canonical"]');
        const defaultUrl = canonicalEl ? canonicalEl.href : window.location.href;
        const defaultTitle = document.title;
        const isTurkish = document.documentElement.lang === 'tr';

        shareContainers.forEach(container => {
            const trigger = container.querySelector('.share-trigger, [data-share-trigger]');
            const popover = container.querySelector('.share-popover, [data-share-popover]');
            if (!trigger || !popover) return;

            const pageUrl = trigger.getAttribute('data-share-url') || defaultUrl;
            const pageTitle = trigger.getAttribute('data-share-title') || defaultTitle;

            const closePopover = () => {
                popover.classList.remove('is-open');
                popover.classList.add('hidden');
                trigger.setAttribute('aria-expanded', 'false');
            };

            const openPopover = () => {
                // Close any other open popovers first
                document.querySelectorAll('.share-popover, [data-share-popover]').forEach(p => {
                    p.classList.remove('is-open');
                    p.classList.add('hidden');
                    const c = p.closest('.share-container, [data-share-container]');
                    const t = c?.querySelector('.share-trigger, [data-share-trigger]');
                    if (t) t.setAttribute('aria-expanded', 'false');
                });
                popover.classList.add('is-open');
                popover.classList.remove('hidden');
                trigger.setAttribute('aria-expanded', 'true');
            };

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();

                // Mobile viewport with native Web Share API
                if (navigator.share && window.innerWidth < 640) {
                    navigator.share({
                        title: pageTitle,
                        url: pageUrl
                    }).catch((err) => {
                        // If AbortError (user cancelled), do nothing; otherwise open popover
                        if (err.name !== 'AbortError') {
                            const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
                            if (isExpanded) closePopover(); else openPopover();
                        }
                    });
                    return;
                }

                const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
                if (isExpanded) {
                    closePopover();
                } else {
                    openPopover();
                }
            });

            // Target buttons / links inside popover
            const linkedinBtn = popover.querySelector('[data-share-action="linkedin"], [data-share-target="linkedin"]');
            if (linkedinBtn) {
                linkedinBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
                    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
                    closePopover();
                });
            }

            const xBtn = popover.querySelector('[data-share-action="twitter"], [data-share-action="x"], [data-share-target="x"]');
            if (xBtn) {
                xBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(pageTitle)}&url=${encodeURIComponent(pageUrl)}`;
                    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
                    closePopover();
                });
            }

            const emailBtn = popover.querySelector('[data-share-action="email"], [data-share-target="email"]');
            if (emailBtn) {
                emailBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const mailto = `mailto:?subject=${encodeURIComponent(pageTitle)}&body=${encodeURIComponent(pageUrl)}`;
                    window.location.href = mailto;
                    closePopover();
                });
            }

            const copyBtn = popover.querySelector('[data-share-action="copy"], [data-share-target="copy"]');
            if (copyBtn) {
                copyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(pageUrl).then(() => {
                        const copyLabel = copyBtn.querySelector('.share-copy-text, [data-copy-text]');
                        if (copyLabel) {
                            const originalText = copyLabel.textContent;
                            copyLabel.textContent = isTurkish ? 'Kopyalandı!' : 'Copied!';
                            setTimeout(() => {
                                copyLabel.textContent = originalText;
                                closePopover();
                            }, 1400);
                        } else {
                            closePopover();
                        }
                    }).catch(() => {
                        closePopover();
                    });
                });
            }
        });

        // Global dismiss for popovers
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.share-container, [data-share-container]')) {
                document.querySelectorAll('.share-popover, [data-share-popover]').forEach(p => {
                    p.classList.remove('is-open');
                    p.classList.add('hidden');
                    const c = p.closest('.share-container, [data-share-container]');
                    const t = c?.querySelector('.share-trigger, [data-share-trigger]');
                    if (t) t.setAttribute('aria-expanded', 'false');
                });
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.share-popover.is-open, .share-popover:not(.hidden)').forEach(p => {
                    p.classList.remove('is-open');
                    p.classList.add('hidden');
                    const c = p.closest('.share-container, [data-share-container]');
                    const t = c?.querySelector('.share-trigger, [data-share-trigger]');
                    if (t) {
                        t.setAttribute('aria-expanded', 'false');
                        t.focus();
                    }
                });
            }
        });
    }

    // =========================================================
    // 3. Image Viewer Dialog ([data-viewer-src])
    // =========================================================
    const viewerButtons = document.querySelectorAll('[data-viewer-src]');
    if (viewerButtons.length > 0) {
        let dialog = document.getElementById('site-image-viewer');
        if (!dialog) {
            dialog = document.createElement('dialog');
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
        }

        const imgEl = dialog.querySelector('.viewer-img');
        const captionEl = dialog.querySelector('.viewer-caption');
        const closeBtn = dialog.querySelector('.viewer-close');
        let lastFocusedBtn = null;

        const closeDialog = () => {
            dialog.classList.add('closing');
            document.body.style.overflow = '';
            setTimeout(() => {
                if (dialog.open) {
                    dialog.close();
                }
                dialog.classList.remove('closing');
                if (lastFocusedBtn) {
                    lastFocusedBtn.focus();
                }
            }, 200); // 200ms matches CSS transition
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', closeDialog);
        }

        dialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            closeDialog();
        });

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog || e.target.classList.contains('viewer-content')) {
                closeDialog();
            }
        });

        viewerButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                lastFocusedBtn = btn;
                const src = btn.getAttribute('data-viewer-src');
                const alt = btn.getAttribute('data-viewer-alt') || '';
                const caption = btn.getAttribute('data-viewer-caption') || '';

                if (imgEl) {
                    imgEl.src = src;
                    imgEl.alt = alt;
                }
                if (captionEl) {
                    captionEl.textContent = caption;
                }

                document.body.style.overflow = 'hidden';
                dialog.showModal();
            });
        });
    }
});
