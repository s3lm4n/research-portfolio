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
                    <div class="viewer-zoom-toolbar" role="toolbar" aria-label="Zoom controls">
                        <button type="button" class="viewer-zoom-btn viewer-zoom-fit" aria-label="Fit image">Fit</button>
                        <button type="button" class="viewer-zoom-btn viewer-zoom-out" aria-label="Zoom out">−</button>
                        <span class="viewer-zoom-value" aria-live="polite">100%</span>
                        <button type="button" class="viewer-zoom-btn viewer-zoom-in" aria-label="Zoom in">+</button>
                        <button type="button" class="viewer-zoom-btn viewer-zoom-reset" aria-label="Reset zoom">Reset</button>
                    </div>
                    <div class="viewer-zoom-viewport">
                        <img class="viewer-img" src="" alt="">
                    </div>
                    <p class="viewer-caption"></p>
                </div>
            `;
            document.body.appendChild(dialog);
        }

        const imgEl = dialog.querySelector('.viewer-img');
        const captionEl = dialog.querySelector('.viewer-caption');
        const closeBtn = dialog.querySelector('.viewer-close');
        const toolbarEl = dialog.querySelector('.viewer-zoom-toolbar');
        const viewportEl = dialog.querySelector('.viewer-zoom-viewport');
        const zoomValueEl = dialog.querySelector('.viewer-zoom-value');
        const fitBtn = dialog.querySelector('.viewer-zoom-fit');
        const outBtn = dialog.querySelector('.viewer-zoom-out');
        const inBtn = dialog.querySelector('.viewer-zoom-in');
        const resetBtn = dialog.querySelector('.viewer-zoom-reset');

        let lastFocusedBtn = null;
        let isZoomEnabled = false;
        let zoomScale = 1.0;
        let isCurrentFit = true;

        const DRAG_THRESHOLD = 4;
        let isPointerDown = false;
        let isPanning = false;
        let activePointerId = null;
        let startX = 0;
        let startY = 0;
        let startScrollLeft = 0;
        let startScrollTop = 0;

        const updatePannableState = () => {
            if (!isZoomEnabled || !viewportEl) {
                dialog.classList.remove('is-pannable');
                return;
            }
            const canPan = viewportEl.scrollWidth > viewportEl.clientWidth || viewportEl.scrollHeight > viewportEl.clientHeight;
            if (canPan) {
                dialog.classList.add('is-pannable');
            } else {
                dialog.classList.remove('is-pannable');
            }
        };

        const updateToolbarI18n = (isTr) => {
            if (!toolbarEl) return;
            toolbarEl.setAttribute('aria-label', isTr ? 'Yakınlaştırma kontrolleri' : 'Zoom controls');
            if (fitBtn) {
                fitBtn.textContent = isTr ? 'Sığdır' : 'Fit';
                fitBtn.setAttribute('aria-label', isTr ? 'Görseli sığdır' : 'Fit image');
            }
            if (outBtn) {
                outBtn.textContent = '−';
                outBtn.setAttribute('aria-label', isTr ? 'Uzaklaştır' : 'Zoom out');
            }
            if (inBtn) {
                inBtn.textContent = '+';
                inBtn.setAttribute('aria-label', isTr ? 'Yakınlaştır' : 'Zoom in');
            }
            if (resetBtn) {
                resetBtn.textContent = isTr ? 'Sıfırla' : 'Reset';
                resetBtn.setAttribute('aria-label', isTr ? 'Yakınlaştırmayı sıfırla' : 'Reset zoom');
            }
        };

        const applyZoom = (newScale, isFitMode = false, cursorClientX = null, cursorClientY = null) => {
            if (!isZoomEnabled || !imgEl || !viewportEl) return;

            const naturalWidth = imgEl.naturalWidth;
            const naturalHeight = imgEl.naturalHeight;
            if (!naturalWidth || !naturalHeight) return;

            const minScale = isFitMode ? 0.02 : 0.25;
            const clampedScale = Math.min(4.0, Math.max(minScale, newScale));
            const oldScale = zoomScale;
            zoomScale = clampedScale;
            isCurrentFit = isFitMode;

            const vpWidth = viewportEl.clientWidth;
            const vpHeight = viewportEl.clientHeight;

            if (isFitMode) {
                const renderedWidth = Math.round(naturalWidth * zoomScale);
                const renderedHeight = Math.round(naturalHeight * zoomScale);
                imgEl.style.width = renderedWidth + 'px';
                imgEl.style.height = renderedHeight + 'px';

                const ml = Math.max(0, Math.floor((vpWidth - renderedWidth) / 2));
                const mt = Math.max(0, Math.floor((vpHeight - renderedHeight) / 2));
                imgEl.style.marginLeft = ml + 'px';
                imgEl.style.marginTop = mt + 'px';

                viewportEl.scrollLeft = 0;
                viewportEl.scrollTop = 0;
            } else {
                const vpRect = viewportEl.getBoundingClientRect();
                let mouseX = vpWidth / 2;
                let mouseY = vpHeight / 2;

                if (cursorClientX !== null && cursorClientY !== null) {
                    mouseX = cursorClientX - vpRect.left;
                    mouseY = cursorClientY - vpRect.top;
                }

                const prevMarginLeft = parseFloat(imgEl.style.marginLeft) || 0;
                const prevMarginTop = parseFloat(imgEl.style.marginTop) || 0;

                const imgX = (viewportEl.scrollLeft + mouseX - prevMarginLeft) / oldScale;
                const imgY = (viewportEl.scrollTop + mouseY - prevMarginTop) / oldScale;

                const renderedWidth = Math.round(naturalWidth * zoomScale);
                const renderedHeight = Math.round(naturalHeight * zoomScale);
                imgEl.style.width = renderedWidth + 'px';
                imgEl.style.height = renderedHeight + 'px';

                const newMarginLeft = Math.max(0, Math.floor((vpWidth - renderedWidth) / 2));
                const newMarginTop = Math.max(0, Math.floor((vpHeight - renderedHeight) / 2));
                imgEl.style.marginLeft = newMarginLeft + 'px';
                imgEl.style.marginTop = newMarginTop + 'px';

                const targetScrollLeft = Math.round(imgX * zoomScale + newMarginLeft - mouseX);
                const targetScrollTop = Math.round(imgY * zoomScale + newMarginTop - mouseY);

                viewportEl.scrollLeft = Math.max(0, targetScrollLeft);
                viewportEl.scrollTop = Math.max(0, targetScrollTop);
            }

            if (zoomValueEl) {
                zoomValueEl.textContent = Math.round(zoomScale * 100) + '%';
            }

            updatePannableState();
        };

        const setFit = () => {
            if (!imgEl || !viewportEl) return;
            const naturalWidth = imgEl.naturalWidth;
            const naturalHeight = imgEl.naturalHeight;
            if (!naturalWidth || !naturalHeight) return;

            const vpWidth = viewportEl.clientWidth;
            const vpHeight = viewportEl.clientHeight;
            if (!vpWidth || !vpHeight) return;

            const fitScale = Math.max(0.02, Math.min(
                vpWidth / naturalWidth,
                vpHeight / naturalHeight,
                1
            ));
            applyZoom(fitScale, true);
        };

        const closeDialog = () => {
            dialog.classList.add('closing');
            document.body.style.overflow = '';
            setTimeout(() => {
                if (dialog.open) {
                    dialog.close();
                }
                dialog.classList.remove('closing');
                dialog.classList.remove('viewer-zoom-enabled');
                dialog.classList.remove('is-pannable');
                dialog.classList.remove('is-dragging');

                if (viewportEl) {
                    try {
                        if (activePointerId != null && viewportEl.hasPointerCapture && viewportEl.hasPointerCapture(activePointerId)) {
                            viewportEl.releasePointerCapture(activePointerId);
                        }
                    } catch (_) {}
                    viewportEl.scrollLeft = 0;
                    viewportEl.scrollTop = 0;
                }
                if (imgEl) {
                    imgEl.style.width = '';
                    imgEl.style.height = '';
                    imgEl.style.marginLeft = '';
                    imgEl.style.marginTop = '';
                    imgEl.classList.remove('is-panning');
                    imgEl.draggable = true;
                }
                document.body.classList.remove('viewer-panning-active');
                isPointerDown = false;
                isPanning = false;
                activePointerId = null;
                isZoomEnabled = false;
                zoomScale = 1.0;
                isCurrentFit = true;

                if (lastFocusedBtn) {
                    lastFocusedBtn.focus();
                }
            }, 200);
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

        if (fitBtn) {
            fitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                setFit();
            });
        }

        if (outBtn) {
            outBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (zoomScale <= 0.25) return;
                const targetScale = zoomScale <= 0.30 ? 0.25 : Math.max(0.25, Math.round((zoomScale - 0.10) * 10) / 10);
                applyZoom(targetScale, false);
            });
        }

        if (inBtn) {
            inBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const targetScale = zoomScale < 0.25 ? 0.25 : (zoomScale < 0.30 ? 0.30 : Math.min(4.0, Math.round((zoomScale + 0.10) * 10) / 10));
                applyZoom(targetScale, false);
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                applyZoom(1.0, false);
            });
        }

        if (viewportEl) {
            viewportEl.addEventListener('wheel', (e) => {
                if (!isZoomEnabled) return;
                if (!e.ctrlKey) return;
                e.preventDefault();
                const step = e.deltaY < 0 ? 0.05 : -0.05;
                if (step < 0 && zoomScale <= 0.25) return;
                let targetScale;
                if (step > 0 && zoomScale < 0.25) {
                    targetScale = 0.25;
                } else {
                    targetScale = Math.min(4.0, Math.max(0.25, Math.round((zoomScale + step) * 20) / 20));
                }
                applyZoom(targetScale, false, e.clientX, e.clientY);
            }, { passive: false });
        }

        const endPan = (e) => {
            if (!isPointerDown && !isPanning) return;
            if (e && e.pointerId != null && activePointerId != null && e.pointerId !== activePointerId) return;

            if (activePointerId != null && viewportEl) {
                try {
                    if (viewportEl.hasPointerCapture && viewportEl.hasPointerCapture(activePointerId)) {
                        viewportEl.releasePointerCapture(activePointerId);
                    }
                } catch (_) {}
            }

            isPointerDown = false;
            isPanning = false;
            activePointerId = null;

            if (imgEl) {
                imgEl.classList.remove('is-panning');
            }
            dialog.classList.remove('is-dragging');
            document.body.classList.remove('viewer-panning-active');
            updatePannableState();
        };

        if (viewportEl) {
            viewportEl.addEventListener('pointerdown', (e) => {
                if (!isZoomEnabled || !dialog.open) return;
                if (e.pointerType === 'mouse' && e.button !== 0) {
                    return;
                }
                const canPan = viewportEl.scrollWidth > viewportEl.clientWidth || viewportEl.scrollHeight > viewportEl.clientHeight;
                if (!canPan) return;

                isPointerDown = true;
                isPanning = false;
                activePointerId = e.pointerId;
                startX = e.clientX;
                startY = e.clientY;
                startScrollLeft = viewportEl.scrollLeft;
                startScrollTop = viewportEl.scrollTop;
            });

            viewportEl.addEventListener('pointermove', (e) => {
                if (!isPointerDown || (activePointerId != null && e.pointerId !== activePointerId)) return;

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                if (!isPanning) {
                    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
                        isPanning = true;
                        try {
                            viewportEl.setPointerCapture(e.pointerId);
                        } catch (_) {}
                        if (imgEl) {
                            imgEl.classList.add('is-panning');
                        }
                        dialog.classList.add('is-dragging');
                        document.body.classList.add('viewer-panning-active');
                    }
                }

                if (isPanning) {
                    e.preventDefault();
                    viewportEl.scrollLeft = startScrollLeft - dx;
                    viewportEl.scrollTop = startScrollTop - dy;
                }
            });

            viewportEl.addEventListener('pointerup', endPan);
            viewportEl.addEventListener('pointercancel', endPan);
            viewportEl.addEventListener('lostpointercapture', endPan);

            viewportEl.addEventListener('dblclick', (e) => {
                if (!isZoomEnabled) return;
                e.preventDefault();
                if (isCurrentFit) {
                    applyZoom(1.0, false, e.clientX, e.clientY);
                } else {
                    setFit();
                }
            });
        }

        if (imgEl) {
            imgEl.addEventListener('dragstart', (e) => {
                if (isZoomEnabled) {
                    e.preventDefault();
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (!dialog.open || !isZoomEnabled) return;
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
                return;
            }

            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                const targetScale = zoomScale < 0.25 ? 0.25 : (zoomScale < 0.30 ? 0.30 : Math.min(4.0, Math.round((zoomScale + 0.10) * 10) / 10));
                applyZoom(targetScale, false);
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                if (zoomScale <= 0.25) return;
                const targetScale = zoomScale <= 0.30 ? 0.25 : Math.max(0.25, Math.round((zoomScale - 0.10) * 10) / 10);
                applyZoom(targetScale, false);
            } else if (e.key === '0') {
                e.preventDefault();
                applyZoom(1.0, false);
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                setFit();
            }
        });

        window.addEventListener('resize', () => {
            if (dialog.open && isZoomEnabled) {
                if (isCurrentFit) {
                    setFit();
                } else {
                    updatePannableState();
                }
            }
        });

        viewerButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                lastFocusedBtn = btn;
                const src = btn.getAttribute('data-viewer-src');
                const alt = btn.getAttribute('data-viewer-alt') || '';
                const caption = btn.getAttribute('data-viewer-caption') || '';
                const hasZoom = btn.getAttribute('data-viewer-zoom') === 'true';

                if (imgEl) {
                    imgEl.src = src;
                    imgEl.alt = alt;
                }
                if (captionEl) {
                    captionEl.textContent = caption;
                }

                isZoomEnabled = hasZoom;
                if (hasZoom) {
                    dialog.classList.add('viewer-zoom-enabled');
                    if (imgEl) {
                        imgEl.draggable = false;
                    }
                    const isTr = document.documentElement.lang === 'tr';
                    updateToolbarI18n(isTr);

                    const triggerFit = () => {
                        if (isZoomEnabled) {
                            setFit();
                        }
                    };

                    if (imgEl.complete && imgEl.naturalWidth > 0) {
                        requestAnimationFrame(triggerFit);
                    } else {
                        imgEl.onload = () => {
                            if (isZoomEnabled) {
                                requestAnimationFrame(triggerFit);
                            }
                        };
                    }
                } else {
                    dialog.classList.remove('viewer-zoom-enabled');
                    dialog.classList.remove('is-pannable');
                    dialog.classList.remove('is-dragging');
                    if (imgEl) {
                        imgEl.draggable = true;
                        imgEl.style.width = '';
                        imgEl.style.height = '';
                        imgEl.style.marginLeft = '';
                        imgEl.style.marginTop = '';
                        imgEl.classList.remove('is-panning');
                    }
                }

                document.body.style.overflow = 'hidden';
                dialog.showModal();
            });
        });
    }
});
