// ==========================================
// Showcase — Notifications
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const notifList = document.getElementById('notifications-list');
    const notifEmpty = document.getElementById('notifications-empty');
    const markAllBtn = document.getElementById('mark-all-read-btn');
    
    if (!notifList) return;
    
    let allNotifications = [];
    let currentFilter = 'all';
    const filterTabs = document.getElementById('notif-filter-tabs');

    if (filterTabs) {
        filterTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.notif-filter-btn');
            if (!btn) return;
            filterTabs.querySelectorAll('.notif-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter || 'all';
            renderFilteredNotifications();
        });
    }

    loadNotifications(1);
    
    // Mark all read
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async () => {
            try {
                await fetchJSON('/api/notifications/mark-all-read', { method: 'POST' });
                allNotifications.forEach(n => { n.is_read = true; });
                notifList.querySelectorAll('.notification-unread').forEach(el => {
                    el.classList.remove('notification-unread');
                    el.style.borderLeft = '';
                    el.style.backgroundColor = '';
                });
                showToast('All notifications marked as read.', 'success');
                updateBadgeCount();
            } catch {
                showToast('Failed to mark all as read.', 'error');
            }
        });
    }
    
    // Infinite scroll for notifications
    window.addEventListener('scroll', debounce(() => {
        if (isLoading || !hasMore) return;
        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 400) {
            currentPage++;
            loadNotifications(currentPage);
        }
    }, 200));
    
    async function loadNotifications(page) {
        if (isLoading) return;
        isLoading = true;
        
        try {
            const data = await fetchJSON(`/api/notifications?page=${page}`);
            
            // Remove skeletons on first load
            if (page === 1) {
                notifList.querySelectorAll('.skeleton').forEach(s => s.remove());
                allNotifications = [];
            }
            
            const notifications = data.notifications || [];
            hasMore = data.has_next || false;
            allNotifications = allNotifications.concat(notifications);
            
            renderFilteredNotifications();
            
        } catch {
            if (page === 1) {
                notifList.querySelectorAll('.skeleton').forEach(s => s.remove());
            }
        } finally {
            isLoading = false;
        }
    }

    function renderFilteredNotifications() {
        let filtered = allNotifications;
        if (currentFilter === 'requests') {
            filtered = filtered.filter(n => n.type === 'connection_request');
        } else if (currentFilter === 'activity') {
            filtered = filtered.filter(n => n.type !== 'connection_request');
        }

        notifList.innerHTML = '';

        if (filtered.length === 0) {
            if (notifEmpty) notifEmpty.classList.remove('d-none');
            return;
        }
        if (notifEmpty) notifEmpty.classList.add('d-none');

        filtered.forEach(notif => {
            notifList.insertAdjacentHTML('beforeend', renderNotification(notif));
        });

        // Attach event handlers
        notifList.querySelectorAll('.notif-accept-btn:not(.bound)').forEach(btn => {
            btn.classList.add('bound');
            btn.addEventListener('click', () => handleAccept(btn));
        });
        notifList.querySelectorAll('.notif-reject-btn:not(.bound)').forEach(btn => {
            btn.classList.add('bound');
            btn.addEventListener('click', () => handleReject(btn));
        });
        notifList.querySelectorAll('.notification-item:not(.bound)').forEach(item => {
            item.classList.add('bound');
            item.addEventListener('click', () => markRead(item));
        });
    }
    
    function renderNotification(notif) {
        const sender = notif.sender || {};
        const avatarSrc = sender.profile_image ? `/static/${sender.profile_image}` : '';
        const avatarHTML = avatarSrc
            ? `<img src="${avatarSrc}" alt="${sender.username}" class="rounded-circle flex-shrink-0" style="width: 48px; height: 48px; object-fit: cover;">`
            : `<div class="rounded-circle bg-light d-flex align-items-center justify-content-center flex-shrink-0" style="width: 48px; height: 48px;"><i class="bi bi-person-fill fs-4 text-secondary"></i></div>`;
        
        // Icon badge based on type
        let badgeIcon = '';
        switch (notif.type) {
            case 'like': 
                badgeIcon = '<span class="position-absolute bottom-0 end-0 rounded-circle text-white d-flex align-items-center justify-content-center shadow-sm" style="width: 20px; height: 20px; background: #E85A5A; border: 2px solid white; font-size: 0.6rem;"><i class="bi bi-heart-fill"></i></span>'; 
                break;
            case 'comment': 
                badgeIcon = '<span class="position-absolute bottom-0 end-0 rounded-circle text-white d-flex align-items-center justify-content-center shadow-sm" style="width: 20px; height: 20px; background: #E8725A; border: 2px solid white; font-size: 0.6rem;"><i class="bi bi-chat-fill"></i></span>'; 
                break;
            case 'share': 
                badgeIcon = '<span class="position-absolute bottom-0 end-0 rounded-circle text-white d-flex align-items-center justify-content-center shadow-sm" style="width: 20px; height: 20px; background: #4CAF82; border: 2px solid white; font-size: 0.6rem;"><i class="bi bi-send-fill"></i></span>'; 
                break;
            case 'connection_request': 
                badgeIcon = '<span class="position-absolute bottom-0 end-0 rounded-circle text-white d-flex align-items-center justify-content-center shadow-sm" style="width: 20px; height: 20px; background: #E8725A; border: 2px solid white; font-size: 0.6rem;"><i class="bi bi-person-plus-fill"></i></span>'; 
                break;
            case 'connection_accepted': 
                badgeIcon = '<span class="position-absolute bottom-0 end-0 rounded-circle text-white d-flex align-items-center justify-content-center shadow-sm" style="width: 20px; height: 20px; background: #4CAF82; border: 2px solid white; font-size: 0.6rem;"><i class="bi bi-check-lg"></i></span>'; 
                break;
        }
        
        let actionButtons = '';
        if (notif.type === 'connection_request' && notif.connection_id) {
            actionButtons = `
                <div class="d-flex gap-2 mt-2 pt-1">
                    <button class="btn btn-sm btn-primary-glow rounded-pill px-3 text-white fw-semibold notif-accept-btn" data-conn-id="${notif.connection_id}">Accept</button>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 notif-reject-btn" data-conn-id="${notif.connection_id}">Decline</button>
                </div>
            `;
        }
        
        const unreadClass = !notif.is_read ? 'notification-unread' : '';
        const unreadStyle = !notif.is_read ? 'border-left: 3px solid #E8725A !important; background-color: rgba(232, 114, 90, 0.04);' : '';

        return `
            <div class="card border-0 shadow-sm rounded-4 notification-item ${unreadClass} post-card" style="${unreadStyle}" data-notif-id="${notif.id}">
                <div class="card-body p-3 d-flex align-items-start gap-3">
                    <a href="/profile/${sender.username}" class="text-decoration-none position-relative">
                        ${avatarHTML}
                        ${badgeIcon}
                    </a>
                    <div class="flex-grow-1">
                        <p class="mb-1 text-dark" style="font-size: 0.92rem; line-height: 1.4;">
                            <a href="/profile/${sender.username}" class="fw-bold text-dark text-decoration-none">${sender.username}</a>
                            <span> ${escapeHtml(notif.message || '')}</span>
                        </p>
                        <span class="text-muted" style="font-size: 0.75rem;">${timeAgo(notif.created_at)}</span>
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }
    
    async function markRead(item) {
        const notifId = item.dataset.notifId;
        if (!notifId || !item.classList.contains('notification-unread')) return;
        
        try {
            await fetchJSON(`/notifications/${notifId}/read`, { method: 'POST' });
            item.classList.remove('notification-unread');
            item.style.borderLeft = '';
            item.style.backgroundColor = '';
            updateBadgeCount();
        } catch {}
    }
    
    async function handleAccept(btn) {
        const connId = btn.dataset.connId;
        btn.disabled = true;
        try {
            await fetchJSON(`/connection/accept/${connId}`, { method: 'POST' });
            const actions = btn.closest('.d-flex');
            if (actions) actions.innerHTML = '<span class="text-success small fw-medium"><i class="bi bi-check-circle me-1"></i>Connected</span>';
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
            const actions = btn.closest('.d-flex');
            if (actions) actions.innerHTML = '<span class="text-muted small">Declined</span>';
        } catch (error) {
            btn.disabled = false;
            showToast(error.message, 'error');
        }
    }
});
