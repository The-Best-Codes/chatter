export class UploadManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.isUploading = false;
        this.setupPasteListener();
        this.setupFileUploadListener();
    }

    setupPasteListener() {
        this.uiManager.messageInput.addEventListener('paste', async (e) => {
            try {
                const clipboardData = e.clipboardData || e.originalEvent.clipboardData;
                const items = clipboardData.items;

                // Check for image first
                for (const item of items) {
                    if (item.type.indexOf('image') === 0) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        await this.handleImageUpload(file);
                        return;
                    }
                }

                // Check for rich text
                if (clipboardData.getData('text/html')) {
                    e.preventDefault();
                    const html = clipboardData.getData('text/html');
                    const markdown = this.convertHtmlToMarkdown(html);
                    this.insertTextAtCursor(markdown);
                    return;
                }

            } catch (error) {
                if (error.name === 'SecurityError') {
                    console.error('Clipboard permission denied:', error);
                    this.uiManager.showError('Please allow clipboard access to paste content');
                } else {
                    console.error('Error handling paste:', error);
                    this.uiManager.showError('Failed to process pasted content');
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

            // Sanitize the URL before creating the markdown
            const sanitizedUrl = this.sanitizeUrl(data.url);
            // Escape the image description
            const escapedDesc = this.escapeMarkdown('Uploaded Image');
            // Insert markdown at cursor position or end
            const imageMarkdown = `![${escapedDesc}](${sanitizedUrl})`;
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

    sanitizeUrl(url) {
        try {
            // Create a URL object to validate the URL
            const parsedUrl = new URL(url);
            // Only allow specific protocols
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('Invalid URL protocol');
            }
            // Encode the URL components to prevent XSS
            return encodeURI(url);
        } catch (e) {
            console.error('Invalid URL:', e);
            throw new Error('Invalid URL provided');
        }
    }

    escapeMarkdown(text) {
        // Escape markdown special characters
        return text.replace(/([\\`*_{}\[\]()#+\-.!])/g, '\\$1');
    }

    convertHtmlToMarkdown(html) {
        // Create a new DOMParser
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.sanitizeHtml(html), 'text/html');

        // Convert common elements to markdown
        let markdown = '';
        const process = (node) => {
            switch (node.nodeType) {
                case Node.TEXT_NODE:
                    markdown += node.textContent;
                    break;
                case Node.ELEMENT_NODE:
                    switch (node.nodeName.toLowerCase()) {
                        case 'h1':
                            markdown += '# ' + this.getTextContent(node) + '\n\n';
                            break;
                        case 'h2':
                            markdown += '## ' + this.getTextContent(node) + '\n\n';
                            break;
                        case 'h3':
                            markdown += '### ' + this.getTextContent(node) + '\n\n';
                            break;
                        case 'p':
                            markdown += this.processInlineElements(node) + '\n\n';
                            break;
                        case 'strong':
                        case 'b':
                            markdown += '**' + this.getTextContent(node) + '**';
                            break;
                        case 'em':
                        case 'i':
                            markdown += '_' + this.getTextContent(node) + '_';
                            break;
                        case 'a':
                            markdown += '[' + this.getTextContent(node) + '](' + node.getAttribute('href') + ')';
                            break;
                        case 'ul':
                            node.childNodes.forEach(li => {
                                if (li.nodeName.toLowerCase() === 'li') {
                                    markdown += '- ' + this.processInlineElements(li) + '\n';
                                }
                            });
                            markdown += '\n';
                            break;
                        case 'ol':
                            let index = 1;
                            node.childNodes.forEach(li => {
                                if (li.nodeName.toLowerCase() === 'li') {
                                    markdown += `${index}. ` + this.processInlineElements(li) + '\n';
                                    index++;
                                }
                            });
                            markdown += '\n';
                            break;
                        case 'br':
                            markdown += '\n';
                            break;
                        default:
                            node.childNodes.forEach(process);
                    }
                    break;
            }
        };

        doc.childNodes.forEach(process);
        return markdown.trim();
    }

    sanitizeHtml(html) {
        // Create a new DOMParser
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // List of allowed tags
        const allowedTags = new Set(['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br', 'h1', 'h2', 'h3']);
        // List of allowed attributes
        const allowedAttributes = new Set(['href']);

        function sanitizeNode(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Remove node if it's not in allowed tags
                if (!allowedTags.has(node.tagName.toLowerCase())) {
                    node.remove();
                    return;
                }

                // Remove all attributes except allowed ones
                const attributes = Array.from(node.attributes);
                attributes.forEach(attr => {
                    if (!allowedAttributes.has(attr.name)) {
                        node.removeAttribute(attr.name);
                    }
                });

                // If it's an anchor tag, sanitize the href
                if (node.tagName.toLowerCase() === 'a' && node.hasAttribute('href')) {
                    try {
                        const sanitizedHref = this.sanitizeUrl(node.getAttribute('href'));
                        node.setAttribute('href', sanitizedHref);
                    } catch (e) {
                        node.removeAttribute('href');
                    }
                }
            }

            // Recursively sanitize child nodes
            Array.from(node.childNodes).forEach(child => sanitizeNode(child));
        }

        sanitizeNode(doc.body);
        return doc.body.innerHTML;
    }

    processInlineElements(node) {
        let text = '';
        node.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                text += child.textContent;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                let content = '';
                switch (child.nodeName.toLowerCase()) {
                    case 'strong':
                    case 'b':
                        content = '**' + this.getTextContent(child) + '**';
                        break;
                    case 'em':
                    case 'i':
                        content = '_' + this.getTextContent(child) + '_';
                        break;
                    case 'a':
                        content = '[' + this.getTextContent(child) + '](' + child.getAttribute('href') + ')';
                        break;
                    default:
                        content = this.getTextContent(child);
                }
                text += content;
            }
        });
        return text;
    }

    getTextContent(node) {
        return node.textContent;
    }

    insertTextAtCursor(text) {
        const textarea = this.uiManager.messageInput;
        const cursorPos = textarea.selectionStart;
        const currentValue = textarea.value;

        textarea.value = currentValue.substring(0, cursorPos) +
            text +
            currentValue.substring(cursorPos);

        const newCursorPos = cursorPos + text.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();

        // Trigger input event for auto-resize
        textarea.dispatchEvent(new Event('input'));
    }
}
