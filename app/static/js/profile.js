// ==========================================
// Showcase — Profile Page
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const postsGrid = document.getElementById('profile-posts-grid');
    const profileEmpty = document.getElementById('profile-empty');
    const editProfileForm = document.getElementById('edit-profile-form');
    const editAvatarInput = document.getElementById('edit-avatar-input');
    const editBio = document.getElementById('edit-bio');
    const bioCharCount = document.getElementById('bio-char-count');
    
    if (!postsGrid) return;
    
    const userId = parseInt(postsGrid.dataset.userId);
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    
    // Load posts
    loadUserPosts(1);
    
    // Infinite scroll for profile posts
    window.addEventListener('scroll', debounce(() => {
        if (isLoading || !hasMore) return;
        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 400) {
            currentPage++;
            loadUserPosts(currentPage);
        }
    }, 200));
    
    async function loadUserPosts(page) {
        if (isLoading) return;
        isLoading = true;
        
        try {
            const data = await fetchJSON(`/api/user/${userId}/posts?page=${page}`);
            
            // Remove skeletons on first load
            if (page === 1) {
                postsGrid.querySelectorAll('.skeleton-profile-post').forEach(s => s.remove());
            }
            
            const posts = data.posts || [];
            hasMore = data.has_next || false;
            
            if (posts.length === 0 && page === 1) {
                if (profileEmpty) profileEmpty.classList.remove('d-none');
                return;
            }
            if (profileEmpty) profileEmpty.classList.add('d-none');
            
            posts.forEach(post => {
                postsGrid.insertAdjacentHTML('beforeend', `
                    <div class="col-4 mb-3">
                        <div class="position-relative overflow-hidden rounded-4 bg-light profile-post-card shadow-sm" data-post-id="${post.id}" style="aspect-ratio: 1/1; cursor: pointer; transition: transform 0.2s ease;">
                            <img src="/static/${post.image_url}" alt="Post" class="w-100 h-100" style="object-fit: cover;" loading="lazy">
                            <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center gap-3 text-white fw-bold profile-post-overlay" 
                                 style="background: rgba(0,0,0,0.38); opacity: 0; transition: opacity 0.2s;">
                                <span class="d-flex align-items-center gap-1"><i class="bi bi-heart-fill"></i> ${formatCount(post.like_count)}</span>
                                <span class="d-flex align-items-center gap-1"><i class="bi bi-chat-fill"></i> ${formatCount(post.comment_count)}</span>
                            </div>
                        </div>
                    </div>
                `);
            });

            // Delegate click for post modal
            postsGrid.addEventListener('click', (e) => {
                const card = e.target.closest('.profile-post-card');
                if (card) {
                    const postId = card.dataset.postId;
                    if (postId) openPostDetailModal(postId);
                }
            });
        } catch {
            if (page === 1) {
                postsGrid.querySelectorAll('.skeleton-profile-post').forEach(s => s.remove());
            }
        } finally {
            isLoading = false;
        }
    }
    
    // Share profile link
    const shareProfileBtn = document.getElementById('share-profile-btn');
    if (shareProfileBtn) {
        shareProfileBtn.addEventListener('click', () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    showToast('Profile link copied to clipboard!', 'success');
                }).catch(() => {
                    showToast('Profile URL: ' + window.location.href, 'info');
                });
            } else {
                showToast('Profile URL: ' + window.location.href, 'info');
            }
        });
    }

    // ---- Edit Profile ----
    // Bio character count
    if (editBio && bioCharCount) {
        bioCharCount.textContent = editBio.value.length;
        editBio.addEventListener('input', () => {
            bioCharCount.textContent = editBio.value.length;
        });
    }
    
    // Avatar preview
    if (editAvatarInput) {
        editAvatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            
            const reader = new FileReader();
            reader.onload = (ev) => {
                const preview = document.getElementById('edit-avatar-preview');
                const placeholder = document.getElementById('edit-avatar-placeholder');
                if (preview) {
                    preview.src = ev.target.result;
                    preview.classList.remove('d-none');
                }
                if (placeholder) placeholder.classList.add('d-none');
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Save profile
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('save-profile-btn');
            const saveText = saveBtn.querySelector('.save-text');
            const spinner = saveBtn.querySelector('.spinner-border');
            
            saveBtn.disabled = true;
            if (saveText) saveText.textContent = 'Saving...';
            if (spinner) spinner.classList.remove('d-none');
            
            const formData = new FormData();
            
            // Bio
            if (editBio) formData.append('bio', editBio.value);
            
            // Avatar
            if (editAvatarInput && editAvatarInput.files[0]) {
                formData.append('profile_image', editAvatarInput.files[0]);
            }
            
            try {
                const data = await fetchWithFile('/profile/update', formData);
                showToast('Profile updated!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
                if (modal) modal.hide();
                
                // Refresh page to show updates
                setTimeout(() => location.reload(), 500);
            } catch (error) {
                showToast(error.message || 'Failed to update profile.', 'error');
            } finally {
                saveBtn.disabled = false;
                if (saveText) saveText.textContent = 'Save Changes';
                if (spinner) spinner.classList.add('d-none');
            }
        });
    }

    // ---- Post Detail Modal (Lightbox) ----
    async function openPostDetailModal(postId) {
        let modalEl = document.getElementById('profilePostDetailModal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'profilePostDetailModal';
            modalEl.className = 'modal fade';
            modalEl.setAttribute('tabindex', '-1');
            document.body.appendChild(modalEl);
        }

        modalEl.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
                    <div class="modal-body p-0">
                        <div class="row g-0">
                            <!-- Image column -->
                            <div class="col-12 col-md-7 bg-black d-flex align-items-center justify-content-center" style="min-height: 380px; max-height: 580px;">
                                <img id="profile-detail-img" src="" class="img-fluid w-100 h-100" style="object-fit: contain; max-height: 580px;" alt="Post image">
                            </div>
                            <!-- Details column -->
                            <div class="col-12 col-md-5 d-flex flex-column bg-white" style="max-height: 580px;">
                                <!-- Header -->
                                <div class="p-3 border-bottom d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center gap-2">
                                        <img id="profile-detail-avatar" src="" class="rounded-circle" width="36" height="36" style="object-fit: cover;">
                                        <span id="profile-detail-username" class="fw-bold text-dark small"></span>
                                    </div>
                                    <div class="d-flex align-items-center gap-2">
                                        <button type="button" class="btn btn-link text-danger p-0 text-decoration-none d-none" id="profile-detail-delete-btn" title="Delete post" aria-label="Delete post">
                                            <i class="bi bi-trash3 fs-5"></i>
                                        </button>
                                        <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                </div>
                                <!-- Caption & Comments Area -->
                                <div class="p-3 flex-grow-1 overflow-y-auto" id="profile-detail-comments" style="max-height: 320px;">
                                    <div id="profile-detail-caption" class="mb-3 pb-2 border-bottom d-none">
                                        <span id="profile-detail-caption-author" class="fw-bold small me-1"></span>
                                        <span id="profile-detail-caption-text" class="text-dark small"></span>
                                    </div>
                                    <div id="profile-detail-comments-list" class="d-flex flex-column gap-2">
                                        <div class="text-center py-3 text-muted small"><span class="spinner-border spinner-border-sm me-1"></span>Loading...</div>
                                    </div>
                                </div>
                                <!-- Actions -->
                                <div class="p-3 border-top mt-auto bg-white">
                                    <div class="d-flex align-items-center gap-3 mb-2">
                                        <button class="btn btn-link p-0 text-decoration-none" id="profile-detail-like-btn">
                                            <i class="bi bi-heart fs-5"></i>
                                            <span class="like-count fw-bold small ms-1">0</span>
                                        </button>
                                        <button class="btn btn-link p-0 text-decoration-none text-dark" id="profile-detail-comment-icon">
                                            <i class="bi bi-chat fs-5"></i>
                                            <span class="comment-count fw-bold small ms-1">0</span>
                                        </button>
                                        <button class="btn btn-link p-0 text-decoration-none text-dark" id="profile-detail-share-btn">
                                            <i class="bi bi-send fs-5"></i>
                                        </button>
                                    </div>
                                    <div class="text-muted" id="profile-detail-time" style="font-size: 0.72rem;"></div>
                                    <!-- Add comment form -->
                                    <div class="input-group mt-2">
                                        <input type="text" class="form-control form-control-sm rounded-pill-start bg-light border-0 shadow-none ps-3" id="profile-detail-comment-input" placeholder="Add a comment...">
                                        <button class="btn btn-primary-glow btn-sm text-white px-3 rounded-pill-end fw-semibold" id="profile-detail-comment-send" disabled>Post</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        try {
            const post = await fetchJSON(`/posts/${postId}`);
            const author = post.author || {};
            const imgEl = modalEl.querySelector('#profile-detail-img');
            const avatarEl = modalEl.querySelector('#profile-detail-avatar');
            const usernameEl = modalEl.querySelector('#profile-detail-username');
            const captionDiv = modalEl.querySelector('#profile-detail-caption');
            const captionAuthor = modalEl.querySelector('#profile-detail-caption-author');
            const captionText = modalEl.querySelector('#profile-detail-caption-text');
            const timeEl = modalEl.querySelector('#profile-detail-time');
            const likeBtn = modalEl.querySelector('#profile-detail-like-btn');
            const shareBtn = modalEl.querySelector('#profile-detail-share-btn');
            const commentInput = modalEl.querySelector('#profile-detail-comment-input');
            const commentSend = modalEl.querySelector('#profile-detail-comment-send');
            const commentsList = modalEl.querySelector('#profile-detail-comments-list');

            imgEl.src = `/static/${post.image_url}`;
            avatarEl.src = author.profile_image ? `/static/${author.profile_image}` : '/static/uploads/profiles/default.png';
            usernameEl.textContent = author.username;
            timeEl.textContent = timeAgo(post.created_at);

            // Handle post delete for owner
            const loggedInUserId = parseInt(document.body.dataset.userId);
            const deleteBtn = modalEl.querySelector('#profile-detail-delete-btn');
            if (deleteBtn) {
                if (author.id === loggedInUserId) {
                    deleteBtn.classList.remove('d-none');
                    deleteBtn.onclick = async () => {
                        if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
                        try {
                            await fetchJSON(`/posts/${postId}/delete`, { method: 'POST' });
                            showToast('Post deleted.', 'success');
                            modal.hide();
                            // Remove tile from grid
                            const postCard = postsGrid.querySelector(`[data-post-id="${postId}"]`);
                            if (postCard) {
                                const col = postCard.closest('.col-4');
                                if (col) col.remove();
                            }
                            // Decrement post count on profile header
                            const countEl = document.getElementById('profile-post-count');
                            if (countEl) {
                                const cur = parseInt(countEl.textContent) || 0;
                                countEl.textContent = Math.max(0, cur - 1);
                            }
                        } catch (err) {
                            showToast(err.message || 'Failed to delete post.', 'error');
                        }
                    };
                } else {
                    deleteBtn.classList.add('d-none');
                }
            }

            if (post.caption) {
                captionDiv.classList.remove('d-none');
                captionAuthor.textContent = author.username;
                captionText.textContent = post.caption;
            }

            // Like state
            const updateLikeUI = (liked, count) => {
                const icon = likeBtn.querySelector('i');
                const countSpan = likeBtn.querySelector('.like-count');
                countSpan.textContent = formatCount(count);
                if (liked) {
                    likeBtn.className = 'btn btn-link p-0 text-decoration-none text-danger';
                    icon.className = 'bi bi-heart-fill fs-5';
                } else {
                    likeBtn.className = 'btn btn-link p-0 text-decoration-none text-dark';
                    icon.className = 'bi bi-heart fs-5';
                }
            };
            updateLikeUI(post.is_liked, post.like_count);

            likeBtn.onclick = async () => {
                try {
                    const data = await fetchJSON(`/posts/${postId}/like`, { method: 'POST' });
                    updateLikeUI(data.liked, data.like_count);
                } catch {
                    showToast('Failed to like post', 'error');
                }
            };

            shareBtn.onclick = async () => {
                try {
                    await fetchJSON(`/posts/${postId}/share`, { method: 'POST' });
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.origin + `/profile/${author.username}`).catch(() => {});
                    }
                    showToast('Post link copied to clipboard!', 'success');
                } catch {
                    showToast('Failed to share post', 'error');
                }
            };

            // Input enabling
            commentInput.oninput = () => {
                commentSend.disabled = !commentInput.value.trim();
            };

            // Send comment
            const sendComment = async () => {
                const content = commentInput.value.trim();
                if (!content) return;
                commentSend.disabled = true;
                try {
                    const res = await fetchJSON(`/posts/${postId}/comment`, {
                        method: 'POST',
                        body: { content }
                    });
                    commentInput.value = '';
                    const c = res.comment;
                    commentsList.insertAdjacentHTML('afterbegin', `
                        <div class="d-flex gap-2">
                            <span class="fw-bold small text-dark">${escapeHtml(c.author.username)}</span>
                            <span class="small text-dark flex-grow-1">${escapeHtml(c.content)}</span>
                        </div>
                    `);
                    modalEl.querySelector('.comment-count').textContent = formatCount(res.comment_count);
                } catch {
                    showToast('Failed to send comment', 'error');
                } finally {
                    commentSend.disabled = false;
                }
            };

            commentSend.onclick = sendComment;
            commentInput.onkeypress = (e) => { if (e.key === 'Enter') sendComment(); };

            // Load comments
            const commentsData = await fetchJSON(`/posts/${postId}/comments`);
            if (commentsData.comments && commentsData.comments.length > 0) {
                commentsList.innerHTML = commentsData.comments.map(c => `
                    <div class="d-flex gap-2 mb-1">
                        <span class="fw-bold small text-dark">${escapeHtml(c.author.username)}</span>
                        <span class="small text-dark flex-grow-1">${escapeHtml(c.content)}</span>
                    </div>
                `).join('');
            } else {
                commentsList.innerHTML = '<p class="text-center text-muted small py-3">No comments yet</p>';
            }
            modalEl.querySelector('.comment-count').textContent = formatCount(post.comment_count);

        } catch (err) {
            modalEl.querySelector('.modal-body').innerHTML = '<div class="p-4 text-center text-muted">Failed to load post.</div>';
        }
    }
});

// ---- Profile connection actions (called from template onclick) ----
async function handleProfileConnect(userId) {
    try {
        await fetchJSON(`/connect/${userId}`, { method: 'POST' });
        showToast('Connection request sent!', 'success');
        setTimeout(() => location.reload(), 500);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleProfileDisconnect(userId) {
    try {
        await fetchJSON(`/disconnect/${userId}`, { method: 'POST' });
        showToast('Disconnected.', 'info');
        setTimeout(() => location.reload(), 500);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleProfileAccept(connId) {
    try {
        await fetchJSON(`/connection/accept/${connId}`, { method: 'POST' });
        showToast('Connection accepted!', 'success');
        setTimeout(() => location.reload(), 500);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleProfileReject(connId) {
    try {
        await fetchJSON(`/connection/reject/${connId}`, { method: 'POST' });
        showToast('Request declined.', 'info');
        setTimeout(() => location.reload(), 500);
    } catch (error) {
        showToast(error.message, 'error');
    }
}
