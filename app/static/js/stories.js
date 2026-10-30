// ==========================================
// Showcase — Stories
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const storiesBar = document.getElementById('stories-bar');
    if (!storiesBar) return;
    
    let allStoryData = [];
    let currentUserIndex = 0;
    let currentStoryIndex = 0;
    let progressTimer = null;
    let selectedStoryFile = null;
    
    // Load stories
    loadStories();
    
    async function loadStories() {
        try {
            const data = await fetchJSON('/stories');
            allStoryData = Array.isArray(data) ? data : [];
            renderStoryBar(allStoryData);
        } catch {
            // Remove skeletons on error
            storiesBar.querySelectorAll('.story-skeleton').forEach(s => s.remove());
        }
    }
    
    function renderStoryBar(userStories) {
        // Remove skeletons
        storiesBar.querySelectorAll('.story-skeleton').forEach(s => s.remove());
        
        const currentUserId = parseInt(document.body.dataset.userId);
        
        // Find current user's stories if any
        const currentUserData = userStories.find(u => u.user && u.user.id === currentUserId);
        const hasMyStory = currentUserData && currentUserData.stories && currentUserData.stories.length > 0;
        
        // "Your Story" button
        let html = `
            <div class="d-flex flex-column align-items-center gap-1 flex-shrink-0 cursor-pointer" style="width: 76px;" id="add-story-btn">
                <div class="position-relative">
                    <div class="rounded-circle p-1 ${hasMyStory ? 'story-ring-gradient' : ''}" style="width: 68px; height: 68px;">
                        <div class="story-avatar-inner d-flex align-items-center justify-content-center bg-light">
                            <i class="bi bi-person-fill fs-3 text-secondary"></i>
                        </div>
                    </div>
                    <div class="position-absolute bottom-0 end-0 rounded-circle text-white d-flex align-items-center justify-content-center shadow-sm" 
                         style="width: 22px; height: 22px; background: linear-gradient(135deg, #E8725A, #F57C58); border: 2px solid white; transform: translate(-2px, -2px);">
                        <i class="bi bi-plus-lg" style="font-size: 0.65rem;"></i>
                    </div>
                </div>
                <span class="text-truncate text-center fw-medium text-dark" style="font-size: 0.72rem; max-width: 76px;">Your story</span>
            </div>
        `;
        
        // Other users' stories
        userStories.forEach((userData, idx) => {
            const user = userData.user || {};
            if (user.id === currentUserId) return;
            
            const avatarSrc = user.profile_image
                ? `/static/${user.profile_image}`
                : '';
            const avatarHTML = avatarSrc
                ? `<img src="${avatarSrc}" alt="${user.username}" class="rounded-circle w-100 h-100" style="object-fit: cover;">`
                : `<div class="rounded-circle bg-light d-flex align-items-center justify-content-center w-100 h-100"><i class="bi bi-person-fill fs-4 text-secondary"></i></div>`;
            
            html += `
                <div class="d-flex flex-column align-items-center gap-1 flex-shrink-0 cursor-pointer story-user-item" style="width: 76px;" data-user-index="${idx}">
                    <div class="story-ring-gradient" style="width: 68px; height: 68px;">
                        <div class="story-avatar-inner">
                            ${avatarHTML}
                        </div>
                    </div>
                    <span class="text-truncate text-center text-dark fw-medium" style="font-size: 0.72rem; max-width: 76px;">${user.username}</span>
                </div>
            `;
        });
        
        storiesBar.innerHTML = html;
        
        // Add story button — opens viewer if user already has stories, otherwise opens create modal
        const addStoryBtn = document.getElementById('add-story-btn');
        if (addStoryBtn) {
            addStoryBtn.addEventListener('click', () => {
                if (hasMyStory) {
                    // Find index of current user in allStoryData
                    const myIdx = allStoryData.findIndex(u => u.user && u.user.id === currentUserId);
                    if (myIdx !== -1) {
                        openStoryViewer(myIdx, 0);
                        return;
                    }
                }
                const storyModal = new bootstrap.Modal(document.getElementById('createStoryModal'));
                storyModal.show();
            });
        }

        const sidebarStoryBtn = document.getElementById('sidebar-add-story-btn');
        if (sidebarStoryBtn) {
            sidebarStoryBtn.addEventListener('click', () => {
                const storyModal = new bootstrap.Modal(document.getElementById('createStoryModal'));
                storyModal.show();
            });
        }
        
        // View stories for other users
        storiesBar.querySelectorAll('.story-user-item').forEach(item => {
            item.addEventListener('click', () => {
                const userIdx = parseInt(item.dataset.userIndex);
                openStoryViewer(userIdx, 0);
            });
        });
    }
    
    // ---- Story Viewer ----
    const viewer = document.getElementById('story-viewer');
    const viewerImage = document.getElementById('story-viewer-image');
    const viewerAvatar = document.getElementById('story-viewer-avatar');
    const viewerUsername = document.getElementById('story-viewer-username');
    const viewerTime = document.getElementById('story-viewer-time');
    const viewerClose = document.getElementById('story-viewer-close');
    const viewerDelete = document.getElementById('story-viewer-delete');
    const viewerPrev = document.getElementById('story-prev');
    const viewerNext = document.getElementById('story-next');
    const progressBar = document.getElementById('story-progress-bar');
    const viewerSeenBtn = document.getElementById('story-viewer-seen-btn');
    const viewerSeenCount = document.getElementById('story-viewer-seen-count');
    const viewerReactions = document.getElementById('story-viewer-reactions');
    const viewerDrawer = document.getElementById('story-viewers-drawer');
    const viewerDrawerClose = document.getElementById('story-viewers-drawer-close');
    const viewerDrawerTitle = document.getElementById('story-viewers-drawer-title');
    const viewerList = document.getElementById('story-viewers-list');
    let currentStoryId = null;
    
    function openStoryViewer(userIdx, storyIdx) {
        if (!viewer || !allStoryData[userIdx]) return;
        
        currentUserIndex = userIdx;
        currentStoryIndex = storyIdx;
        viewer.classList.remove('d-none');
        document.body.style.overflow = 'hidden';
        showCurrentStory();
    }
    
    function showCurrentStory() {
        const userData = allStoryData[currentUserIndex];
        if (!userData) { closeViewer(); return; }
        
        const stories = userData.stories || [];
        if (currentStoryIndex >= stories.length) {
            // Move to next user
            if (currentUserIndex < allStoryData.length - 1) {
                currentUserIndex++;
                currentStoryIndex = 0;
                showCurrentStory();
            } else {
                closeViewer();
            }
            return;
        }
        
        const story = stories[currentStoryIndex];
        const user = userData.user || {};
        currentStoryId = story.id;
        
        // Hide viewers drawer when moving stories
        if (viewerDrawer) viewerDrawer.classList.add('d-none');

        // Update UI
        viewerImage.src = `/static/${story.image_url}`;
        const avatarSrc = user.profile_image ? `/static/${user.profile_image}` : '';
        if (avatarSrc) {
            viewerAvatar.src = avatarSrc;
            viewerAvatar.style.display = 'block';
        } else {
            viewerAvatar.style.display = 'none';
        }
        viewerUsername.textContent = user.username || '';
        viewerTime.textContent = timeAgo(story.created_at);
        
        const loggedInUserId = parseInt(document.body.dataset.userId);
        const isOwnStory = (user.id === loggedInUserId);

        // Delete button only for own stories
        if (viewerDelete) {
            if (isOwnStory) {
                viewerDelete.classList.remove('d-none');
            } else {
                viewerDelete.classList.add('d-none');
            }
        }

        // Story Bottom Controls: Seen views (for owner) vs Reactions (for viewer)
        if (isOwnStory) {
            if (viewerReactions) {
                viewerReactions.classList.add('d-none');
                viewerReactions.classList.remove('d-flex');
            }
            if (viewerSeenBtn) {
                viewerSeenBtn.classList.remove('d-none');
                viewerSeenBtn.classList.add('d-flex');
                if (viewerSeenCount) {
                    const count = story.views_count || 0;
                    viewerSeenCount.textContent = `${count} view${count === 1 ? '' : 's'}`;
                }
            }
        } else {
            if (viewerSeenBtn) {
                viewerSeenBtn.classList.add('d-none');
                viewerSeenBtn.classList.remove('d-flex');
            }
            if (viewerReactions) {
                viewerReactions.classList.remove('d-none');
                viewerReactions.classList.add('d-flex');
            }
            // Record view in backend
            fetchJSON(`/stories/${story.id}/view`, { method: 'POST' }).catch(() => {});
        }
        
        // Progress bars
        progressBar.innerHTML = stories.map((_, i) => `
            <div class="flex-grow-1 bg-white bg-opacity-25 rounded-pill overflow-hidden" style="height: 3px;">
                <div class="h-100 rounded-pill ${i < currentStoryIndex ? 'bg-white' : ''}" 
                     style="width: ${i < currentStoryIndex ? '100%' : '0%'}; transition: width 5s linear;"
                     data-progress-idx="${i}"></div>
            </div>
        `).join('');
        
        // Animate current progress
        clearInterval(progressTimer);
        const currentProgress = progressBar.querySelector(`[data-progress-idx="${currentStoryIndex}"]`);
        if (currentProgress) {
            setTimeout(() => {
                currentProgress.style.width = '100%';
                currentProgress.classList.add('bg-white');
            }, 50);
        }
        
        progressTimer = setTimeout(() => {
            currentStoryIndex++;
            showCurrentStory();
        }, 5000);
    }
    
    function closeViewer() {
        clearInterval(progressTimer);
        if (viewerDrawer) viewerDrawer.classList.add('d-none');
        if (viewer) {
            viewer.classList.add('d-none');
            document.body.style.overflow = '';
        }
    }
    
    if (viewerClose) viewerClose.addEventListener('click', closeViewer);

    if (viewerNext) viewerNext.addEventListener('click', () => {
        currentStoryIndex++;
        showCurrentStory();
    });
    if (viewerPrev) viewerPrev.addEventListener('click', () => {
        if (currentStoryIndex > 0) {
            currentStoryIndex--;
            showCurrentStory();
        }
    });

    // ---- Story Emoji Reactions ----
    if (viewerReactions) {
        viewerReactions.querySelectorAll('.story-react-emoji').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!currentStoryId) return;
                const emoji = btn.dataset.emoji;
                
                // Pop animation effect
                btn.style.transform = 'scale(1.4)';
                setTimeout(() => { btn.style.transform = 'scale(1)'; }, 200);

                try {
                    await fetchJSON(`/stories/${currentStoryId}/react`, {
                        method: 'POST',
                        body: { reaction: emoji }
                    });
                    showToast(`Reacted ${emoji}`, 'info');
                } catch (err) {
                    showToast('Failed to react.', 'error');
                }
            });
        });
    }

    // ---- Viewers Drawer (for Story Owner) ----
    if (viewerSeenBtn) {
        viewerSeenBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!currentStoryId || !viewerDrawer) return;

            // Pause story auto-advance while looking at viewers
            clearInterval(progressTimer);

            viewerDrawer.classList.remove('d-none');
            if (viewerList) {
                viewerList.innerHTML = '<div class="text-center py-4 text-white-50"><div class="spinner-border spinner-border-sm me-2"></div>Loading viewers...</div>';
            }

            try {
                const res = await fetchJSON(`/stories/${currentStoryId}/views`);
                const views = res.views || [];
                const count = res.views_count || views.length;
                if (viewerDrawerTitle) viewerDrawerTitle.textContent = `Story Views (${count})`;
                if (viewerSeenCount) viewerSeenCount.textContent = `${count} view${count === 1 ? '' : 's'}`;

                if (views.length === 0) {
                    viewerList.innerHTML = '<p class="text-white-50 text-center py-4 my-2 small"><i class="bi bi-people me-1"></i>No views yet.</p>';
                    return;
                }

                viewerList.innerHTML = views.map(v => {
                    const u = v.user || {};
                    const avatar = u.profile_image ? `/static/${u.profile_image}` : '';
                    const avatarHTML = avatar
                        ? `<img src="${avatar}" class="rounded-circle" width="38" height="38" style="object-fit: cover;">`
                        : `<i class="bi bi-person-circle text-secondary fs-3"></i>`;
                    
                    const reactionPrefix = v.reaction 
                        ? `<span class="fs-5 me-1" title="Reacted with ${v.reaction}">${v.reaction}</span>`
                        : '';

                    return `
                        <div class="d-flex align-items-center justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                            <div class="d-flex align-items-center gap-2">
                                ${avatarHTML}
                                <div>
                                    <div class="d-flex align-items-center">
                                        ${reactionPrefix}
                                        <span class="text-white fw-semibold small">${escapeHtml(u.username || 'User')}</span>
                                    </div>
                                    <span class="text-white-50" style="font-size: 0.72rem;">${timeAgo(v.created_at)}</span>
                                </div>
                            </div>
                            ${v.reaction ? `<span class="badge bg-white bg-opacity-10 text-white rounded-pill px-2 py-1 fs-6">${v.reaction}</span>` : ''}
                        </div>
                    `;
                }).join('');
            } catch (err) {
                if (viewerList) viewerList.innerHTML = '<p class="text-danger text-center py-4 small">Failed to load viewers.</p>';
            }
        });
    }

    if (viewerDrawerClose) {
        viewerDrawerClose.addEventListener('click', (e) => {
            e.stopPropagation();
            if (viewerDrawer) viewerDrawer.classList.add('d-none');
            // Resume progress
            progressTimer = setTimeout(() => {
                currentStoryIndex++;
                showCurrentStory();
            }, 3000);
        });
    }

    // ---- Delete Story ----
    if (viewerDelete) {
        viewerDelete.addEventListener('click', async () => {
            if (!currentStoryId) return;
            
            // Pause auto-advance while confirming
            clearTimeout(progressTimer);
            
            const confirmed = confirm('Delete this story? It will be removed immediately.');
            if (!confirmed) {
                // Resume auto-advance
                progressTimer = setTimeout(() => { currentStoryIndex++; showCurrentStory(); }, 5000);
                return;
            }
            
            try {
                await fetchJSON(`/stories/${currentStoryId}/delete`, { method: 'POST' });
                showToast('Story deleted.', 'success');
                
                // Remove from local data
                const userData = allStoryData[currentUserIndex];
                if (userData) {
                    userData.stories.splice(currentStoryIndex, 1);
                    if (userData.stories.length === 0) {
                        // Remove this user entry entirely
                        allStoryData.splice(currentUserIndex, 1);
                        closeViewer();
                        renderStoryBar(allStoryData);
                        return;
                    }
                }
                // If more stories left in this user slot, show next (or clamp)
                if (currentStoryIndex >= allStoryData[currentUserIndex].stories.length) {
                    currentStoryIndex = Math.max(0, allStoryData[currentUserIndex].stories.length - 1);
                }
                showCurrentStory();
                renderStoryBar(allStoryData);
            } catch (err) {
                showToast(err.message || 'Failed to delete story.', 'error');
                progressTimer = setTimeout(() => { currentStoryIndex++; showCurrentStory(); }, 5000);
            }
        });
    }
    
    // Keyboard controls (Escape, ArrowLeft, ArrowRight)
    document.addEventListener('keydown', (e) => {
        if (!viewer || viewer.classList.contains('d-none')) return;
        if (e.key === 'Escape') {
            closeViewer();
        } else if (e.key === 'ArrowRight') {
            currentStoryIndex++;
            showCurrentStory();
        } else if (e.key === 'ArrowLeft') {
            if (currentStoryIndex > 0) {
                currentStoryIndex--;
                showCurrentStory();
            }
        }
    });
    
    // ---- Story Upload ----
    const storyGalleryBtn = document.getElementById('story-gallery-btn');
    const storyCameraBtn = document.getElementById('story-camera-btn');
    const storyFileInput = document.getElementById('story-file-input');
    const storyUploadOptions = document.getElementById('story-upload-options');
    const storyPreviewSection = document.getElementById('story-preview-section');
    const storyImagePreview = document.getElementById('story-image-preview');
    const storyRemoveImage = document.getElementById('story-remove-image');
    const storyPublishBtn = document.getElementById('story-publish-btn');
    
    if (storyGalleryBtn) {
        storyGalleryBtn.addEventListener('click', () => {
            if (storyFileInput) storyFileInput.click();
        });
    }
    
    if (storyFileInput) {
        storyFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) {
                showToast('Please select an image file.', 'error');
                return;
            }
            selectedStoryFile = file;
            const reader = new FileReader();
            reader.onload = (ev) => {
                storyImagePreview.src = ev.target.result;
                storyUploadOptions.classList.add('d-none');
                storyPreviewSection.classList.remove('d-none');
            };
            reader.readAsDataURL(file);
        });
    }
    
    if (storyCameraBtn) {
        storyCameraBtn.addEventListener('click', () => {
            if (typeof CameraManager !== 'undefined') {
                CameraManager.open((blob, dataURL) => {
                    selectedStoryFile = new File([blob], 'camera_story.jpg', { type: 'image/jpeg' });
                    storyImagePreview.src = dataURL;
                    storyUploadOptions.classList.add('d-none');
                    storyPreviewSection.classList.remove('d-none');
                });
            } else {
                showToast('Camera not available. Please use Gallery.', 'info');
            }
        });
    }
    
    if (storyRemoveImage) {
        storyRemoveImage.addEventListener('click', () => {
            selectedStoryFile = null;
            storyImagePreview.src = '';
            storyPreviewSection.classList.add('d-none');
            storyUploadOptions.classList.remove('d-none');
            if (storyFileInput) storyFileInput.value = '';
        });
    }
    
    if (storyPublishBtn) {
        storyPublishBtn.addEventListener('click', async () => {
            if (!selectedStoryFile) return;
            
            const publishText = storyPublishBtn.querySelector('.publish-text');
            const spinner = storyPublishBtn.querySelector('.spinner-border');
            storyPublishBtn.disabled = true;
            if (publishText) publishText.textContent = 'Uploading...';
            if (spinner) spinner.classList.remove('d-none');
            
            const formData = new FormData();
            formData.append('image', selectedStoryFile);
            
            try {
                await fetchWithFile('/stories/create', formData);
                showToast('Story added!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createStoryModal'));
                if (modal) modal.hide();
                
                // Reset
                selectedStoryFile = null;
                storyImagePreview.src = '';
                storyPreviewSection.classList.add('d-none');
                storyUploadOptions.classList.remove('d-none');
                if (storyFileInput) storyFileInput.value = '';
                
                // Reload stories
                loadStories();
            } catch (error) {
                showToast(error.message || 'Failed to upload story.', 'error');
            } finally {
                storyPublishBtn.disabled = false;
                if (publishText) publishText.textContent = 'Add to Story';
                if (spinner) spinner.classList.add('d-none');
            }
        });
    }
});
