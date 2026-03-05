/* ==========================================
   GoPockitt — Main Application JS
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

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
            signInBtn.onclick = () => {
                // Show my deals or profile in future
            };
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

    // Initialize auth state on page load
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
    // Navbar Scroll Effect
    // ==========================================
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // ==========================================
    // Mobile Menu Toggle
    // ==========================================
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

    // ==========================================
    // Animated Counter (Social Proof)
    // ==========================================
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

    // ==========================================
    // Scroll Animations (Fade In)
    // ==========================================
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, index * 50);
                fadeObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    function initFadeAnimations() {
        const fadeElements = document.querySelectorAll(
            '.category-card, .deal-card, .step-card, .testimonial-card, .section-header, .feature-list li'
        );
        fadeElements.forEach(el => {
            el.classList.add('fade-in');
            fadeObserver.observe(el);
        });
    }

    initFadeAnimations();

    // ==========================================
    // Load Deals from API
    // ==========================================
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

            // Attach claim handlers to new buttons
            attachClaimHandlers();

            // Re-apply fade animations to new cards
            dealsGrid.querySelectorAll('.deal-card').forEach(el => {
                el.classList.add('fade-in');
                fadeObserver.observe(el);
            });
        } catch (err) {
            console.error('Failed to load deals:', err);
            dealsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-400);">Failed to load deals. Please refresh the page.</div>';
        }
    }

    // Load deals on page load
    loadDeals();

    // ==========================================
    // Deal Filtering
    // ==========================================
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            loadDeals(filter);
        });
    });

    // ==========================================
    // Category Card Click → Filter Deals
    // ==========================================
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.getAttribute('data-category');
            const dealsSection = document.getElementById('deals');

            filterBtns.forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-filter') === category) {
                    btn.classList.add('active');
                }
            });

            loadDeals(category);
            dealsSection.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // ==========================================
    // Claim Deal Modal (Real API)
    // ==========================================
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

            // Update expiry display
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

    // Copy code
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            const code = modalCode.textContent;
            navigator.clipboard.writeText(code).then(() => {
                copyCodeBtn.textContent = 'Copied!';
                setTimeout(() => { copyCodeBtn.textContent = 'Copy Code'; }, 2000);
            });
        });
    }

    // ==========================================
    // Auth Modal (Real API)
    // ==========================================
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
        if (isLoggedIn() && !signUp) return; // Already logged in
        isSignUp = signUp;
        updateAuthForm();
        authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function updateAuthForm() {
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

    // Only bind auth buttons if user is NOT logged in
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
            updateAuthForm();
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

    // Auth form submission — REAL API
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

                    // Show verification message
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

                    // If there was a pending claim, execute it now
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

    // ==========================================
    // Email Signup Form (Real API)
    // ==========================================
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
                        <h3 style="margin-bottom: 8px;">You're in, ${name.split(' ')[0]}!</h3>
                        <p style="color: var(--gray-400);">We'll send the best deals straight to ${email}</p>
                    </div>
                `;
            } catch (err) {
                showToast('Failed to subscribe. Please try again.', 'error');
            }
        });
    }

    // ==========================================
    // Keyboard Shortcuts
    // ==========================================
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeClaimModal();
            closeAuthModal();
        }
    });

    // ==========================================
    // Load More Button
    // ==========================================
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

});
