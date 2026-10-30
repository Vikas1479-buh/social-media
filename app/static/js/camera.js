// Reusable camera component
class _CameraManagerClass {
    constructor() {
        this.stream = null;
        this.modal = null;
        this.video = null;
        this.canvas = null;
        this.preview = null;
    }

    createModal() {
        if (this.modal) return;

        this.modal = document.createElement('div');
        this.modal.className = 'camera-modal modal';
        this.modal.innerHTML = `
            <div class="modal-content camera-modal-content">
                <div class="modal-header">
                    <h3>Take Photo</h3>
                    <button class="btn-close-camera">&times;</button>
                </div>
                <div class="camera-body">
                    <video autoplay playsinline class="camera-video"></video>
                    <img class="camera-preview hidden" alt="Captured preview" />
                    <canvas class="hidden"></canvas>
                </div>
                <div class="camera-footer">
                    <button class="btn btn-secondary btn-retake hidden">Retake</button>
                    <button class="btn btn-primary btn-capture">Capture</button>
                    <button class="btn btn-primary btn-use hidden">Use Photo</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);

        this.video = this.modal.querySelector('.camera-video');
        this.canvas = this.modal.querySelector('canvas');
        this.preview = this.modal.querySelector('.camera-preview');

        this.modal.querySelector('.btn-close-camera').addEventListener('click', () => this.close());
        this.modal.querySelector('.btn-capture').addEventListener('click', () => this.capture());
        this.modal.querySelector('.btn-retake').addEventListener('click', () => this.retake());
        this.modal.querySelector('.btn-use').addEventListener('click', () => this.usePhoto());

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        
        // Close on escape
        document.addEventListener('keydown', this.handleEsc);
    }
    
    handleEsc = (e) => {
        if (e.key === 'Escape') this.close();
    }

    async open(onCaptureCallback) {
        this.onCaptureCallback = onCaptureCallback;
        this.createModal();
        this.modal.classList.add('show');
        this.retake(); // Reset view

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            this.video.srcObject = this.stream;
        } catch (error) {
            this.close();
            showToast('Camera permission denied. Use gallery instead.', 'error');
        }
    }

    capture() {
        if (!this.video || !this.stream) return;
        
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);

        this.dataURL = this.canvas.toDataURL('image/jpeg');
        this.preview.src = this.dataURL;

        this.video.classList.add('hidden');
        this.preview.classList.remove('hidden');
        this.modal.querySelector('.btn-capture').classList.add('hidden');
        this.modal.querySelector('.btn-retake').classList.remove('hidden');
        this.modal.querySelector('.btn-use').classList.remove('hidden');
    }

    retake() {
        this.video.classList.remove('hidden');
        this.preview.classList.add('hidden');
        this.modal.querySelector('.btn-capture').classList.remove('hidden');
        this.modal.querySelector('.btn-retake').classList.add('hidden');
        this.modal.querySelector('.btn-use').classList.add('hidden');
        this.dataURL = null;
    }

    usePhoto() {
        if (this.dataURL) {
            this.canvas.toBlob((blob) => {
                if (this.onCaptureCallback) {
                    this.onCaptureCallback(blob, this.dataURL);
                }
                this.close();
            }, 'image/jpeg');
        }
    }

    close() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.video) {
            this.video.srcObject = null;
        }
        if (this.modal) {
            this.modal.classList.remove('show');
            document.removeEventListener('keydown', this.handleEsc);
        }
    }
}

const CameraManager = new _CameraManagerClass();
