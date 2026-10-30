// Reusable image upload component
class ImageUploader {
    constructor() {
        this.modal = null;
        this.fileInput = null;
        this.currentFile = null;
        this.currentDataURL = null;
        this.options = null;
    }

    createFileInput() {
        if (this.fileInput) return;
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'image/jpeg,image/png,image/webp';
        this.fileInput.className = 'hidden';
        document.body.appendChild(this.fileInput);

        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFile(file);
            this.fileInput.value = ''; // Reset
        });
    }

    createModal() {
        if (this.modal) return;
        this.modal = document.createElement('div');
        this.modal.className = 'modal upload-modal';
        this.modal.innerHTML = `
            <div class="modal-content upload-modal-content">
                <div class="modal-header">
                    <h3>Create</h3>
                    <button class="btn-close-upload">&times;</button>
                </div>
                <div class="modal-body upload-body">
                    <div class="upload-options">
                        <button class="btn btn-secondary btn-gallery">Gallery</button>
                        <button class="btn btn-secondary btn-camera">Take Photo</button>
                    </div>
                    <div class="upload-preview-container hidden">
                        <img class="upload-preview" alt="Preview" />
                        <textarea class="upload-caption hidden form-control" placeholder="Write a caption..."></textarea>
                    </div>
                </div>
                <div class="modal-footer upload-footer hidden">
                    <button class="btn btn-secondary btn-cancel-preview">Cancel</button>
                    <button class="btn btn-primary btn-submit-upload">Submit</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);

        this.modal.querySelector('.btn-close-upload').addEventListener('click', () => this.close());
        this.modal.querySelector('.btn-gallery').addEventListener('click', () => this.openGallery());
        this.modal.querySelector('.btn-camera').addEventListener('click', () => this.openCamera());
        this.modal.querySelector('.btn-cancel-preview').addEventListener('click', () => this.resetView());
        this.modal.querySelector('.btn-submit-upload').addEventListener('click', () => this.submit());

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        document.addEventListener('keydown', this.handleEsc);
    }
    
    handleEsc = (e) => {
        if (e.key === 'Escape') this.close();
    }

    openUploadModal(options) {
        this.options = options || {};
        this.createModal();
        this.createFileInput();
        this.resetView();
        this.modal.classList.add('show');
    }

    openGallery(onSelectCallback) {
        if (onSelectCallback) {
            this.options = { onComplete: onSelectCallback };
        }
        this.createFileInput();
        this.fileInput.click();
    }

    openCamera() {
        if (typeof cameraManager !== 'undefined') {
            cameraManager.open((blob, dataURL) => {
                this.currentFile = blob;
                this.currentDataURL = dataURL;
                this.showPreview();
            });
        }
    }

    handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file.', 'error');
            return;
        }
        this.currentFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentDataURL = e.target.result;
            if (this.modal && this.modal.classList.contains('show')) {
                this.showPreview();
            } else if (this.options && this.options.onComplete) {
                this.options.onComplete(this.currentFile, this.currentDataURL);
            }
        };
        reader.readAsDataURL(file);
    }

    showPreview() {
        this.modal.querySelector('.upload-options').classList.add('hidden');
        this.modal.querySelector('.upload-preview-container').classList.remove('hidden');
        this.modal.querySelector('.upload-footer').classList.remove('hidden');
        
        this.modal.querySelector('.upload-preview').src = this.currentDataURL;
        
        const caption = this.modal.querySelector('.upload-caption');
        if (this.options.showCaption) {
            caption.classList.remove('hidden');
            caption.value = '';
        } else {
            caption.classList.add('hidden');
        }
    }

    resetView() {
        this.currentFile = null;
        this.currentDataURL = null;
        this.modal.querySelector('.upload-options').classList.remove('hidden');
        this.modal.querySelector('.upload-preview-container').classList.add('hidden');
        this.modal.querySelector('.upload-footer').classList.add('hidden');
    }

    submit() {
        if (this.currentFile && this.options.onComplete) {
            let result = this.currentFile;
            if (this.options.showCaption) {
                const caption = this.modal.querySelector('.upload-caption').value.trim();
                result = { file: this.currentFile, caption: caption };
            }
            this.options.onComplete(result, this.currentDataURL);
            this.close();
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('show');
            document.removeEventListener('keydown', this.handleEsc);
        }
    }
}

const imageUploader = new ImageUploader();
