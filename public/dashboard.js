/* ==========================================
   GoPockitt — Partner Dashboard JS
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // API Utility
    // ==========================================
    const API_BASE = '/api';

    const api = {
        async fetch(path, options = {}) {
            const token = localStorage.getItem('gopockitt_partner_token');
            const headers = { 'Content-Type': 'application/json', ...options.headers };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
            if (res.status === 401) {
                localStorage.removeItem('gopockitt_partner_token');
                localStorage.removeItem('gopockitt_partner');
                window.location.href = '/partner.html';
            }
            return res;
        },
        get(path) { return this.fetch(path); },
        post(path, body) { return this.fetch(path, { method: 'POST', body: JSON.stringify(body) }); },
        put(path, body) { return this.fetch(path, { method: 'PUT', body: JSON.stringify(body) }); },
        patch(path, body) { return this.fetch(path, { method: 'PATCH', body: JSON.stringify(body) }); }
    };

    // ==========================================
    // Auth Check
    // ==========================================
    const token = localStorage.getItem('gopockitt_partner_token');
    const partner = (() => { try { return JSON.parse(localStorage.getItem('gopockitt_partner')); } catch { return null; } })();

    if (!token || !partner) {
        window.location.href = '/partner.html';
        return;
    }

    // Display business name
    document.getElementById('businessName').textContent = partner.businessName || 'Partner';

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('gopockitt_partner_token');
        localStorage.removeItem('gopockitt_partner');
        window.location.href = '/partner.html';
    });

    // ==========================================
    // Sidebar Navigation
    // ==========================================
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    const sections = document.querySelectorAll('.dash-section');

    sidebarBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.section;

            sidebarBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${target}`).classList.add('active');

            // Load data when switching sections
            if (target === 'deals') loadMyDeals();
            if (target === 'analytics') loadAnalytics();
        });
    });

    // ==========================================
    // Verify Code
    // ==========================================
    const verifyInput = document.getElementById('verifyCodeInput');
    const verifyBtn = document.getElementById('verifyBtn');
    const verifyResult = document.getElementById('verifyResult');

    // Auto-format input: add dash after PKT
    verifyInput.addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        if (val.length === 3 && !val.includes('-')) {
            val = val + '-';
        }
        e.target.value = val;
    });

    verifyBtn.addEventListener('click', async () => {
        const code = verifyInput.value.trim();
        if (!code) return;

        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';

        try {
            const res = await api.post('/partners/verify-code', { code });
            const data = await res.json();

            if (data.valid) {
                verifyResult.innerHTML = `
                    <div class="verify-result-card success">
                        <div class="verify-result-icon">✅</div>
                        <div class="verify-result-title">Code Verified — Deal Redeemed!</div>
                        <div class="verify-result-detail">
                            <strong>${data.dealTitle}</strong><br>
                            Student: ${data.studentName}<br>
                            Redeemed at: ${new Date(data.redeemedAt).toLocaleString()}
                        </div>
                    </div>
                `;
                verifyInput.value = '';
            } else {
                verifyResult.innerHTML = `
                    <div class="verify-result-card error">
                        <div class="verify-result-icon">❌</div>
                        <div class="verify-result-title">Invalid Code</div>
                        <div class="verify-result-detail">${data.reason}</div>
                    </div>
                `;
            }
        } catch (err) {
            verifyResult.innerHTML = `
                <div class="verify-result-card error">
                    <div class="verify-result-icon">⚠️</div>
                    <div class="verify-result-title">Error</div>
                    <div class="verify-result-detail">Failed to verify code. Please try again.</div>
                </div>
            `;
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Redeem';
        }
    });

    // Enter key on verify input
    verifyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') verifyBtn.click();
    });

    // ==========================================
    // My Deals
    // ==========================================
    async function loadMyDeals() {
        const container = document.getElementById('dealsTable');
        try {
            const res = await api.get('/partners/deals');
            const { deals } = await res.json();

            if (deals.length === 0) {
                container.innerHTML = '<p style="color: var(--gray-400); text-align: center; padding: 40px;">No deals yet. Create your first deal!</p>';
                return;
            }

            container.innerHTML = `
                <table class="deals-table">
                    <thead>
                        <tr>
                            <th>Deal</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Claims</th>
                            <th>Redeemed</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${deals.map(deal => `
                            <tr>
                                <td><strong>${deal.title}</strong></td>
                                <td>${deal.category}</td>
                                <td><span class="status-badge ${deal.status}">${deal.status}</span></td>
                                <td>${deal.total_claims || 0}</td>
                                <td>${deal.total_redemptions || 0}</td>
                                <td>
                                    ${deal.status === 'active'
                                        ? `<button class="action-btn pause" onclick="toggleDealStatus(${deal.id}, 'paused')">Pause</button>`
                                        : `<button class="action-btn activate" onclick="toggleDealStatus(${deal.id}, 'active')">Activate</button>`
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (err) {
            container.innerHTML = '<p style="color: #f5576c; text-align: center; padding: 40px;">Failed to load deals.</p>';
        }
    }

    // Toggle deal status (global function for onclick)
    window.toggleDealStatus = async function(dealId, status) {
        try {
            await api.patch(`/partners/deals/${dealId}/status`, { status });
            loadMyDeals(); // Refresh
        } catch (err) {
            alert('Failed to update deal status.');
        }
    };

    // ==========================================
    // Create Deal
    // ==========================================
    const createForm = document.getElementById('createDealForm');

    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = createForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';

        const dealData = {
            title: document.getElementById('dealTitle').value,
            description: document.getElementById('dealDescription').value,
            category: document.getElementById('dealCategory').value,
            priceOriginal: document.getElementById('dealPriceOriginal').value || null,
            priceDeal: document.getElementById('dealPriceDeal').value || null,
            discountLabel: document.getElementById('dealDiscount').value || null,
            location: document.getElementById('dealLocation').value || null,
            timeRestriction: document.getElementById('dealTime').value || null,
            badge: document.getElementById('dealBadge').value || null,
            emoji: document.getElementById('dealEmoji').value || '🎫'
        };

        try {
            const res = await api.post('/partners/deals', dealData);
            const data = await res.json();

            if (!res.ok) {
                alert(data.error || 'Failed to create deal.');
                return;
            }

            // Show success
            createForm.innerHTML = `
                <div class="form-success">
                    <div style="font-size: 2.5rem; margin-bottom: 12px;">🎉</div>
                    <div style="font-size: 1.2rem; margin-bottom: 8px;">Deal Created!</div>
                    <div style="color: var(--gray-400); font-weight: 400; margin-bottom: 20px;">
                        "${data.deal.title}" is now live for students.
                    </div>
                    <button class="btn btn-primary" onclick="location.reload()">Create Another</button>
                </div>
            `;
        } catch (err) {
            alert('Failed to create deal. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Deal';
        }
    });

    // ==========================================
    // Analytics
    // ==========================================
    async function loadAnalytics() {
        try {
            const res = await api.get('/partners/analytics');
            const data = await res.json();

            // Update stat cards
            document.getElementById('statClaims').textContent = data.stats.totalClaims;
            document.getElementById('statRedemptions').textContent = data.stats.totalRedemptions;
            document.getElementById('statActive').textContent = data.stats.activeClaims;
            document.getElementById('statConversion').textContent = data.stats.conversionRate + '%';

            // Recent activity table
            const activityContainer = document.getElementById('recentActivity');
            if (data.recentActivity.length === 0) {
                activityContainer.innerHTML = '<p style="color: var(--gray-400); text-align: center; padding: 40px;">No activity yet. Share your deals with students!</p>';
                return;
            }

            activityContainer.innerHTML = `
                <table class="activity-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Deal</th>
                            <th>Student</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.recentActivity.map(item => `
                            <tr>
                                <td><code style="color: var(--primary); font-weight: 600;">${item.code}</code></td>
                                <td>${item.deal_title}</td>
                                <td>${item.student_name.split(' ')[0]}</td>
                                <td><span class="status-badge ${item.status}">${item.status}</span></td>
                                <td>${new Date(item.claimed_at).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (err) {
            document.getElementById('recentActivity').innerHTML = '<p style="color: #f5576c; text-align: center; padding: 40px;">Failed to load analytics.</p>';
        }
    }

});
