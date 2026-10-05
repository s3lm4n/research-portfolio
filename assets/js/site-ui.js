/* =========================================================================
   Site UI — shared behaviour for every page.
   Vanilla JS, no dependencies. Each block is a no-op when its markup is
   absent, so the same file is safe to load on every page.
   ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const isTurkish = document.documentElement.lang === 'tr';
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const HEADER_OFFSET = 72;

    // Quiet first-entry motion. Nothing is hidden while waiting for JS or scrolling.
    if (!motionPreference.matches && 'IntersectionObserver' in window && Element.prototype.animate) {
        const animations = new Set();
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                if (motionPreference.matches) return;
                const animation = entry.target.animate([
                    { opacity: 0.7, transform: 'translateY(6px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ], { duration: 280, easing: 'ease-out' });
                animations.add(animation);
                animation.onfinish = () => animations.delete(animation);
            });
        }, { rootMargin: '0px 0px -24px 0px', threshold: 0 });
        document.querySelectorAll('main .sec, main .evidence-record').forEach((section) => {
            if (section.getBoundingClientRect().top >= window.innerHeight) observer.observe(section);
        });
        motionPreference.addEventListener('change', (event) => {
            if (!event.matches) return;
            observer.disconnect();
            animations.forEach((animation) => animation.cancel());
            animations.clear();
        });
        window.addEventListener('beforeprint', () => {
            animations.forEach((animation) => animation.cancel());
            animations.clear();
        });
    }

    // =====================================================================
    // 1. Footer year
    // =====================================================================
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = String(new Date().getFullYear());
    }

    // =====================================================================
    // 2. Mobile navigation drawer
    // =====================================================================
    const navToggle = document.getElementById('nav-toggle');
    const navDrawer = document.getElementById('nav-drawer');
    if (navToggle && navDrawer) {
        const closeDrawer = () => {
            navDrawer.classList.remove('is-open');
            navToggle.setAttribute('aria-expanded', 'false');
        };

        navToggle.addEventListener('click', () => {
            const open = navDrawer.classList.toggle('is-open');
            navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        navDrawer.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', closeDrawer);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navDrawer.classList.contains('is-open')) {
                closeDrawer();
                navToggle.focus();
            }
        });

        window.matchMedia('(min-width: 48rem)').addEventListener('change', (e) => {
            if (e.matches) closeDrawer();
        });
    }

    // =====================================================================
    // 3. Hash-free in-page navigation + scrollspy
    //    Homepage section links carry data-scroll-target; dossier TOC links
    //    carry data-page-scroll-target. Both scroll without writing a hash.
    // =====================================================================
    const scrollTo = (el) => {
        const top = el.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
        window.scrollTo({ top: Math.max(0, top), behavior: motionPreference.matches ? 'auto' : 'smooth' });
    };

    const bindScrollLinks = (selector, attr, activeClass) => {
        const links = Array.from(document.querySelectorAll(selector));
        if (!links.length) return;

        const targets = links
            .map((link) => {
                const el = document.getElementById(link.getAttribute(attr));
                return el ? { link, el } : null;
            })
            .filter(Boolean);

        links.forEach((link) => {
            link.addEventListener('click', (e) => {
                if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
                const el = document.getElementById(link.getAttribute(attr));
                if (!el) return;
                e.preventDefault();
                scrollTo(el);
            });
        });

        if (!targets.length) return;

        const sections = Array.from(new Set(targets.map(({ el }) => el)));

        const setActive = (match) => {
            targets.forEach(({ link, el }) => {
                const on = el === match;
                link.classList.toggle(activeClass, on);
                if (on) {
                    link.setAttribute('aria-current', 'location');
                } else {
                    link.removeAttribute('aria-current');
                }
            });
        };

        const update = () => {
            const y = window.scrollY + HEADER_OFFSET + 24;
            let current = null;
            sections.forEach((el) => {
                if (el.getBoundingClientRect().top + window.pageYOffset <= y) {
                    current = el;
                }
            });
            // At the very bottom, mark the final target.
            if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
                current = sections[sections.length - 1];
            }
            setActive(current);
        };

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                update();
                ticking = false;
            });
        }, { passive: true });

        update();
    };

    bindScrollLinks('[data-scroll-target]', 'data-scroll-target', 'is-active');
    bindScrollLinks('[data-page-scroll-target]', 'data-page-scroll-target', 'active');

    // =====================================================================
    // 4. Share control
    // =====================================================================
    const shareContainers = document.querySelectorAll('.share-container');
    if (shareContainers.length) {
        const canonicalEl = document.querySelector('link[rel="canonical"]');
        const defaultUrl = canonicalEl ? canonicalEl.href : window.location.href;
        const defaultTitle = document.title;

        const closeAll = () => {
            document.querySelectorAll('.share-popover').forEach((p) => {
                p.classList.remove('is-open');
                const trigger = p.closest('.share-container')?.querySelector('.share-trigger');
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
            });
        };

        shareContainers.forEach((container) => {
            const trigger = container.querySelector('.share-trigger');
            const popover = container.querySelector('.share-popover');
            if (!trigger || !popover) return;

            const pageUrl = trigger.getAttribute('data-share-url') || defaultUrl;
            const pageTitle = trigger.getAttribute('data-share-title') || defaultTitle;
            const openPopover = () => {
                closeAll();
                popover.classList.add('is-open');
                trigger.setAttribute('aria-expanded', 'true');
                popover.querySelector('a, button')?.focus();
            };

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();

                if (navigator.share && window.innerWidth < 640) {
                    navigator.share({ title: pageTitle, url: pageUrl }).catch((err) => {
                        if (err && err.name !== 'AbortError') {
                            openPopover();
                        }
                    });
                    return;
                }

                const open = popover.classList.contains('is-open');
                closeAll();
                if (!open) {
                    openPopover();
                }
            });

            const openWindow = (url) => window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600');

            const linkedin = popover.querySelector('[data-share-action="linkedin"]');
            if (linkedin) {
                linkedin.addEventListener('click', (e) => {
                    e.preventDefault();
                    openWindow('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(pageUrl));
                    closeAll();
                });
            }

            const x = popover.querySelector('[data-share-action="twitter"]');
            if (x) {
                x.addEventListener('click', (e) => {
                    e.preventDefault();
                    openWindow('https://twitter.com/intent/tweet?text=' + encodeURIComponent(pageTitle) + '&url=' + encodeURIComponent(pageUrl));
                    closeAll();
                });
            }

            const email = popover.querySelector('[data-share-action="email"]');
            if (email) {
                email.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = 'mailto:?subject=' + encodeURIComponent(pageTitle) + '&body=' + encodeURIComponent(pageUrl);
                    closeAll();
                });
            }

            const copy = popover.querySelector('[data-share-action="copy"]');
            if (copy) {
                const label = copy.querySelector('.share-copy-text');
                const originalLabel = label?.textContent;
                let resetCopyTimer;
                if (label) label.setAttribute('aria-live', 'polite');
                copy.addEventListener('click', async (e) => {
                    e.preventDefault();
                    let copied = false;
                    try {
                        if (navigator.clipboard?.writeText) {
                            await navigator.clipboard.writeText(pageUrl);
                            copied = true;
                        }
                    } catch (_) { /* try the local fallback below */ }
                    if (!copied) {
                        const field = document.createElement('textarea');
                        field.value = pageUrl;
                        field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
                        document.body.appendChild(field);
                        field.select();
                        try { copied = document.execCommand('copy'); } catch (_) { /* unavailable */ }
                        field.remove();
                        copy.focus();
                    }
                    if (!label) return closeAll();
                    clearTimeout(resetCopyTimer);
                    label.textContent = copied
                        ? (isTurkish ? 'Kopyalandı' : 'Copied')
                        : (isTurkish ? 'Kopyalama kullanılamıyor' : 'Copy unavailable');
                    resetCopyTimer = setTimeout(() => {
                        label.textContent = originalLabel;
                        closeAll();
                        if (document.activeElement === copy) trigger.focus();
                    }, 1400);
                });
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.share-container')) closeAll();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            const open = document.querySelector('.share-popover.is-open');
            if (!open) return;
            const trigger = open.closest('.share-container')?.querySelector('.share-trigger');
            closeAll();
            if (trigger) trigger.focus();
        });
    }

    // =====================================================================
    // 5. Figure viewer dialog
    // =====================================================================
    const viewerButtons = document.querySelectorAll('[data-viewer-src]');
    if (!viewerButtons.length) return;

    let dialog = document.getElementById('site-image-viewer');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'site-image-viewer';
        dialog.className = 'site-image-viewer';
        dialog.setAttribute('aria-label', isTurkish ? 'Şekil görüntüleyici' : 'Figure viewer');
        dialog.setAttribute('aria-describedby', 'site-image-viewer-caption');
        dialog.innerHTML = `
            <div class="viewer-content">
                <button type="button" class="viewer-close" aria-label="${isTurkish ? 'Görüntüleyiciyi kapat' : 'Close viewer'}">&times;</button>
                <div class="viewer-zoom-toolbar" role="toolbar" aria-label="${isTurkish ? 'Yakınlaştırma kontrolleri' : 'Zoom controls'}">
                    <button type="button" class="viewer-zoom-btn viewer-zoom-fit">${isTurkish ? 'Sığdır' : 'Fit'}</button>
                    <button type="button" class="viewer-zoom-btn viewer-zoom-out" aria-label="${isTurkish ? 'Uzaklaştır' : 'Zoom out'}">&minus;</button>
                    <span class="viewer-zoom-value" aria-live="polite">100%</span>
                    <button type="button" class="viewer-zoom-btn viewer-zoom-in" aria-label="${isTurkish ? 'Yakınlaştır' : 'Zoom in'}">+</button>
                    <button type="button" class="viewer-zoom-btn viewer-zoom-reset">${isTurkish ? 'Sıfırla' : 'Reset'}</button>
                </div>
                <div class="viewer-zoom-viewport" role="region" aria-label="${isTurkish ? 'Şekil ayrıntıları' : 'Figure details'}">
                    <img class="viewer-img" src="" alt="">
                </div>
                <p class="viewer-caption" id="site-image-viewer-caption"></p>
            </div>
        `;
        document.body.appendChild(dialog);
    }

    const imgEl = dialog.querySelector('.viewer-img');
    const captionEl = dialog.querySelector('.viewer-caption');
    const closeBtn = dialog.querySelector('.viewer-close');
    const viewportEl = dialog.querySelector('.viewer-zoom-viewport');
    const zoomValueEl = dialog.querySelector('.viewer-zoom-value');
    const fitBtn = dialog.querySelector('.viewer-zoom-fit');
    const outBtn = dialog.querySelector('.viewer-zoom-out');
    const inBtn = dialog.querySelector('.viewer-zoom-in');
    const resetBtn = dialog.querySelector('.viewer-zoom-reset');

    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 4.0;
    const DRAG_THRESHOLD = 4;

    let lastFocused = null;
    let zoomEnabled = false;
    let scale = 1;
    let isFit = true;
    let pointerDown = false;
    let panning = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const updatePannable = () => {
        if (!zoomEnabled) return dialog.classList.remove('is-pannable');
        const canPan = viewportEl.scrollWidth > viewportEl.clientWidth ||
                       viewportEl.scrollHeight > viewportEl.clientHeight;
        dialog.classList.toggle('is-pannable', canPan);
    };

    const applyZoom = (next, fitMode = false, cx = null, cy = null) => {
        if (!zoomEnabled) return;
        const nw = imgEl.naturalWidth;
        const nh = imgEl.naturalHeight;
        if (!nw || !nh) return;

        const min = fitMode ? 0.02 : MIN_ZOOM;
        const old = scale;
        scale = Math.min(MAX_ZOOM, Math.max(min, next));
        isFit = fitMode;

        const vw = viewportEl.clientWidth;
        const vh = viewportEl.clientHeight;
        const w = Math.round(nw * scale);
        const h = Math.round(nh * scale);

        let anchorX = vw / 2;
        let anchorY = vh / 2;
        let imgX = 0;
        let imgY = 0;

        if (!fitMode) {
            const rect = viewportEl.getBoundingClientRect();
            if (cx !== null && cy !== null) {
                anchorX = cx - rect.left;
                anchorY = cy - rect.top;
            }
            const prevL = parseFloat(imgEl.style.marginLeft) || 0;
            const prevT = parseFloat(imgEl.style.marginTop) || 0;
            imgX = (viewportEl.scrollLeft + anchorX - prevL) / old;
            imgY = (viewportEl.scrollTop + anchorY - prevT) / old;
        }

        imgEl.style.width = w + 'px';
        imgEl.style.height = h + 'px';
        const ml = Math.max(0, Math.floor((vw - w) / 2));
        const mt = Math.max(0, Math.floor((vh - h) / 2));
        imgEl.style.marginLeft = ml + 'px';
        imgEl.style.marginTop = mt + 'px';

        if (fitMode) {
            viewportEl.scrollLeft = 0;
            viewportEl.scrollTop = 0;
        } else {
            viewportEl.scrollLeft = Math.max(0, Math.round(imgX * scale + ml - anchorX));
            viewportEl.scrollTop = Math.max(0, Math.round(imgY * scale + mt - anchorY));
        }

        zoomValueEl.textContent = Math.round(scale * 100) + '%';
        updatePannable();
    };

    const setFit = () => {
        const nw = imgEl.naturalWidth;
        const nh = imgEl.naturalHeight;
        const vw = viewportEl.clientWidth;
        const vh = viewportEl.clientHeight;
        if (!nw || !nh || !vw || !vh) return;
        applyZoom(Math.max(0.02, Math.min(vw / nw, vh / nh, 1)), true);
    };

    const step = (delta) => {
        if (delta < 0 && scale <= MIN_ZOOM) return;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((scale + delta) * 100) / 100));
        applyZoom(next, false);
    };

    const closeDialog = () => {
        document.body.style.overflow = '';
        if (dialog.open) dialog.close();
        dialog.classList.remove('viewer-zoom-enabled', 'is-pannable', 'is-dragging');
        document.body.classList.remove('viewer-panning-active');
        viewportEl.scrollLeft = 0;
        viewportEl.scrollTop = 0;
        imgEl.style.cssText = '';
        imgEl.classList.remove('is-panning');
        imgEl.draggable = true;
        pointerDown = false;
        panning = false;
        pointerId = null;
        zoomEnabled = false;
        scale = 1;
        isFit = true;
        if (lastFocused) lastFocused.focus();
    };

    closeBtn.addEventListener('click', closeDialog);

    dialog.addEventListener('cancel', (e) => {
        e.preventDefault();
        closeDialog();
    });

    dialog.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const controls = Array.from(dialog.querySelectorAll('button, [tabindex="0"]'))
            .filter((el) => !el.disabled && el.getClientRects().length);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog || e.target.classList.contains('viewer-content')) closeDialog();
    });

    fitBtn.addEventListener('click', (e) => { e.stopPropagation(); setFit(); });
    outBtn.addEventListener('click', (e) => { e.stopPropagation(); step(-0.1); });
    inBtn.addEventListener('click', (e) => { e.stopPropagation(); step(0.1); });
    resetBtn.addEventListener('click', (e) => { e.stopPropagation(); applyZoom(1, false); });

    viewportEl.addEventListener('wheel', (e) => {
        if (!zoomEnabled || !e.ctrlKey) return;
        e.preventDefault();
        step(e.deltaY < 0 ? 0.05 : -0.05);
    }, { passive: false });

    const endPan = (e) => {
        if (!pointerDown && !panning) return;
        if (e && e.pointerId != null && pointerId != null && e.pointerId !== pointerId) return;
        try {
            if (pointerId != null && viewportEl.hasPointerCapture?.(pointerId)) {
                viewportEl.releasePointerCapture(pointerId);
            }
        } catch (_) { /* capture already released */ }
        pointerDown = false;
        panning = false;
        pointerId = null;
        imgEl.classList.remove('is-panning');
        dialog.classList.remove('is-dragging');
        document.body.classList.remove('viewer-panning-active');
        updatePannable();
    };

    viewportEl.addEventListener('pointerdown', (e) => {
        if (!zoomEnabled || !dialog.open) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const canPan = viewportEl.scrollWidth > viewportEl.clientWidth ||
                       viewportEl.scrollHeight > viewportEl.clientHeight;
        if (!canPan) return;
        pointerDown = true;
        panning = false;
        pointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = viewportEl.scrollLeft;
        startTop = viewportEl.scrollTop;
    });

    viewportEl.addEventListener('pointermove', (e) => {
        if (!pointerDown || (pointerId != null && e.pointerId !== pointerId)) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!panning && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
            panning = true;
            try { viewportEl.setPointerCapture(e.pointerId); } catch (_) { /* unsupported */ }
            imgEl.classList.add('is-panning');
            dialog.classList.add('is-dragging');
            document.body.classList.add('viewer-panning-active');
        }
        if (panning) {
            e.preventDefault();
            viewportEl.scrollLeft = startLeft - dx;
            viewportEl.scrollTop = startTop - dy;
        }
    });

    viewportEl.addEventListener('pointerup', endPan);
    viewportEl.addEventListener('pointercancel', endPan);
    viewportEl.addEventListener('lostpointercapture', endPan);

    viewportEl.addEventListener('dblclick', (e) => {
        if (!zoomEnabled) return;
        e.preventDefault();
        if (isFit) applyZoom(1, false, e.clientX, e.clientY); else setFit();
    });

    imgEl.addEventListener('dragstart', (e) => {
        if (zoomEnabled) e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
        if (!dialog.open || !zoomEnabled) return;
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        if (e.key === '+' || e.key === '=') { e.preventDefault(); step(0.1); }
        else if (e.key === '-' || e.key === '_') { e.preventDefault(); step(-0.1); }
        else if (e.key === '0') { e.preventDefault(); applyZoom(1, false); }
        else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setFit(); }
    });

    window.addEventListener('resize', () => {
        if (!dialog.open || !zoomEnabled) return;
        if (isFit) setFit(); else updatePannable();
    });

    viewerButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            lastFocused = btn;
            imgEl.src = btn.getAttribute('data-viewer-src');
            imgEl.alt = btn.getAttribute('data-viewer-alt') || '';
            captionEl.textContent = btn.getAttribute('data-viewer-caption') || '';

            zoomEnabled = btn.getAttribute('data-viewer-zoom') === 'true';
            dialog.classList.toggle('viewer-zoom-enabled', zoomEnabled);
            viewportEl.tabIndex = zoomEnabled ? 0 : -1;

            if (zoomEnabled) {
                imgEl.draggable = false;
                const fit = () => { if (zoomEnabled) setFit(); };
                if (imgEl.complete && imgEl.naturalWidth > 0) {
                    requestAnimationFrame(fit);
                } else {
                    imgEl.onload = () => requestAnimationFrame(fit);
                }
            } else {
                dialog.classList.remove('is-pannable', 'is-dragging');
                imgEl.draggable = true;
                imgEl.style.cssText = '';
                imgEl.classList.remove('is-panning');
            }

            document.body.style.overflow = 'hidden';
            dialog.showModal();
        });
    });
});
