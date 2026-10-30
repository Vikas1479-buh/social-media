// ==========================================
// Showcase — Core Application JavaScript
// ==========================================

function getCSRFToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

async function fetchJSON(url, options = {}) {
    options.headers = options.headers || {};
    options.headers['X-CSRFToken'] = getCSRFToken();
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    } else if (!options.body) {
        options.headers['Content-Type'] = 'application/json';
    }
    
    let response;
    try {
        response = await fetch(url, options);
    } catch (netErr) {
        throw new Error('Unable to connect to server. Please check if the Flask server is running.');
    }

    let data;
    try {
        data = await response.json();
    } catch (parseErr) {
        if (!response.ok) {
            throw new Error(`Server error (${response.status})`);
        }
        throw new Error('Unexpected response from server');
    }

    if (!response.ok) {
        throw new Error(data.error || data.message || 'Request failed');
    }
    return data;
}

async function fetchWithFile(url, formData) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken()
        },
        body: formData
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || data.message || 'Upload failed');
    }
    return data;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    const iconClass = type === 'error' ? 'bi-exclamation-circle-fill text-danger' :
                     type === 'success' ? 'bi-check-circle-fill text-success' :
                     'bi-info-circle-fill' ;
    const iconStyle = type === 'info' ? 'style="color: var(--primary, #E8725A);"' : '';
    const borderLeftColor = type === 'error' ? '#E85A5A' :
                            type === 'success' ? '#4CAF82' :
                            '#E8725A';

    const toast = document.createElement('div');
    toast.className = 'custom-toast bg-white shadow-lg rounded-4 p-3 mb-2 d-flex align-items-center gap-3 border-0';
    toast.setAttribute('role', 'alert');
    toast.style.cssText = `
        min-width: 300px;
        max-width: 420px;
        border-left: 4px solid ${borderLeftColor} !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important;
        animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    toast.innerHTML = `
        <div class="fs-5 d-flex align-items-center">
            <i class="bi ${iconClass}" ${iconStyle}></i>
        </div>
        <div class="flex-grow-1 small fw-medium text-dark">${message}</div>
        <button type="button" class="btn-close btn-close-sm shadow-none opacity-50" aria-label="Close" style="font-size: 0.75rem;"></button>
    `;
    
    toast.querySelector('.btn-close').addEventListener('click', () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 250);
    });

    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

function timeAgo(dateString) {
    if (!dateString) return '';
    let s = String(dateString).trim();
    // Ensure UTC interpretation if timezone offset or Z is missing
    if (!s.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) {
        s = s.replace(' ', 'T') + 'Z';
    }
    const date = new Date(s);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

function formatCount(num) {
    if (!num && num !== 0) return '0';
    num = parseInt(num);
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Update notification badge count
function updateBadgeCount() {
    fetch('/api/notifications/unread-count', {
        headers: { 'X-CSRFToken': getCSRFToken() }
    })
    .then(r => r.json())
    .then(data => {
        const badges = document.querySelectorAll('.badge-count');
        badges.forEach(badge => {
            if (data.count > 0) {
                badge.textContent = data.count > 99 ? '99+' : data.count;
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }
        });
    })
    .catch(() => {});
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const isAuthenticated = document.body.getAttribute('data-authenticated') === 'true';
    if (isAuthenticated) {
        // Heartbeat every 30s
        fetch('/api/heartbeat', { method: 'POST', headers: { 'X-CSRFToken': getCSRFToken() } }).catch(() => {});
        setInterval(() => {
            fetch('/api/heartbeat', { method: 'POST', headers: { 'X-CSRFToken': getCSRFToken() } }).catch(() => {});
        }, 30000);
        
        // Notification badge polling
        updateBadgeCount();
        setInterval(updateBadgeCount, 30000);
    }
    
    // Password visibility toggles
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.closest('.input-group').querySelector('input');
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('bi-eye', 'bi-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('bi-eye-slash', 'bi-eye');
            }
        });
    });

    // Navbar Create Post (+) button handler
    const navCreateBtn = document.getElementById('nav-create-post-btn');
    if (navCreateBtn) {
        navCreateBtn.addEventListener('click', (e) => {
            const createModal = document.getElementById('createPostModal');
            if (createModal && typeof bootstrap !== 'undefined') {
                e.preventDefault();
                const modal = bootstrap.Modal.getInstance(createModal) || new bootstrap.Modal(createModal);
                modal.show();
            } else {
                window.location.href = '/home?action=create';
            }
        });
    }

    // Universal mobile create button handler
    const mobileCreateBtn = document.getElementById('mobile-create-btn');
    if (mobileCreateBtn) {
        mobileCreateBtn.addEventListener('click', (e) => {
            const createModal = document.getElementById('createPostModal');
            if (createModal && typeof bootstrap !== 'undefined') {
                e.preventDefault();
                const modal = bootstrap.Modal.getInstance(createModal) || new bootstrap.Modal(createModal);
                modal.show();
            } else {
                window.location.href = '/home?action=create';
            }
        });
    }

    // Auto-open create modal if query parameter action=create is present
    if (window.location.search.includes('action=create')) {
        const createModal = document.getElementById('createPostModal');
        if (createModal && typeof bootstrap !== 'undefined') {
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(createModal) || new bootstrap.Modal(createModal);
                modal.show();
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 300);
        }
    }
});
