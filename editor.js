/**
 * Editor Module - Notion-like Block Editor
 * Single pad where markdown renders inline after Enter
 */

const Editor = {
    blockEditor: null,
    hiddenContent: null,
    titleInput: null,
    blocks: [],
    currentBlockIndex: -1,
    saveTimeout: null,
    selectedBlocks: new Set(), // Track selected block indices

    /**
     * Initialize the editor
     */
    init() {
        this.blockEditor = document.getElementById('blockEditor');
        this.hiddenContent = document.getElementById('hiddenContent');
        this.titleInput = document.getElementById('pageTitleInput');

        this.bindEvents();
        this.setupMarked();
    },

    /**
     * Configure marked.js options
     */
    setupMarked() {
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true,
                headerIds: false,
                sanitize: false
            });
        }
    },

    /**
     * Bind editor events
     */
    bindEvents() {
        // Title input
        this.titleInput.addEventListener('input', () => {
            this.debouncedSave();
        });

        // Title Enter key - move to first block
        this.titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.blocks.length === 0) {
                    this.addBlock(0, '');
                }
                this.editBlock(0);
            }
        });
    },

    /**
     * Load a page into the editor
     * @param {Object} page - Page object
     */
    loadPage(page) {
        this.titleInput.value = page.title || '';
        this.blocks = [];
        this.selectedBlocks.clear(); // Clear any previous selection
        this.blockEditor.innerHTML = '';

        // Parse content into blocks (split by newlines)
        const content = page.content || '';
        const lines = content.split('\n');

        // Group lines into logical blocks
        let blockLines = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            blockLines.push(line);

            // Create block after empty line or at end
            if (line === '' || i === lines.length - 1) {
                const blockContent = blockLines.join('\n').trim();
                if (blockContent || i === lines.length - 1) {
                    this.blocks.push({ content: blockContent });
                }
                blockLines = [];
            }
        }

        // Ensure at least one block
        if (this.blocks.length === 0) {
            this.blocks.push({ content: '' });
        }

        // Render all blocks
        this.renderAllBlocks();

        // Show editor, hide welcome
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('editorWrapper').classList.remove('hidden');

        // Load voice memos
        Voice.loadMemos(page);

        // Update backlinks
        Linking.updateBacklinks(page.id);
    },

    /**
     * Render all blocks
     */
    renderAllBlocks() {
        this.blockEditor.innerHTML = '';

        this.blocks.forEach((block, index) => {
            const blockEl = this.createBlockElement(block, index);
            this.blockEditor.appendChild(blockEl);
        });

        // Add placeholder for new block at the end
        const placeholder = document.createElement('div');
        placeholder.className = 'block-placeholder';
        placeholder.textContent = "Press Enter to add a new block...";
        placeholder.addEventListener('click', () => {
            this.addBlock(this.blocks.length, '');
            this.editBlock(this.blocks.length - 1);
        });
        this.blockEditor.appendChild(placeholder);
    },

    /**
     * Create a block element
     * @param {Object} block - Block data
     * @param {number} index - Block index
     * @returns {HTMLElement}
     */
    createBlockElement(block, index) {
        const item = document.createElement('div');
        item.className = 'block-item';
        item.dataset.index = index;

        // Check if this block is selected
        if (this.selectedBlocks.has(index)) {
            item.classList.add('selected');
        }

        // Selection checkbox (hidden by default, shown on hover)
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'block-checkbox';
        checkbox.checked = this.selectedBlocks.has(index);
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.toggleBlockSelection(index, checkbox.checked);
        });
        checkbox.addEventListener('click', (e) => e.stopPropagation());

        // Drag handle
        const handle = document.createElement('div');
        handle.className = 'block-handle';
        handle.innerHTML = '⋮⋮';

        // Block content wrapper
        const content = document.createElement('div');
        content.className = 'block-content';

        // Rendered content
        const rendered = document.createElement('div');
        rendered.className = 'block-rendered';

        if (block.content.trim() === '') {
            rendered.classList.add('empty');
        } else {
            // Process links and render markdown
            const processedContent = Linking.processLinks(block.content);
            rendered.innerHTML = this.renderMarkdown(processedContent);
            Linking.bindLinkClicks(rendered);
        }

        // Click to edit
        rendered.addEventListener('click', () => {
            this.editBlock(index);
        });

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'block-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete block';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteBlock(index);
        });

        content.appendChild(rendered);
        item.appendChild(checkbox);
        item.appendChild(handle);
        item.appendChild(content);
        item.appendChild(deleteBtn);

        return item;
    },

    /**
     * Toggle block selection
     * @param {number} index - Block index
     * @param {boolean} selected - Selection state
     */
    toggleBlockSelection(index, selected) {
        if (selected) {
            this.selectedBlocks.add(index);
        } else {
            this.selectedBlocks.delete(index);
        }

        // Update block visual state
        const blockEl = this.blockEditor.querySelector(`[data-index="${index}"]`);
        if (blockEl) {
            blockEl.classList.toggle('selected', selected);
        }

        // Update delete selected button visibility
        this.updateBulkDeleteButton();
    },

    /**
     * Update bulk delete button visibility
     */
    updateBulkDeleteButton() {
        let btn = document.getElementById('deleteSelectedBtn');

        if (this.selectedBlocks.size > 0) {
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'deleteSelectedBtn';
                btn.className = 'delete-selected-btn';
                btn.addEventListener('click', () => this.deleteSelectedBlocks());
                document.querySelector('.page-header').appendChild(btn);
            }
            btn.textContent = `Delete (${this.selectedBlocks.size})`;
            btn.classList.remove('hidden');
        } else if (btn) {
            btn.classList.add('hidden');
        }
    },

    /**
     * Delete all selected blocks
     */
    deleteSelectedBlocks() {
        if (this.selectedBlocks.size === 0) return;

        // Convert to array and sort descending to delete from end first
        const indices = Array.from(this.selectedBlocks).sort((a, b) => b - a);

        // Delete each block
        indices.forEach(index => {
            if (this.blocks.length > 1) {
                this.blocks.splice(index, 1);
            } else {
                // Last block - just clear it
                this.blocks[0].content = '';
            }
        });

        // Clear selection
        this.selectedBlocks.clear();

        // Re-render
        this.renderAllBlocks();
        this.updateBulkDeleteButton();
        this.save();
    },

    /**
     * Render markdown to HTML
     * @param {string} text - Markdown text
     * @returns {string} HTML
     */
    renderMarkdown(text) {
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        }
        // Simple fallback
        return text
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/\n/gim, '<br>');
    },

    /**
     * Start editing a block
     * @param {number} index - Block index
     */
    editBlock(index) {
        // First, finish editing any current block
        this.finishEditing();

        if (index < 0 || index >= this.blocks.length) return;

        this.currentBlockIndex = index;
        const block = this.blocks[index];
        const blockEl = this.blockEditor.querySelector(`[data-index="${index}"]`);

        if (!blockEl) return;

        const content = blockEl.querySelector('.block-content');
        content.innerHTML = '';

        // Create textarea for editing
        const input = document.createElement('textarea');
        input.className = 'block-input';
        input.value = block.content;
        input.placeholder = "Type '/' for commands, or start typing...";

        // Auto-resize
        const autoResize = () => {
            input.style.height = 'auto';
            input.style.height = Math.max(28, input.scrollHeight) + 'px';
        };

        input.addEventListener('input', () => {
            autoResize();
            block.content = input.value;
            this.debouncedSave();
        });

        // Handle keyboard
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();

                // Check if cursor is at the end
                const cursorAtEnd = input.selectionStart === input.value.length;

                if (cursorAtEnd) {
                    // Create new block below
                    this.finishEditing();
                    this.addBlock(index + 1, '');
                    this.editBlock(index + 1);
                } else {
                    // Split the block at cursor
                    const beforeCursor = input.value.substring(0, input.selectionStart);
                    const afterCursor = input.value.substring(input.selectionStart);

                    block.content = beforeCursor;
                    this.finishEditing();
                    this.addBlock(index + 1, afterCursor);
                    this.editBlock(index + 1);
                }
            } else if (e.key === 'Backspace' && input.value === '' && index > 0) {
                // Delete empty block and move to previous
                e.preventDefault();
                this.deleteBlock(index);
                this.editBlock(index - 1);
            } else if (e.key === 'ArrowUp' && input.selectionStart === 0) {
                // Move to previous block
                if (index > 0) {
                    e.preventDefault();
                    this.finishEditing();
                    this.editBlock(index - 1);
                }
            } else if (e.key === 'ArrowDown' && input.selectionStart === input.value.length) {
                // Move to next block
                if (index < this.blocks.length - 1) {
                    e.preventDefault();
                    this.finishEditing();
                    this.editBlock(index + 1);
                }
            } else if (e.key === 'Escape') {
                this.finishEditing();
            }
        });

        // Blur to finish editing
        input.addEventListener('blur', (e) => {
            // Small delay to allow for click on another block
            setTimeout(() => {
                if (this.currentBlockIndex === index) {
                    this.finishEditing();
                }
            }, 100);
        });

        content.appendChild(input);
        input.focus();
        autoResize();

        // Move cursor to end
        input.setSelectionRange(input.value.length, input.value.length);
    },

    /**
     * Finish editing current block
     */
    finishEditing() {
        if (this.currentBlockIndex < 0) return;

        const index = this.currentBlockIndex;
        this.currentBlockIndex = -1;

        // Re-render the block
        if (index >= 0 && index < this.blocks.length) {
            const blockEl = this.blockEditor.querySelector(`[data-index="${index}"]`);
            if (blockEl) {
                const content = blockEl.querySelector('.block-content');
                const block = this.blocks[index];

                content.innerHTML = '';

                const rendered = document.createElement('div');
                rendered.className = 'block-rendered';

                if (block.content.trim() === '') {
                    rendered.classList.add('empty');
                } else {
                    const processedContent = Linking.processLinks(block.content);
                    rendered.innerHTML = this.renderMarkdown(processedContent);
                    Linking.bindLinkClicks(rendered);
                }

                rendered.addEventListener('click', () => {
                    this.editBlock(index);
                });

                content.appendChild(rendered);
            }
        }

        this.save();
    },

    /**
     * Add a new block
     * @param {number} atIndex - Index to insert at
     * @param {string} content - Initial content
     */
    addBlock(atIndex, content) {
        this.blocks.splice(atIndex, 0, { content: content });
        this.renderAllBlocks();
        this.debouncedSave();
    },

    /**
     * Delete a block
     * @param {number} index - Block index
     */
    deleteBlock(index) {
        if (this.blocks.length <= 1) {
            // Don't delete the last block, just clear it
            this.blocks[0].content = '';
            this.renderAllBlocks();
            return;
        }

        this.blocks.splice(index, 1);
        this.renderAllBlocks();
        this.debouncedSave();
    },

    /**
     * Clear the editor
     */
    clear() {
        this.titleInput.value = '';
        this.blocks = [];
        this.blockEditor.innerHTML = '';
        this.currentBlockIndex = -1;

        document.getElementById('welcomeScreen').classList.remove('hidden');
        document.getElementById('editorWrapper').classList.add('hidden');
    },

    /**
     * Insert text into current block
     * @param {string} text - Text to insert
     */
    insertAtCursor(text) {
        if (this.currentBlockIndex >= 0) {
            const block = this.blocks[this.currentBlockIndex];
            block.content += text;
            this.finishEditing();
            this.editBlock(this.currentBlockIndex);
        } else if (this.blocks.length > 0) {
            // Append to last block
            const lastIndex = this.blocks.length - 1;
            this.blocks[lastIndex].content += text;
            this.renderAllBlocks();
        } else {
            // Create a new block with the text
            this.addBlock(0, text);
        }
        this.debouncedSave();
    },

    /**
     * Debounced save function
     */
    debouncedSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.save();
        }, 500);
    },

    /**
     * Save the current page
     */
    save() {
        if (!App.currentPageId) return;

        const page = Storage.getPage(App.currentPageId);
        if (!page) return;

        page.title = this.titleInput.value || 'Untitled';

        // Convert blocks back to content string
        page.content = this.blocks
            .map(b => b.content)
            .join('\n\n');

        Storage.savePage(page);

        // Update sidebar
        Sidebar.render();
    },

    /**
     * Get the current editor content
     * @returns {string} Editor content
     */
    getContent() {
        return this.blocks.map(b => b.content).join('\n\n');
    },

    /**
     * Get the current title
     * @returns {string} Page title
     */
    getTitle() {
        return this.titleInput.value;
    }
};
