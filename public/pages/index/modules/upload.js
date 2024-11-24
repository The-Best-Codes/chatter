export class UploadManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.isUploading = false;
        this.setupPasteListener();
        this.setupFileUploadListener();
    }

    setupPasteListener() {
        this.uiManager.messageInput.addEventListener('paste', async (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;

            for (const item of items) {
                if (item.type.indexOf('image') === 0) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    await this.handleImageUpload(file);
                    break;
                }
            }
        });
    }

    setupFileUploadListener() {
        const fileInput = document.getElementById('file-upload');
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                await this.handleImageUpload(file);
                // Reset the input so the same file can be uploaded again
                fileInput.value = '';
            }
        });
    }

    setUploadingState(isUploading) {
        this.isUploading = isUploading;
        const uploadButton = document.getElementById('upload-button');
        const uploadIcon = document.getElementById('upload-icon');
        const uploadLoader = document.getElementById('upload-loader');
        const fileInput = document.getElementById('file-upload');

        if (isUploading) {
            uploadButton.classList.add('opacity-50', 'cursor-not-allowed');
            uploadIcon.classList.add('hidden');
            uploadLoader.classList.remove('hidden');
            fileInput.disabled = true;
            this.uiManager.disableInput();
        } else {
            uploadButton.classList.remove('opacity-50', 'cursor-not-allowed');
            uploadIcon.classList.remove('hidden');
            uploadLoader.classList.add('hidden');
            fileInput.disabled = false;
            this.uiManager.enableInput();
        }
    }

    async handleImageUpload(file) {
        if (this.isUploading) return;

        try {
            this.setUploadingState(true);

            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();

            // Enable the input before we insert the markdown
            this.setUploadingState(false);

            // Insert markdown at cursor position or end
            const imageMarkdown = `![Uploaded Image](${data.url})`;
            const textarea = this.uiManager.messageInput;
            const cursorPos = textarea.selectionStart;

            const currentValue = textarea.value;
            textarea.value = currentValue.substring(0, cursorPos) +
                imageMarkdown +
                currentValue.substring(cursorPos);

            textarea.setSelectionRange(cursorPos + imageMarkdown.length, cursorPos + imageMarkdown.length);
            textarea.focus();

            // Select the default name for easy editing
            const startSelect = cursorPos + 2; // After '!['
            const endSelect = startSelect + 'Uploaded Image'.length;
            textarea.setSelectionRange(startSelect, endSelect);
            textarea.focus();

            // Trigger input event for auto-resize
            textarea.dispatchEvent(new Event('input'));

        } catch (error) {
            console.error('Upload error:', error);
            this.uiManager.showError('Failed to upload image. Please try again.');
        } finally {
            this.setUploadingState(false);
        }
    }
}
