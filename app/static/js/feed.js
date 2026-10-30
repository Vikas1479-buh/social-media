// ==========================================
// Showcase — Feed & Infinite Scroll
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;
    
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    let selectedPostFile = null;
    
    // Load initial feed
    loadFeed(1);
    
    // Infinite scroll
    window.addEventListener('scroll', debounce(() => {
        if (isLoading || !hasMore) return;
        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 600) {
            currentPage++;
            loadFeed(currentPage);
        }
    }, 200));
    
    // Event delegation for post actions
    feedContainer.addEventListener('click', (e) => {
        const likeBtn = e.target.closest('.btn-like');
        if (likeBtn) {
            e.preventDefault();
            toggleLike(likeBtn.dataset.postId, likeBtn);
            return;
        }
        
        const commentBtn = e.target.closest('.btn-comment');
        if (commentBtn) {
            e.preventDefault();
            openComments(commentBtn.dataset.postId);
            return;
        }
        
        const shareBtn = e.target.closest('.btn-share');
        if (shareBtn) {
            e.preventDefault();
            sharePost(shareBtn.dataset.postId, shareBtn);
            return;
        }

        const delPostBtn = e.target.closest('.btn-delete-post');
        if (delPostBtn) {
            e.preventDefault();
            const postId = delPostBtn.dataset.postId;
            if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
            fetchJSON(`/posts/${postId}/delete`, { method: 'POST' }).then(() => {
                showToast('Post deleted.', 'success');
                const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
                if (card) {
                    card.style.transition = 'all 0.3s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => card.remove(), 300);
                }
            }).catch(err => {
                showToast(err.message || 'Failed to delete post.', 'error');
            });
            return;
        }

        const bookmarkBtn = e.target.closest('.btn-bookmark');
        if (bookmarkBtn) {
            e.preventDefault();
            const icon = bookmarkBtn.querySelector('i');
            if (icon.classList.contains('bi-bookmark')) {
                icon.classList.replace('bi-bookmark', 'bi-bookmark-fill');
                icon.classList.add('text-warning');
                showToast('Post saved to collection', 'info');
            } else {
                icon.classList.replace('bi-bookmark-fill', 'bi-bookmark');
                icon.classList.remove('text-warning');
                showToast('Post removed from collection', 'info');
            }
            return;
        }
    });

    // Double-tap or double-click to like on post image
    feedContainer.addEventListener('dblclick', (e) => {
        const wrapper = e.target.closest('.post-image-wrapper');
        if (!wrapper) return;
        const postCard = wrapper.closest('article');
        if (!postCard) return;

        const postId = postCard.dataset.postId;
        const burst = wrapper.querySelector('.heart-burst');
        if (burst) {
            burst.classList.remove('animate');
            void burst.offsetWidth; // trigger reflow
            burst.classList.add('animate');
        }

        const likeBtn = postCard.querySelector('.btn-like');
        if (likeBtn && !likeBtn.classList.contains('text-danger')) {
            toggleLike(postId, likeBtn);
        }
    });
    
    // ---- Create Post ----
    const postGalleryBtn = document.getElementById('post-gallery-btn');
    const postCameraBtn = document.getElementById('post-camera-btn');
    const postFileInput = document.getElementById('post-file-input');
    const postUploadOptions = document.getElementById('post-upload-options');
    const postPreviewSection = document.getElementById('post-preview-section');
    const postImagePreview = document.getElementById('post-image-preview');
    const postRemoveImage = document.getElementById('post-remove-image');
    const postPublishBtn = document.getElementById('post-publish-btn');
    const postCaption = document.getElementById('post-caption');
    const mobileCreateBtn = document.getElementById('mobile-create-btn');
    
    if (postGalleryBtn) {
        postGalleryBtn.addEventListener('click', () => {
            if (postFileInput) postFileInput.click();
        });
    }
    
    if (postFileInput) {
        postFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file.', 'error');
                return;
            }
            selectedPostFile = file;
            const reader = new FileReader();
            reader.onload = (ev) => {
                postImagePreview.src = ev.target.result;
                postUploadOptions.classList.add('d-none');
                postPreviewSection.classList.remove('d-none');
            };
            reader.readAsDataURL(file);
        });
    }
    
    if (postCameraBtn) {
        postCameraBtn.addEventListener('click', () => {
            if (typeof CameraManager !== 'undefined') {
                CameraManager.open((blob, dataURL) => {
                    selectedPostFile = new File([blob], 'camera_photo.jpg', { type: 'image/jpeg' });
                    postImagePreview.src = dataURL;
                    postUploadOptions.classList.add('d-none');
                    postPreviewSection.classList.remove('d-none');
                });
            } else {
                showToast('Camera not available. Please use Gallery.', 'info');
            }
        });
    }
    
    if (postRemoveImage) {
        postRemoveImage.addEventListener('click', () => {
            selectedPostFile = null;
            postImagePreview.src = '';
            postPreviewSection.classList.add('d-none');
            postUploadOptions.classList.remove('d-none');
            if (postFileInput) postFileInput.value = '';
        });
    }
    
    if (postPublishBtn) {
        postPublishBtn.addEventListener('click', async () => {
            if (!selectedPostFile) {
                showToast('Please select an image.', 'error');
                return;
            }
            
            const publishText = postPublishBtn.querySelector('.publish-text');
            const spinner = postPublishBtn.querySelector('.spinner-border');
            postPublishBtn.disabled = true;
            if (publishText) publishText.textContent = 'Publishing...';
            if (spinner) spinner.classList.remove('d-none');
            
            const formData = new FormData();
            formData.append('image', selectedPostFile);
            const caption = postCaption ? postCaption.value.trim() : '';
            if (caption) formData.append('caption', caption);
            
            try {
                await fetchWithFile('/posts/create', formData);
                showToast('Post published!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createPostModal'));
                if (modal) modal.hide();
                
                // Reset form
                selectedPostFile = null;
                if (postImagePreview) postImagePreview.src = '';
                if (postCaption) postCaption.value = '';
                if (postPreviewSection) postPreviewSection.classList.add('d-none');
                if (postUploadOptions) postUploadOptions.classList.remove('d-none');
                if (postFileInput) postFileInput.value = '';
                
                // Refresh feed
                feedContainer.innerHTML = '';
                currentPage = 1;
                hasMore = true;
                loadFeed(1);
            } catch (error) {
                showToast(error.message || 'Upload failed. Please try again.', 'error');
            } finally {
                postPublishBtn.disabled = false;
                if (publishText) publishText.textContent = 'Publish Post';
                if (spinner) spinner.classList.add('d-none');
            }
        });
    }
    
    // Mobile create button opens the modal
    if (mobileCreateBtn) {
        mobileCreateBtn.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('createPostModal'));
            modal.show();
        });
    }
    
    // ---- Feed Loading ----
    async function loadFeed(page) {
        if (isLoading) return;
        isLoading = true;
        
        if (page === 1) {
            // Keep skeleton posts on first load
        }
        
        try {
            const posts = await fetchJSON(`/feed?page=${page}`);
            
            // Remove skeletons on first load
            if (page === 1) {
                feedContainer.querySelectorAll('.skeleton-post').forEach(s => s.remove());
            }
            
            if (Array.isArray(posts) && posts.length > 0) {
                posts.forEach(post => {
                    feedContainer.insertAdjacentHTML('beforeend', renderPost(post));
                });
            } else {
                hasMore = false;
                const feedEnd = document.getElementById('feed-end');
                if (feedEnd && page > 1) {
                    feedEnd.classList.remove('d-none');
                }
                if (page === 1) {
                    feedContainer.innerHTML = `
                        <div class="text-center py-5">
                            <i class="bi bi-camera fs-1 text-muted"></i>
                            <p class="text-muted mt-2">No posts yet. Be the first to share!</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            if (page === 1) {
                feedContainer.querySelectorAll('.skeleton-post').forEach(s => s.remove());
            }
        } finally {
            isLoading = false;
        }
    }
    
    function renderPost(post) {
        const author = post.author || {};
        const avatarSrc = author.profile_image
            ? `/static/${author.profile_image}`
            : '';
        const avatarHTML = avatarSrc
            ? `<img src="${avatarSrc}" alt="${author.username}" class="rounded-circle shadow-sm" style="width: 42px; height: 42px; object-fit: cover; border: 2px solid #FFFFFF;">`
            : `<div class="rounded-circle bg-light d-flex align-items-center justify-content-center text-secondary shadow-sm" style="width: 42px; height: 42px;"><i class="bi bi-person-fill fs-4"></i></div>`;
        
        const likedClass = post.is_liked ? 'text-danger' : 'text-dark';
        const heartIcon = post.is_liked ? 'bi-heart-fill' : 'bi-heart';
        const loggedInUserId = parseInt(document.body.dataset.userId);
        const isOwnPost = (author.id === loggedInUserId);
        const deleteBtnHTML = isOwnPost ? `
            <button class="btn btn-link p-1 text-danger text-decoration-none btn-delete-post" data-post-id="${post.id}" title="Delete post" aria-label="Delete post">
                <i class="bi bi-trash3 fs-5"></i>
            </button>
        ` : '';
        
        return `
            <article class="card border-0 shadow-sm rounded-4 bg-white overflow-hidden mb-4 post-card" data-post-id="${post.id}">
                <div class="card-header bg-white border-0 d-flex align-items-center justify-content-between p-3">
                    <a href="/profile/${author.username}" class="text-decoration-none d-flex align-items-center gap-2">
                        ${avatarHTML}
                        <div>
                            <div class="fw-bold text-dark d-flex align-items-center gap-1" style="font-size: 0.95rem;">
                                ${author.username || 'Unknown'}
                                ${author.is_online ? '<span class="online-pulse-dot ms-1" title="Online now"></span>' : ''}
                            </div>
                            <div class="text-muted d-flex align-items-center gap-1" style="font-size: 0.75rem;">
                                <i class="bi bi-clock"></i> ${timeAgo(post.created_at)}
                            </div>
                        </div>
                    </a>
                    <div class="d-flex align-items-center gap-1">
                        ${deleteBtnHTML}
                        <button class="btn btn-link p-1 text-muted text-decoration-none" title="More options" aria-label="Post options">
                            <i class="bi bi-three-dots"></i>
                        </button>
                    </div>
                </div>
                <div class="post-image-wrapper bg-light">
                    <img src="/static/${post.image_url}" alt="Post by ${author.username}" class="w-100" style="max-height: 620px; object-fit: cover;" loading="lazy">
                    <div class="heart-burst"><i class="bi bi-heart-fill text-danger"></i></div>
                </div>
                <div class="card-body p-3">
                    <div class="d-flex align-items-center mb-2">
                        <div class="d-flex align-items-center gap-3">
                            <button class="btn btn-link p-0 text-decoration-none btn-like ${likedClass}" data-post-id="${post.id}" aria-label="Like">
                                <i class="bi ${heartIcon} fs-5"></i>
                                <span class="like-count ms-1 fw-semibold" style="font-size: 0.9rem;">${formatCount(post.like_count)}</span>
                            </button>
                            <button class="btn btn-link p-0 text-decoration-none text-dark btn-comment" data-post-id="${post.id}" aria-label="Comments">
                                <i class="bi bi-chat fs-5"></i>
                                <span class="comment-count ms-1 fw-semibold" style="font-size: 0.9rem;">${formatCount(post.comment_count)}</span>
                            </button>
                            <button class="btn btn-link p-0 text-decoration-none text-dark btn-share" data-post-id="${post.id}" aria-label="Share">
                                <i class="bi bi-send fs-5"></i>
                                <span class="share-count ms-1 fw-semibold" style="font-size: 0.9rem;">${formatCount(post.share_count)}</span>
                            </button>
                        </div>
                        <button class="btn btn-link p-0 text-decoration-none text-dark ms-auto btn-bookmark" aria-label="Save post">
                            <i class="bi bi-bookmark fs-5"></i>
                        </button>
                    </div>
                    ${post.caption ? `<p class="mb-0 pt-1" style="font-size: 0.92rem;"><a href="/profile/${author.username}" class="fw-bold text-dark text-decoration-none me-1">${author.username}</a><span class="text-dark">${escapeHtml(post.caption)}</span></p>` : ''}
                </div>
            </article>
        `;
    }
    
    // ---- Like ----
    async function toggleLike(postId, btn) {
        try {
            const data = await fetchJSON(`/posts/${postId}/like`, { method: 'POST' });
            const icon = btn.querySelector('i');
            const count = btn.querySelector('.like-count');
            
            if (data.liked) {
                btn.classList.remove('text-dark');
                btn.classList.add('text-danger');
                if (icon) {
                    icon.classList.remove('bi-heart');
                    icon.classList.add('bi-heart-fill');
                }
                // Pop animation
                btn.style.transform = 'scale(1.2)';
                setTimeout(() => { btn.style.transform = 'scale(1)'; }, 200);
            } else {
                btn.classList.remove('text-danger');
                btn.classList.add('text-dark');
                if (icon) {
                    icon.classList.remove('bi-heart-fill');
                    icon.classList.add('bi-heart');
                }
            }
            if (count) count.textContent = formatCount(data.like_count);
        } catch (error) {
            showToast('Failed to like post.', 'error');
        }
    }
    
    // ---- Comments ----
    async function openComments(postId) {
        // Create modal if not exists
        let modalEl = document.getElementById('commentsModal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'commentsModal';
            modalEl.className = 'modal fade';
            modalEl.setAttribute('tabindex', '-1');
            modalEl.innerHTML = `
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content rounded-4 border-0 shadow-lg">
                        <div class="modal-header border-bottom py-3">
                            <h5 class="modal-title fw-bold text-dark fs-6 mb-0">Comments</h5>
                            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0" style="max-height: 420px; overflow-y: auto;">
                            <div id="comments-list" class="p-3"></div>
                        </div>
                        <div class="border-top bg-white rounded-bottom-4">
                            <!-- Quick emoji reactions -->
                            <div class="px-3 pt-2 d-flex gap-2 align-items-center overflow-x-auto" style="scrollbar-width: none;">
                                <span class="badge rounded-pill bg-light text-dark p-2 px-3 emoji-quick-react cursor-pointer fs-6">❤️</span>
                                <span class="badge rounded-pill bg-light text-dark p-2 px-3 emoji-quick-react cursor-pointer fs-6">🔥</span>
                                <span class="badge rounded-pill bg-light text-dark p-2 px-3 emoji-quick-react cursor-pointer fs-6">😍</span>
                                <span class="badge rounded-pill bg-light text-dark p-2 px-3 emoji-quick-react cursor-pointer fs-6">👏</span>
                                <span class="badge rounded-pill bg-light text-dark p-2 px-3 emoji-quick-react cursor-pointer fs-6">✨</span>
                                <span class="badge rounded-pill bg-light text-dark p-2 px-3 emoji-quick-react cursor-pointer fs-6">🙌</span>
                            </div>
                            <div class="p-3">
                                <div class="input-group">
                                    <input type="text" id="comment-input" class="form-control border-0 bg-light rounded-start-pill ps-4" placeholder="Add a comment..." maxlength="500">
                                    <button class="btn btn-primary-glow text-white rounded-end-pill px-4" id="comment-send-btn" disabled>
                                        <i class="bi bi-send-fill"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalEl);
        }
        
        const commentsList = modalEl.querySelector('#comments-list');
        const commentInput = modalEl.querySelector('#comment-input');
        const commentSendBtn = modalEl.querySelector('#comment-send-btn');
        
        // Reset
        commentsList.innerHTML = '<div class="text-center py-4"><div class="spinner-border spinner-border-sm text-muted"></div></div>';
        commentInput.value = '';
        commentSendBtn.disabled = true;
        
        // Store post ID
        modalEl.dataset.postId = postId;
        
        // Enable/disable send
        commentInput.oninput = () => {
            commentSendBtn.disabled = !commentInput.value.trim();
        };
        
        function renderCommentItem(c) {
            const author = c.author || {};
            const avatarSrc = author.profile_image ? `/static/${author.profile_image}` : '';
            const avatarHTML = avatarSrc
                ? `<img src="${avatarSrc}" class="rounded-circle" style="width: 32px; height: 32px; object-fit: cover;">`
                : `<i class="bi bi-person-circle text-secondary" style="font-size: 1.5rem;"></i>`;

            const likeIconClass = c.is_liked ? 'bi-heart-fill text-danger' : 'bi-heart text-muted';
            const deleteBtnHTML = c.can_delete ? `
                <button class="btn btn-link p-0 text-muted ms-2 comment-delete-btn" data-comment-id="${c.id}" title="Delete comment" style="font-size: 0.75rem; text-decoration: none;">
                    <i class="bi bi-trash3"></i>
                </button>
            ` : '';

            return `
                <div class="d-flex align-items-start justify-content-between mb-3 comment-item" data-comment-id="${c.id}">
                    <div class="d-flex gap-2">
                        ${avatarHTML}
                        <div>
                            <div>
                                <span class="fw-semibold me-1" style="font-size: 0.85rem;">${escapeHtml(author.username || '')}</span>
                                <span class="text-dark" style="font-size: 0.85rem;">${escapeHtml(c.content)}</span>
                            </div>
                            <div class="d-flex align-items-center gap-2 mt-1">
                                <span class="text-muted" style="font-size: 0.7rem;">${timeAgo(c.created_at)}</span>
                                ${c.like_count > 0 ? `<span class="text-muted fw-semibold comment-likes-count" style="font-size: 0.7rem;">${c.like_count} like${c.like_count > 1 ? 's' : ''}</span>` : '<span class="text-muted fw-semibold comment-likes-count d-none" style="font-size: 0.7rem;"></span>'}
                                ${deleteBtnHTML}
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-link p-1 text-decoration-none comment-like-btn" data-comment-id="${c.id}" title="Like comment">
                        <i class="bi ${likeIconClass}" style="font-size: 0.85rem;"></i>
                    </button>
                </div>
            `;
        }

        // Wire delegate clicks for like and delete on comments list
        commentsList.onclick = async (e) => {
            const likeBtn = e.target.closest('.comment-like-btn');
            if (likeBtn) {
                const commentId = likeBtn.dataset.commentId;
                try {
                    const res = await fetchJSON(`/comments/${commentId}/like`, { method: 'POST' });
                    const heartIcon = likeBtn.querySelector('i');
                    if (res.liked) {
                        heartIcon.className = 'bi bi-heart-fill text-danger';
                    } else {
                        heartIcon.className = 'bi bi-heart text-muted';
                    }
                    const item = likeBtn.closest('.comment-item');
                    const countEl = item ? item.querySelector('.comment-likes-count') : null;
                    if (countEl) {
                        if (res.like_count > 0) {
                            countEl.textContent = `${res.like_count} like${res.like_count > 1 ? 's' : ''}`;
                            countEl.classList.remove('d-none');
                        } else {
                            countEl.textContent = '';
                            countEl.classList.add('d-none');
                        }
                    }
                } catch (err) {
                    showToast(err.message || 'Could not update like.', 'error');
                }
                return;
            }

            const delBtn = e.target.closest('.comment-delete-btn');
            if (delBtn) {
                const commentId = delBtn.dataset.commentId;
                if (!confirm('Delete this comment?')) return;
                try {
                    const res = await fetchJSON(`/comments/${commentId}/delete`, { method: 'POST' });
                    const item = delBtn.closest('.comment-item');
                    if (item) item.remove();
                    const postCard = document.querySelector(`[data-post-id="${postId}"] .comment-count`);
                    if (postCard) postCard.textContent = formatCount(res.comment_count);
                    showToast('Comment deleted.', 'success');
                } catch (err) {
                    showToast(err.message || 'Failed to delete comment.', 'error');
                }
                return;
            }
        };

        // Send comment
        commentSendBtn.onclick = async () => {
            const content = commentInput.value.trim();
            if (!content) return;
            
            commentSendBtn.disabled = true;
            try {
                const data = await fetchJSON(`/posts/${postId}/comment`, {
                    method: 'POST',
                    body: { content }
                });
                
                commentInput.value = '';
                
                // Clear empty placeholder if exists
                const emptyMsg = commentsList.querySelector('p.text-center');
                if (emptyMsg) emptyMsg.remove();

                commentsList.insertAdjacentHTML('beforeend', renderCommentItem(data.comment));
                
                // Update count on post card
                const postCard = document.querySelector(`[data-post-id="${postId}"] .comment-count`);
                if (postCard) postCard.textContent = formatCount(data.comment_count);
                
                // Scroll down
                commentsList.scrollTop = commentsList.scrollHeight;
            } catch (error) {
                showToast(error.message || 'Failed to add comment.', 'error');
            } finally {
                commentSendBtn.disabled = !commentInput.value.trim();
            }
        };
        
        // Enter key to send
        commentInput.onkeypress = (e) => {
            if (e.key === 'Enter') commentSendBtn.click();
        };
        
        // Show modal
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        
        // Load comments
        try {
            const data = await fetchJSON(`/posts/${postId}/comments`);
            if (data.comments && data.comments.length > 0) {
                commentsList.innerHTML = data.comments.map(c => renderCommentItem(c)).join('');
            } else {
                commentsList.innerHTML = '<p class="text-center text-muted py-4">No comments yet. Be the first!</p>';
            }
        } catch {
            commentsList.innerHTML = '<p class="text-center text-muted py-4">Failed to load comments.</p>';
        }
        
        // Handle quick emoji reaction click
        modalEl.querySelectorAll('.emoji-quick-react').forEach(pill => {
            pill.onclick = () => {
                commentInput.value += (commentInput.value ? ' ' : '') + pill.textContent.trim();
                commentSendBtn.disabled = false;
                commentInput.focus();
            };
        });

        setTimeout(() => commentInput.focus(), 300);
    }
    
    // ---- Share ----
    async function sharePost(postId, btn) {
        try {
            const data = await fetchJSON(`/posts/${postId}/share`, { method: 'POST' });
            if (navigator.clipboard) {
                const shareUrl = window.location.origin + '/home#post-' + postId;
                navigator.clipboard.writeText(shareUrl).catch(() => {});
            }
            showToast('Link copied to clipboard! Post shared.', 'success');
            const countEl = btn.querySelector('.share-count');
            if (countEl) countEl.textContent = formatCount(data.share_count);
        } catch (error) {
            showToast('Failed to share post.', 'error');
        }
    }
    
    // ---- Utility ----
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
