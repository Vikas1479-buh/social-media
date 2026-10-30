// ==========================================
// Showcase — Explore Page
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const exploreGrid = document.getElementById('explore-grid');
    const exploreEmpty = document.getElementById('explore-empty');
    const searchInput = document.getElementById('explore-search');
    const searchClearBtn = document.getElementById('explore-search-clear');
    const filterTabs = document.getElementById('explore-filter-tabs');
    
    if (!exploreGrid) return;
    
    let allUsers = [];
    let currentFilter = 'all';
    let currentSearch = '';

    loadExploreUsers();
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentSearch = searchInput.value.trim().toLowerCase();
            if (searchClearBtn) {
                if (currentSearch.length > 0) {
                    searchClearBtn.classList.remove('d-none');
                } else {
                    searchClearBtn.classList.add('d-none');
                }
            }
            debounce(applyFilters, 250)();
        });
    }

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentSearch = '';
            searchClearBtn.classList.add('d-none');
            applyFilters();
            searchInput.focus();
        });
    }

    if (filterTabs) {
        filterTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.explore-filter-btn');
            if (!btn) return;
            filterTabs.querySelectorAll('.explore-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter || 'all';
            applyFilters();
        });
    }
    
    async function loadExploreUsers() {
        try {
            const data = await fetchJSON('/api/explore');
            allUsers = Array.isArray(data) ? data : [];
            applyFilters();
        } catch {
            exploreGrid.innerHTML = '';
        }
    }
    
    function applyFilters() {
        let filtered = allUsers;
        if (currentFilter === 'online') {
            filtered = filtered.filter(u => u.is_online);
        } else if (currentFilter === 'connected') {
            filtered = filtered.filter(u => u.connection_status === 'connected');
        }

        if (currentSearch) {
            filtered = filtered.filter(u => u.username.toLowerCase().includes(currentSearch));
        }

        renderUsers(filtered);
    }
    
    function renderUsers(users) {
        // Remove skeletons
        exploreGrid.innerHTML = '';
        
        if (users.length === 0) {
            if (exploreEmpty) exploreEmpty.classList.remove('d-none');
            return;
        }
        if (exploreEmpty) exploreEmpty.classList.add('d-none');
        
        users.forEach(user => {
            const avatarSrc = user.profile_image ? `/static/${user.profile_image}` : '';
            const avatarHTML = avatarSrc
                ? `<img src="${avatarSrc}" alt="${user.username}" class="rounded-circle" style="width: 80px; height: 80px; object-fit: cover;">`
                : `<div class="rounded-circle bg-light d-flex align-items-center justify-content-center" style="width: 80px; height: 80px;"><i class="bi bi-person-fill fs-1 text-secondary"></i></div>`;
            
            const onlineIndicator = user.is_online
                ? '<span class="badge rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1" style="background: rgba(76, 175, 130, 0.15); color: #2E7D5A; font-size: 0.7rem;"><span class="online-pulse-dot"></span> Online</span>'
                : '<span class="text-muted" style="font-size: 0.72rem;">Active recently</span>';
            
            let actionBtn = '';
            if (user.connection_status === 'connected') {
                actionBtn = `<button class="btn btn-outline-secondary btn-sm rounded-pill px-3 w-100 fw-medium conn-btn" data-user-id="${user.id}" data-status="connected">Connected</button>`;
            } else if (user.connection_status === 'request_sent') {
                actionBtn = `<button class="btn btn-light btn-sm rounded-pill px-3 w-100 fw-medium text-muted" disabled>Pending</button>`;
            } else if (user.connection_status === 'request_received') {
                actionBtn = `
                    <div class="d-flex gap-1 w-100">
                        <button class="btn btn-sm rounded-pill px-3 flex-grow-1 btn-primary-glow text-white fw-semibold accept-btn" data-conn-id="${user.connection_id}">Accept</button>
                        <button class="btn btn-outline-secondary btn-sm rounded-pill px-2 reject-btn" data-conn-id="${user.connection_id}">✕</button>
                    </div>`;
            } else {
                actionBtn = `<button class="btn btn-sm rounded-pill px-3 w-100 btn-primary-glow text-white fw-semibold conn-btn" data-user-id="${user.id}" data-status="none">Connect</button>`;
            }
            
            exploreGrid.innerHTML += `
                <div class="col-6 col-sm-4 col-md-3 col-lg-3">
                    <div class="card border-0 shadow-sm rounded-4 h-100 text-center p-3 p-md-4 bg-white post-card position-relative">
                        <a href="/profile/${user.username}" class="text-decoration-none d-flex flex-column align-items-center mb-2 mt-1">
                            <div class="position-relative mb-2">
                                ${avatarHTML}
                                ${user.is_online ? '<span class="position-absolute bottom-0 end-0 p-1 bg-white rounded-circle"><span class="online-pulse-dot d-block"></span></span>' : ''}
                            </div>
                        </a>
                        <a href="/profile/${user.username}" class="text-decoration-none">
                            <div class="fw-bold text-dark mb-1 text-truncate" style="font-size: 0.95rem;">${user.username}</div>
                        </a>
                        <div class="mb-3">${onlineIndicator}</div>
                        <div class="mt-auto pt-2">${actionBtn}</div>
                    </div>
                </div>
            `;
        });
        
        // Event handlers
        exploreGrid.querySelectorAll('.conn-btn').forEach(btn => {
            btn.addEventListener('click', () => handleConnectionAction(btn));
        });
        exploreGrid.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', () => handleAccept(btn));
        });
        exploreGrid.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', () => handleReject(btn));
        });
    }
    
    async function handleConnectionAction(btn) {
        const userId = btn.dataset.userId;
        const status = btn.dataset.status;
        
        if (status === 'none') {
            btn.disabled = true;
            try {
                await fetchJSON(`/connect/${userId}`, { method: 'POST' });
                btn.textContent = 'Pending';
                btn.className = 'btn btn-secondary btn-sm rounded-pill px-3 w-100';
                btn.disabled = true;
                showToast('Connection request sent!', 'success');
            } catch (error) {
                btn.disabled = false;
                showToast(error.message, 'error');
            }
        } else if (status === 'connected') {
            btn.disabled = true;
            try {
                await fetchJSON(`/disconnect/${userId}`, { method: 'POST' });
                btn.textContent = 'Connect';
                btn.className = 'btn btn-sm rounded-pill px-3 w-100 text-white conn-btn';
                btn.style.backgroundColor = '#E8725A';
                btn.style.borderColor = '#E8725A';
                btn.dataset.status = 'none';
                btn.disabled = false;
                showToast('Disconnected.', 'info');
            } catch (error) {
                btn.disabled = false;
                showToast(error.message, 'error');
            }
        }
    }
    
    async function handleAccept(btn) {
        const connId = btn.dataset.connId;
        btn.disabled = true;
        try {
            await fetchJSON(`/connection/accept/${connId}`, { method: 'POST' });
            const container = btn.closest('.mt-auto');
            if (container) container.innerHTML = '<button class="btn btn-outline-secondary btn-sm rounded-pill px-3 w-100" disabled>Connected</button>';
            showToast('Connection accepted!', 'success');
        } catch (error) {
            btn.disabled = false;
            showToast(error.message, 'error');
        }
    }
    
    async function handleReject(btn) {
        const connId = btn.dataset.connId;
        btn.disabled = true;
        try {
            await fetchJSON(`/connection/reject/${connId}`, { method: 'POST' });
            const container = btn.closest('.mt-auto');
            if (container) container.innerHTML = '<span class="text-muted small">Rejected</span>';
        } catch (error) {
            btn.disabled = false;
            showToast(error.message, 'error');
        }
    }
});
