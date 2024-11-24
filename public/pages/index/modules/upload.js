export class UploadManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.setupPasteListener();
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

    async handleImageUpload(file) {
        try {
            // Disable input and show loading state
            this.uiManager.disableInput('Uploading image...');

            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();

            // Insert markdown at cursor position or end
            const imageMarkdown = `![Uploaded Image](${data.url})`;
            const textarea = this.uiManager.messageInput;
            const cursorPos = textarea.selectionStart;

            const currentValue = textarea.value;
            textarea.value = currentValue.substring(0, cursorPos) +
                imageMarkdown +
                currentValue.substring(cursorPos);

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
            this.uiManager.enableInput();
        }
    }
}
