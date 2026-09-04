(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const themeButton = document.querySelector('#theme-toggle');
    const menuButton = document.querySelector('#menu-toggle');
    const navLinks = document.querySelector('#nav-links');
    const themeIcon = themeButton.querySelector('i');

    const syncThemeIcon = () => {
        const light = root.dataset.theme === 'light';
        themeIcon.className = light ? 'fa-solid fa-cloud-moon' : 'fa-solid fa-lightbulb';
        themeButton.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    };
    syncThemeIcon();

    const applyTheme = () => {
        root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('creative-theme', root.dataset.theme);
        syncThemeIcon();
    };

    let themeTransitionActive = false;

    themeButton.addEventListener('click', async (event) => {
        if (themeTransitionActive) return;
        if (reducedMotion) { applyTheme(); return; }

        const rect = event.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - 10;
        const y = rect.top + rect.height / 2;
        const farthestX = Math.max(x, document.documentElement.clientWidth - x);
        const farthestY = Math.max(y, document.documentElement.clientHeight - y);
        const radius = Math.ceil(Math.hypot(farthestX, farthestY)) + 12;
        const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        const pulse = document.createElement('span');
        pulse.className = 'theme-pulse';
        pulse.style.left = `${x - 50}px`;
        pulse.style.top = `${y - 50}px`;
        pulse.style.setProperty('--pulse-color', nextTheme === 'light' ? '#cbd5cf' : '#31443a');
        themeTransitionActive = true;
        let themeApplied = false;

        try {
            root.classList.add('theme-fading');
            window.dispatchEvent(new CustomEvent('portfolio-theme-transition', { detail: { active: true } }));
            document.body.appendChild(pulse);
            const expansion = pulse.animate(
                [
                    { transform: 'scale(0)', opacity: 0 },
                    { transform: `scale(${radius / 50})`, opacity: .32, offset: .72 },
                    { transform: `scale(${radius / 50})`, opacity: 0 }
                ],
                { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' }
            );

            await new Promise(resolve => window.setTimeout(resolve, 115));
            applyTheme();
            themeApplied = true;
            await expansion.finished;
        } catch (error) {
            if (!themeApplied) applyTheme();
        } finally {
            pulse.remove();
            root.classList.remove('theme-fading');
            window.dispatchEvent(new CustomEvent('portfolio-theme-transition', { detail: { active: false } }));
            themeTransitionActive = false;
        }
    });

    const closeMobileMenu = () => {
        navLinks.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.querySelector('i').className = 'fa-solid fa-bars';
    };

    menuButton.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.querySelector('i').className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    });
    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileMenu));
    addEventListener('keydown', event => {
        if (event.key === 'Escape' && navLinks.classList.contains('open')) {
            closeMobileMenu();
            menuButton.focus();
        }
    });
    const mobileNavigationQuery = matchMedia('(max-width: 720px)');
    mobileNavigationQuery.addEventListener('change', event => {
        if (!event.matches) closeMobileMenu();
    });

    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
        });
    }, { threshold: .12, rootMargin: '0px 0px -40px' });
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));

    const tiltWrap = document.querySelector('[data-tilt-wrap]');
    const tiltCard = document.querySelector('[data-tilt-card]');
    if (!reducedMotion && tiltWrap && tiltCard) {
        tiltWrap.addEventListener('pointermove', event => {
            const rect = tiltWrap.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - .5;
            const y = (event.clientY - rect.top) / rect.height - .5;
            tiltCard.style.transform = `rotateX(${-y * 10}deg) rotateY(${x * 12}deg) translateZ(18px)`;
        });
        tiltWrap.addEventListener('pointerleave', () => tiltCard.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0)');
    }

    document.querySelectorAll('[data-carousel]').forEach((carousel, carouselIndex) => {
        const slides = [...carousel.querySelectorAll('.slide')];
        const dotsWrap = carousel.querySelector('.carousel-dots');
        const process = carousel.closest('.art-chapter')?.querySelector('[data-project-process]');
        const processButtons = process ? [...process.querySelectorAll('[data-slide]')] : [];
        const processNote = process?.querySelector('.project-process-note');
        let current = 0;
        let timer;
        slides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `carousel-dot${index === 0 ? ' active' : ''}`;
            dot.setAttribute('aria-label', `Show artwork ${index + 1}`);
            dot.addEventListener('click', () => { show(index); schedule(); });
            dotsWrap.appendChild(dot);
        });
        const dots = [...dotsWrap.children];
        const syncProcess = (slideIndex, requestedStage = null) => {
            if (!processButtons.length || !processNote) return;
            const stageIndex = requestedStage ?? processButtons.findIndex(button => Number(button.dataset.slide) === slideIndex);
            if (stageIndex < 0) return;
            processButtons.forEach((button, index) => {
                const active = index === stageIndex;
                button.classList.toggle('active', active);
                button.setAttribute('aria-selected', String(active));
            });
            processNote.textContent = processButtons[stageIndex].dataset.note;
            if (!reducedMotion && processNote.animate) {
                processNote.animate(
                    [{ opacity: .2, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }],
                    { duration: 220, easing: 'ease-out' }
                );
            }
        };
        const show = (index, requestedStage = null) => {
            current = (index + slides.length) % slides.length;
            slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
            dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
            syncProcess(current, requestedStage);
        };
        processButtons.forEach((button, stageIndex) => {
            button.addEventListener('click', () => {
                show(Number(button.dataset.slide), stageIndex);
                schedule();
            });
        });
        const schedule = () => {
            clearTimeout(timer);
            if (!reducedMotion && slides.length > 1) timer = setTimeout(() => { show(current + 1); schedule(); }, 3800 + carouselIndex * 160);
        };
        carousel.querySelector('.prev').addEventListener('click', () => { show(current - 1); schedule(); });
        carousel.querySelector('.next').addEventListener('click', () => { show(current + 1); schedule(); });
        carousel.addEventListener('mouseenter', () => clearTimeout(timer));
        carousel.addEventListener('mouseleave', schedule);
        carousel.addEventListener('focusin', () => clearTimeout(timer));
        carousel.addEventListener('focusout', schedule);
        const hoverVideo = carousel.querySelector('[data-hover-video]');
        if (hoverVideo && matchMedia('(hover: hover)').matches) {
            carousel.addEventListener('mouseenter', () => {
                clearTimeout(timer);
                carousel.classList.add('video-hovering');
                hoverVideo.play().catch(() => {});
            });
            carousel.addEventListener('mouseleave', () => {
                carousel.classList.remove('video-hovering');
                hoverVideo.pause();
                hoverVideo.currentTime = 0;
            });
        }
        schedule();
    });

    document.querySelectorAll('[data-pixel-cast]').forEach(cast => {
        const spriteConfigs = {
            one: {
                src: 'assets/2d pixelated pixel art animation/Screenshot 2026-01-27 145216 (1) (1).png',
                x: [14, 218, 436, 655],
                y: [12, 285, 546],
                offsetY: [0, 0, 0],
                width: 190,
                height: 260
            },
            two: {
                src: 'assets/2d pixelated pixel art animation/Screenshot 2026-01-29 0857411.png',
                x: [72, 222, 377, 532],
                y: [17, 261, 490],
                offsetY: [0, 0, 29],
                width: 148,
                height: 240
            }
        };
        const actors = [...cast.querySelectorAll('[data-pixel-actor]')].map(canvas => {
            const config = spriteConfigs[canvas.dataset.pixelActor];
            const context = canvas.getContext('2d');
            const image = new Image();
            context.imageSmoothingEnabled = false;
            image.src = config.src;
            return { canvas, context, image, config };
        });
        const frames = [
            { cell: [0, 0], duration: 650 },
            { cell: [0, 1], duration: 180 },
            { cell: [0, 2], duration: 180 },
            { cell: [0, 3], duration: 180 },
            { cell: [0, 2], duration: 180 },
            { cell: [0, 1], duration: 180 },
            { cell: [0, 0], duration: 420 },
            { cell: [2, 0], duration: 170 },
            { cell: [2, 1], duration: 170 },
            { cell: [2, 2], duration: 170 },
            { cell: [2, 3], duration: 170 },
            { cell: [2, 2], duration: 170 },
            { cell: [2, 1], duration: 170 },
            { cell: [0, 0], duration: 420 },
            { cell: [1, 0], duration: 170 },
            { cell: [1, 1], duration: 170 },
            { cell: [1, 2], duration: 170 },
            { cell: [1, 3], duration: 170 },
            { cell: [1, 2], duration: 170 },
            { cell: [1, 1], duration: 170 },
            { cell: [0, 0], duration: 420 }
        ];
        let frame = 0;
        let animationTimer;
        const drawFrame = index => {
            const [row, column] = frames[index].cell;
            actors.forEach(({ canvas, context, image, config }) => {
                if (!image.complete || !image.naturalWidth) return;
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(
                    image,
                    config.x[column], config.y[row], config.width, config.height,
                    (canvas.width - config.width) / 2,
                    config.offsetY[row],
                    config.width,
                    config.height
                );
            });
        };
        actors.forEach(actor => actor.image.addEventListener('load', () => drawFrame(frame), { once: true }));
        const stopWalking = () => {
            clearTimeout(animationTimer);
            animationTimer = undefined;
            frame = 0;
            drawFrame(frame);
        };
        const startWalking = () => {
            if (reducedMotion || animationTimer) return;
            frame = 0;
            drawFrame(frame);
            const advance = () => {
                frame = (frame + 1) % frames.length;
                drawFrame(frame);
                animationTimer = setTimeout(advance, frames[frame].duration);
            };
            animationTimer = setTimeout(advance, frames[frame].duration);
        };
        cast.addEventListener('mouseenter', startWalking);
        cast.addEventListener('mouseleave', stopWalking);
        cast.addEventListener('focusin', startWalking);
        cast.addEventListener('focusout', stopWalking);
        stopWalking();
    });

    const lightbox = document.querySelector('#lightbox');
    const lightboxImage = document.querySelector('#lightbox-image');
    const closeLightbox = () => { lightbox.hidden = true; lightboxImage.src = ''; document.body.style.overflow = ''; };
    document.querySelectorAll('[data-lightbox]').forEach(button => button.addEventListener('click', () => {
        const image = button.querySelector('img');
        lightboxImage.src = image.src;
        lightboxImage.alt = image.alt;
        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
        document.querySelector('#lightbox-close').focus();
    }));
    document.querySelector('#lightbox-close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
    addEventListener('keydown', event => { if (event.key === 'Escape' && !lightbox.hidden) closeLightbox(); });

    const progress = document.querySelector('#scroll-progress');
    let progressFrame = 0;
    let previousScrollY = scrollY;
    const updateProgress = () => {
        const max = document.documentElement.scrollHeight - innerHeight;
        const percentage = max > 0 ? Math.min(100, Math.max(0, (scrollY / max) * 100)) : 0;
        const scrollingDown = scrollY >= previousScrollY;
        progress.style.width = `${percentage}%`;
        progress.style.setProperty('--pencil-angle', scrollingDown ? '-13deg' : '-20deg');
        previousScrollY = scrollY;
        progressFrame = 0;
    };
    addEventListener('scroll', () => {
        if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
    }, { passive: true });
    updateProgress();

    const cursor = document.querySelector('.ink-cursor');
    if (matchMedia('(pointer: fine)').matches) {
        addEventListener('pointermove', event => { cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`; }, { passive: true });
        document.querySelectorAll('a, button').forEach(item => {
            item.addEventListener('pointerenter', () => cursor.classList.add('hovering'));
            item.addEventListener('pointerleave', () => cursor.classList.remove('hovering'));
        });
    }

    document.querySelector('#year').textContent = new Date().getFullYear();
})();
