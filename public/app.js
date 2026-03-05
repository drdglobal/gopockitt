/* ==========================================
   GoPockitt — Main Application JS
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {

    // ==========================================
    // API Utility
    // ==========================================
    const API_BASE = '/api';

    const api = {
        async fetch(path, options = {}) {
            const token = localStorage.getItem('gopockitt_token');
            const headers = { 'Content-Type': 'application/json', ...options.headers };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
            if (res.status === 401) {
                localStorage.removeItem('gopockitt_token');
                localStorage.removeItem('gopockitt_user');
                updateNavAuth();
            }
            return res;
        },
        get(path) { return this.fetch(path); },
        post(path, body) { return this.fetch(path, { method: 'POST', body: JSON.stringify(body) }); },
        put(path, body) { return this.fetch(path, { method: 'PUT', body: JSON.stringify(body) }); },
        patch(path, body) { return this.fetch(path, { method: 'PATCH', body: JSON.stringify(body) }); }
    };

    // ==========================================
    // Auth State Management
    // ==========================================
    function getUser() {
        try { return JSON.parse(localStorage.getItem('gopockitt_user')); } catch { return null; }
    }

    function isLoggedIn() {
        return !!localStorage.getItem('gopockitt_token');
    }

    function updateNavAuth() {
        const user = getUser();
        const signInBtn = document.getElementById('signInBtn');
        const getStartedBtn = document.getElementById('getStartedBtn');

        if (user && signInBtn && getStartedBtn) {
            signInBtn.textContent = user.name.split(' ')[0];
            signInBtn.onclick = () => {};
            getStartedBtn.textContent = 'Sign Out';
            getStartedBtn.classList.remove('btn-primary');
            getStartedBtn.classList.add('btn-outline');
            getStartedBtn.onclick = () => {
                localStorage.removeItem('gopockitt_token');
                localStorage.removeItem('gopockitt_user');
                location.reload();
            };
        }
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; top: 100px; right: 20px; z-index: 10000;
            padding: 16px 24px; border-radius: 12px; font-weight: 500;
            animation: fadeInUp 0.4s ease-out; max-width: 400px;
            background: ${type === 'success' ? '#4ECDC4' : type === 'error' ? '#f5576c' : '#7B68EE'};
            color: white; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 3000);
        setTimeout(() => toast.remove(), 3500);
    }

    // ==========================================
    // Fetch Launch Mode Config
    // ==========================================
    let launchMode = 'live';
    try {
        const configRes = await fetch('/api/config');
        const config = await configRes.json();
        launchMode = config.launchMode || 'live';
    } catch (e) {
        console.warn('Could not fetch config, defaulting to live mode');
    }

    if (launchMode === 'prelaunch') {
        initPrelaunchMode();
    } else {
        initLiveMode();
    }

    // Remove loading class to reveal page
    document.body.classList.remove('loading');

    // ==========================================
    // Common Behaviors (both modes)
    // ==========================================
    initCommonBehaviors();

    function initCommonBehaviors() {
        // Initialize auth state
        updateNavAuth();

        // Check for email verification redirect
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('verified') === 'true') {
            showToast('Email verified! You can now sign in.', 'success');
            window.history.replaceState({}, '', window.location.pathname);
        } else if (urlParams.get('verified') === 'expired') {
            showToast('Verification link expired. Please register again.', 'error');
            window.history.replaceState({}, '', window.location.pathname);
        }

        // Navbar scroll effect
        const navbar = document.getElementById('navbar');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileToggle');
        const navLinks = document.getElementById('navLinks');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                mobileToggle.classList.toggle('active');
            });
            navLinks.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    mobileToggle.classList.remove('active');
                });
            });
        }

        // Scroll animations (fade in)
        const fadeObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => { entry.target.classList.add('visible'); }, index * 50);
                    fadeObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        const fadeElements = document.querySelectorAll(
            '.category-card, .deal-card, .step-card, .testimonial-card, .section-header, .feature-list li, .teaser-card'
        );
        fadeElements.forEach(el => {
            el.classList.add('fade-in');
            fadeObserver.observe(el);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const claimModal = document.getElementById('claimModal');
                const authModal = document.getElementById('authModal');
                if (claimModal) claimModal.classList.remove('active');
                if (authModal) authModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Email signup form (works for both modes — waitlist or newsletter)
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('nameInput').value;
                const email = document.getElementById('emailInput').value;
                const university = document.getElementById('universitySelect')?.value || null;

                try {
                    const res = await api.post('/subscribers', { name, email, university });
                    const data = await res.json();
                    signupForm.innerHTML = `
                        <div style="text-align: center; padding: 20px 0;">
                            <div style="font-size: 3rem; margin-bottom: 12px;">🎉</div>
                            <h3 style="margin-bottom: 8px;">You're on the list, ${name.split(' ')[0]}!</h3>
                            <p style="color: var(--gray-400);">We'll notify you at ${email} when deals go live.</p>
                        </div>
                    `;
                    showToast('You\'re on the waitlist!', 'success');
                } catch (err) {
                    showToast('Failed to subscribe. Please try again.', 'error');
                }
            });
        }
    }

    // ==========================================
    // PRE-LAUNCH MODE
    // ==========================================
    async function initPrelaunchMode() {
        document.body.classList.add('prelaunch-mode');

        // --- HERO SECTION ---
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.innerHTML = `
                <div class="hero-badge">
                    <span class="badge-dot"></span>
                    Launching March 2026
                </div>
                <h1 class="hero-title">
                    Perth's First
                    <span class="gradient-text">Student Deals</span>
                    Platform
                </h1>
                <p class="hero-subtitle">
                    Exclusive discounts from 50+ Perth CBD cafes, restaurants, gyms and shops —
                    built for uni students. Join the waitlist to get first access.
                </p>
                <form class="hero-waitlist-form" id="heroWaitlistForm">
                    <div class="hero-form-row">
                        <input type="text" placeholder="Your name" id="heroWaitlistName" required>
                        <input type="email" placeholder="you@ecu.edu.au" id="heroWaitlistEmail" required>
                    </div>
                    <div class="hero-form-row">
                        <select id="heroWaitlistUni">
                            <option value="">Select university</option>
                            <option value="ecu">Edith Cowan University</option>
                            <option value="uwa">University of Western Australia</option>
                            <option value="curtin">Curtin University</option>
                            <option value="murdoch">Murdoch University</option>
                            <option value="notre-dame">University of Notre Dame</option>
                            <option value="other">Other</option>
                        </select>
                        <button type="submit" class="btn btn-primary btn-lg">Join the Waitlist →</button>
                    </div>
                </form>
                <div class="hero-stats" id="waitlistStats">
                    <span class="stat-text">Loading...</span>
                </div>
            `;

            // Fetch and show waitlist count
            try {
                const countRes = await api.get('/subscribers/count');
                const data = await countRes.json();
                const statsEl = document.getElementById('waitlistStats');
                if (statsEl) {
                    if (data.count > 0) {
                        statsEl.innerHTML = `<span class="stat-text">🎉 Join ${data.count} student${data.count !== 1 ? 's' : ''} already on the waitlist</span>`;
                    } else {
                        statsEl.innerHTML = `<span class="stat-text">🚀 Be the first to join the waitlist!</span>`;
                    }
                }
            } catch (e) {
                const statsEl = document.getElementById('waitlistStats');
                if (statsEl) statsEl.innerHTML = `<span class="stat-text">🚀 Be the first to join the waitlist!</span>`;
            }

            // Handle hero waitlist form submission
            const heroForm = document.getElementById('heroWaitlistForm');
            if (heroForm) {
                heroForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const name = document.getElementById('heroWaitlistName').value;
                    const email = document.getElementById('heroWaitlistEmail').value;
                    const university = document.getElementById('heroWaitlistUni').value || null;

                    const submitBtn = heroForm.querySelector('button[type="submit"]');
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Joining...';

                    try {
                        await api.post('/subscribers', { name, email, university });
                        heroForm.innerHTML = `
                            <div class="waitlist-success">
                                <div style="font-size: 3rem; margin-bottom: 12px;">🎉</div>
                                <h3>You're on the list, ${name.split(' ')[0]}!</h3>
                                <p>We'll email ${email} when we launch.</p>
                            </div>
                        `;
                        showToast('Welcome to the waitlist!', 'success');
                    } catch (err) {
                        showToast('Failed to join waitlist. Please try again.', 'error');
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Join the Waitlist →';
                    }
                });
            }
        }

        // --- HERO VISUAL (blur floating deal cards as teaser) ---
        const heroVisual = document.querySelector('.hero-visual');
        if (heroVisual) {
            heroVisual.style.filter = 'blur(6px)';
            heroVisual.style.opacity = '0.5';
            heroVisual.style.pointerEvents = 'none';
        }

        // --- SOCIAL PROOF BAR ---
        const proofGrid = document.querySelector('.proof-grid');
        if (proofGrid) {
            let waitlistCount = 0;
            try {
                const countRes = await api.get('/subscribers/count');
                const data = await countRes.json();
                waitlistCount = data.count;
            } catch (e) {}

            proofGrid.innerHTML = `
                <div class="proof-item">
                    <span class="proof-number" style="color: var(--primary-light);">50+</span>
                    <span class="proof-label">Businesses Joining</span>
                </div>
                <div class="proof-divider"></div>
                <div class="proof-item">
                    <span class="proof-number" style="color: var(--primary-light);">${waitlistCount}</span>
                    <span class="proof-label">Students on Waitlist</span>
                </div>
                <div class="proof-divider"></div>
                <div class="proof-item">
                    <span class="proof-number" style="color: var(--primary-light);">6</span>
                    <span class="proof-label">Deal Categories</span>
                </div>
                <div class="proof-divider"></div>
                <div class="proof-item">
                    <span class="proof-number" style="color: var(--primary-light);">Free</span>
                    <span class="proof-label">Always for Students</span>
                </div>
            `;
        }

        // --- CATEGORIES SECTION ---
        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(card => {
            card.style.cursor = 'default';
            card.style.pointerEvents = 'none';
            const p = card.querySelector('p');
            if (p) p.textContent = 'Coming soon';
        });
        const catSubtitle = document.querySelector('.categories .section-subtitle');
        if (catSubtitle) catSubtitle.textContent = 'Deals across these categories are coming at launch';

        // --- DEALS SECTION ---
        const dealsSection = document.getElementById('deals');
        if (dealsSection) {
            const dealsContainer = dealsSection.querySelector('.container');
            if (dealsContainer) {
                dealsContainer.innerHTML = `
                    <div class="section-header">
                        <h2 class="section-title">Deals Coming Soon</h2>
                        <p class="section-subtitle">Exclusive offers from 50+ Perth CBD businesses</p>
                    </div>
                    <div class="prelaunch-deals-teaser">
                        <div class="teaser-grid">
                            <div class="teaser-card">
                                <div class="teaser-emoji">🍜</div>
                                <div class="teaser-label">Food & Dining</div>
                            </div>
                            <div class="teaser-card">
                                <div class="teaser-emoji">☕</div>
                                <div class="teaser-label">Coffee & Drinks</div>
                            </div>
                            <div class="teaser-card">
                                <div class="teaser-emoji">💪</div>
                                <div class="teaser-label">Fitness & Wellness</div>
                            </div>
                            <div class="teaser-card">
                                <div class="teaser-emoji">🛍️</div>
                                <div class="teaser-label">Retail & Fashion</div>
                            </div>
                            <div class="teaser-card">
                                <div class="teaser-emoji">🎬</div>
                                <div class="teaser-label">Entertainment</div>
                            </div>
                            <div class="teaser-card">
                                <div class="teaser-emoji">💼</div>
                                <div class="teaser-label">Services & More</div>
                            </div>
                        </div>
                        <p class="teaser-cta-text">Join the waitlist to be first to access these deals</p>
                        <button class="btn btn-primary btn-lg" id="teaserWaitlistBtn">Join the Waitlist</button>
                    </div>
                `;

                const teaserBtn = document.getElementById('teaserWaitlistBtn');
                if (teaserBtn) {
                    teaserBtn.addEventListener('click', () => {
                        const signupSection = document.getElementById('signup');
                        if (signupSection) signupSection.scrollIntoView({ behavior: 'smooth' });
                    });
                }
            }
        }

        // --- HOW IT WORKS ---
        const stepsGrid = document.querySelector('.steps-grid');
        if (stepsGrid) {
            const steps = stepsGrid.querySelectorAll('.step-card');
            if (steps.length >= 3) {
                steps[0].querySelector('.step-icon').textContent = '📝';
                steps[0].querySelector('h3').textContent = 'Join the Waitlist';
                steps[0].querySelector('p').textContent = 'Sign up with your university email (.edu.au). Takes 10 seconds.';
                steps[1].querySelector('.step-icon').textContent = '🔔';
                steps[1].querySelector('h3').textContent = 'Get Notified';
                steps[1].querySelector('p').textContent = "We'll email you the moment deals from Perth CBD businesses go live.";
                steps[2].querySelector('.step-icon').textContent = '🎉';
                steps[2].querySelector('h3').textContent = 'Start Saving';
                steps[2].querySelector('p').textContent = 'Browse and claim exclusive student deals. Show your code at checkout.';
            }
        }

        // --- MAP SECTION ---
        const mapSection = document.getElementById('map');
        if (mapSection) {
            mapSection.style.display = 'none';
        }

        // --- NAVIGATION ---
        const navLinksAll = document.querySelectorAll('.nav-link');
        navLinksAll.forEach(link => {
            if (link.getAttribute('href') === '#map') {
                link.style.display = 'none';
            }
            if (link.getAttribute('href') === '#deals') {
                link.textContent = 'Coming Soon';
            }
        });

        const signInBtn = document.getElementById('signInBtn');
        const getStartedBtn = document.getElementById('getStartedBtn');

        if (signInBtn && !isLoggedIn()) {
            signInBtn.textContent = 'Coming Soon';
            signInBtn.style.opacity = '0.5';
            signInBtn.style.pointerEvents = 'none';
            signInBtn.style.cursor = 'default';
        }

        if (getStartedBtn && !isLoggedIn()) {
            getStartedBtn.textContent = 'Join Waitlist';
            getStartedBtn.onclick = (e) => {
                e.preventDefault();
                const signupSection = document.getElementById('signup');
                if (signupSection) signupSection.scrollIntoView({ behavior: 'smooth' });
            };
        }

        // --- EMAIL SIGNUP SECTION (becomes waitlist CTA) ---
        const signupCard = document.querySelector('.signup-card');
        if (signupCard) {
            const h2 = signupCard.querySelector('h2');
            if (h2) h2.textContent = 'Join the Waitlist';
            const p = signupCard.querySelector('p');
            if (p) p.textContent = "Be the first to access exclusive student deals when we launch. It's free, always.";
            const submitBtn = signupCard.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Join the Waitlist →';
        }

        console.log('GoPockitt running in PRELAUNCH mode');
    }

    // ==========================================
    // LIVE MODE (full marketplace)
    // ==========================================
    function initLiveMode() {
        // Initialize auth state
        updateNavAuth();

        // --- Animated Counter (Social Proof) ---
        const counters = document.querySelectorAll('.proof-number');
        let countersAnimated = false;

        function animateCounters() {
            counters.forEach(counter => {
                const target = parseFloat(counter.getAttribute('data-target'));
                const isDollar = counter.classList.contains('dollar');
                const isDecimal = target % 1 !== 0;
                const duration = 2000;
                const startTime = performance.now();

                function updateCounter(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    const current = easeOut * target;

                    if (isDollar) {
                        counter.textContent = Math.floor(current).toLocaleString();
                    } else if (isDecimal) {
                        counter.textContent = current.toFixed(1);
                    } else {
                        counter.textContent = Math.floor(current).toLocaleString();
                    }

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    } else {
                        if (isDollar) {
                            counter.textContent = target.toLocaleString();
                        } else if (isDecimal) {
                            counter.textContent = target.toFixed(1);
                        } else {
                            counter.textContent = target.toLocaleString();
                        }
                    }
                }

                requestAnimationFrame(updateCounter);
            });
        }

        const proofSection = document.querySelector('.social-proof');
        if (proofSection) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !countersAnimated) {
                        countersAnimated = true;
                        animateCounters();
                    }
                });
            }, { threshold: 0.5 });
            observer.observe(proofSection);
        }

        // --- Fade animations for live elements ---
        const fadeObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => { entry.target.classList.add('visible'); }, index * 50);
                    fadeObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        // --- Load Deals from API ---
        const dealsGrid = document.getElementById('dealsGrid');

        async function loadDeals(category = 'all') {
            if (!dealsGrid) return;
            dealsGrid.innerHTML = '<div class="deals-loading" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-400);">Loading deals...</div>';

            try {
                const query = category !== 'all' ? `?category=${category}` : '';
                const res = await api.get(`/deals${query}`);
                const { deals } = await res.json();

                if (deals.length === 0) {
                    dealsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-400);">No deals found in this category.</div>';
                    return;
                }

                dealsGrid.innerHTML = deals.map(deal => `
                    <div class="deal-card" data-category="${deal.category}" data-deal-id="${deal.id}">
                        <div class="deal-image" style="background: ${deal.gradient || 'linear-gradient(135deg, #7B68EE 0%, #4ECDC4 100%)'};">
                            <span class="deal-emoji">${deal.emoji || '🎫'}</span>
                            ${deal.badge ? `<div class="deal-badge">${deal.badge}</div>` : ''}
                            ${deal.discount_label ? `<div class="deal-discount">${deal.discount_label}</div>` : ''}
                        </div>
                        <div class="deal-content">
                            <div class="deal-business">
                                <span class="business-name">${deal.business_name}</span>
                                <span class="deal-rating">⭐ ${deal.rating || '4.5'}</span>
                            </div>
                            <h3 class="deal-title">${deal.title}</h3>
                            <p class="deal-description">${deal.description}</p>
                            <div class="deal-meta">
                                ${deal.location ? `<span class="deal-location">📍 ${deal.location}</span>` : ''}
                                ${deal.time_restriction ? `<span class="deal-time">🕐 ${deal.time_restriction}</span>` : ''}
                            </div>
                            <div class="deal-footer">
                                <div class="deal-price">
                                    ${deal.price_original ? `<span class="price-original">${deal.price_original}</span>` : ''}
                                    ${deal.price_deal ? `<span class="price-deal">${deal.price_deal}</span>` : ''}
                                </div>
                                <button class="btn btn-primary btn-sm claim-btn" data-deal-id="${deal.id}">Claim Deal</button>
                            </div>
                        </div>
                    </div>
                `).join('');

                attachClaimHandlers();
                dealsGrid.querySelectorAll('.deal-card').forEach(el => {
                    el.classList.add('fade-in');
                    fadeObserver.observe(el);
                });
            } catch (err) {
                console.error('Failed to load deals:', err);
                dealsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-400);">Failed to load deals. Please refresh the page.</div>';
            }
        }

        loadDeals();

        // --- Deal Filtering ---
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.getAttribute('data-filter');
                loadDeals(filter);
            });
        });

        // --- Category Card Click → Filter Deals ---
        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.getAttribute('data-category');
                const dealsSection = document.getElementById('deals');
                filterBtns.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.getAttribute('data-filter') === category) btn.classList.add('active');
                });
                loadDeals(category);
                dealsSection.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // --- Claim Deal Modal ---
        const claimModal = document.getElementById('claimModal');
        const modalClose = document.getElementById('modalClose');
        const modalDealName = document.getElementById('modalDealName');
        const modalCode = document.getElementById('modalCode');
        const copyCodeBtn = document.getElementById('copyCodeBtn');
        const modalDoneBtn = document.getElementById('modalDoneBtn');

        let pendingDealId = null;

        function attachClaimHandlers() {
            document.querySelectorAll('.claim-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const dealId = e.target.dataset.dealId || e.target.closest('[data-deal-id]')?.dataset.dealId;
                    if (!dealId) return;
                    if (!isLoggedIn()) {
                        pendingDealId = dealId;
                        openAuth(true);
                        return;
                    }
                    await claimDeal(dealId);
                });
            });
        }

        async function claimDeal(dealId) {
            try {
                const res = await api.post('/claims', { dealId: parseInt(dealId) });
                const data = await res.json();
                if (!res.ok) {
                    showToast(data.error || 'Failed to claim deal', 'error');
                    return;
                }
                modalDealName.textContent = data.claim.dealTitle;
                modalCode.textContent = data.claim.code;
                const expiryEl = document.querySelector('.modal-expiry');
                if (expiryEl) {
                    const expires = new Date(data.claim.expiresAt);
                    expiryEl.textContent = `Valid until ${expires.toLocaleDateString()} at ${expires.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
                }
                if (data.claim.alreadyClaimed) {
                    showToast('Showing your existing claim code', 'info');
                }
                claimModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            } catch (err) {
                console.error('Claim error:', err);
                showToast('Failed to claim deal. Please try again.', 'error');
            }
        }

        function closeClaimModal() {
            if (claimModal) {
                claimModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        }

        if (modalClose) modalClose.addEventListener('click', closeClaimModal);
        if (modalDoneBtn) modalDoneBtn.addEventListener('click', closeClaimModal);
        if (claimModal) {
            claimModal.addEventListener('click', (e) => {
                if (e.target === claimModal) closeClaimModal();
            });
        }
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', () => {
                const code = modalCode.textContent;
                navigator.clipboard.writeText(code).then(() => {
                    copyCodeBtn.textContent = 'Copied!';
                    setTimeout(() => { copyCodeBtn.textContent = 'Copy Code'; }, 2000);
                });
            });
        }

        // --- Auth Modal ---
        const authModal = document.getElementById('authModal');
        const authModalClose = document.getElementById('authModalClose');
        const signInBtn = document.getElementById('signInBtn');
        const getStartedBtn = document.getElementById('getStartedBtn');
        const heroCtaBtn = document.getElementById('heroCtaBtn');
        const authTitle = document.getElementById('authTitle');
        const authNameGroup = document.getElementById('authNameGroup');
        const authSubmitBtn = document.getElementById('authSubmitBtn');
        const authSwitchText = document.getElementById('authSwitchText');
        const authSwitchLink = document.getElementById('authSwitchLink');
        const authForm = document.getElementById('authForm');

        let isSignUp = true;

        function openAuth(signUp = true) {
            if (isLoggedIn() && !signUp) return;
            isSignUp = signUp;
            updateAuthFormDisplay();
            authModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function updateAuthFormDisplay() {
            if (isSignUp) {
                authTitle.innerHTML = 'Join GoPock<span class="logo-it">it</span>t';
                authNameGroup.style.display = 'block';
                authSubmitBtn.textContent = 'Create Account';
                authSwitchText.textContent = 'Already have an account?';
                authSwitchLink.textContent = 'Sign In';
            } else {
                authTitle.textContent = 'Welcome Back';
                authNameGroup.style.display = 'none';
                authSubmitBtn.textContent = 'Sign In';
                authSwitchText.textContent = "Don't have an account?";
                authSwitchLink.textContent = 'Sign Up';
            }
        }

        if (!isLoggedIn()) {
            if (signInBtn) signInBtn.addEventListener('click', () => openAuth(false));
            if (getStartedBtn) getStartedBtn.addEventListener('click', () => openAuth(true));
        }

        if (heroCtaBtn) {
            heroCtaBtn.addEventListener('click', () => {
                document.getElementById('deals').scrollIntoView({ behavior: 'smooth' });
            });
        }

        if (authSwitchLink) {
            authSwitchLink.addEventListener('click', (e) => {
                e.preventDefault();
                isSignUp = !isSignUp;
                updateAuthFormDisplay();
            });
        }

        function closeAuthModal() {
            if (authModal) {
                authModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        }

        if (authModalClose) authModalClose.addEventListener('click', closeAuthModal);
        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) closeAuthModal();
            });
        }

        if (authForm) {
            authForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('authEmail').value;
                const password = document.getElementById('authPassword').value;

                authSubmitBtn.disabled = true;
                authSubmitBtn.textContent = isSignUp ? 'Creating...' : 'Signing in...';

                try {
                    if (isSignUp) {
                        const name = document.getElementById('authName').value;
                        const res = await api.post('/auth/register', { name, email, password });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error);

                        const modal = authModal.querySelector('.modal-content');
                        modal.innerHTML = `
                            <div class="modal-icon">📧</div>
                            <h2>Check Your Email</h2>
                            <p style="color: var(--gray-400); margin-bottom: 24px;">
                                We sent a verification link to <strong>${email}</strong>. Click it to activate your account, then sign in.
                            </p>
                            <p style="color: var(--gray-500); font-size: 0.85rem; margin-bottom: 24px;">
                                (In development mode, you can sign in immediately)
                            </p>
                            <button class="btn btn-primary btn-full" onclick="document.getElementById('authModal').classList.remove('active'); document.body.style.overflow = ''; location.reload();">
                                Got It
                            </button>
                        `;
                    } else {
                        const res = await api.post('/auth/login', { email, password });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error);

                        localStorage.setItem('gopockitt_token', data.token);
                        localStorage.setItem('gopockitt_user', JSON.stringify(data.user));
                        updateNavAuth();
                        closeAuthModal();
                        showToast(`Welcome back, ${data.user.name.split(' ')[0]}!`, 'success');

                        if (pendingDealId) {
                            await claimDeal(pendingDealId);
                            pendingDealId = null;
                        }
                    }
                } catch (err) {
                    showToast(err.message, 'error');
                } finally {
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
                }
            });
        }

        // --- Load More Button ---
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                loadMoreBtn.textContent = 'Loading...';
                setTimeout(() => {
                    loadMoreBtn.textContent = 'Coming Soon — More Deals Being Added!';
                    loadMoreBtn.disabled = true;
                    loadMoreBtn.style.opacity = '0.6';
                }, 1000);
            });
        }

        console.log('GoPockitt running in LIVE mode');
    }

});
