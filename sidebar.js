/**
 * Sidebar Module - Navigation tree for folders and pages
 * With drag-and-drop support and folder action buttons
 */

const Sidebar = {
    navTree: null,
    contextMenu: null,
    moveModal: null,
    inputModal: null,
    confirmModal: null,
    contextTarget: null,
    expandedFolders: new Set(),

    // Pending action callbacks
    pendingInputCallback: null,
    pendingConfirmCallback: null,

    // Drag state
    draggedItem: null,
    draggedType: null,
    draggedId: null,

    /**
     * Initialize the sidebar
     */
    init() {
        this.navTree = document.getElementById('navTree');
        this.contextMenu = document.getElementById('contextMenu');
        this.moveModal = document.getElementById('moveModal');
        this.inputModal = document.getElementById('inputModal');
        this.confirmModal = document.getElementById('confirmModal');

        this.bindEvents();
        this.render();
    },

    /**
     * Bind sidebar events
     */
    bindEvents() {
        // New page button
        document.getElementById('newPageBtn').addEventListener('click', () => {
            this.createNewPage();
        });

        document.getElementById('welcomeNewPageBtn')?.addEventListener('click', () => {
            this.createNewPage();
        });

        // New folder button
        document.getElementById('newFolderBtn').addEventListener('click', () => {
            this.createNewFolder();
        });

        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Toggle sidebar
        document.getElementById('toggleSidebarBtn').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Context menu actions
        this.contextMenu.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleContextAction(action);
            });
        });

        // Close context menu on click outside
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Move modal cancel
        document.getElementById('cancelMoveBtn').addEventListener('click', () => {
            this.moveModal.classList.add('hidden');
        });

        // Input modal events
        document.getElementById('cancelInputBtn').addEventListener('click', () => {
            this.hideInputModal();
        });

        document.getElementById('confirmInputBtn').addEventListener('click', () => {
            this.confirmInput();
        });

        // Handle Enter key in input modal
        document.getElementById('modalInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.confirmInput();
            } else if (e.key === 'Escape') {
                this.hideInputModal();
            }
        });

        // Confirm modal events
        document.getElementById('cancelConfirmBtn').addEventListener('click', () => {
            this.hideConfirmModal();
        });

        document.getElementById('confirmActionBtn').addEventListener('click', () => {
            this.confirmAction();
        });

        // Close modals on backdrop click
        this.inputModal?.addEventListener('click', (e) => {
            if (e.target === this.inputModal) {
                this.hideInputModal();
            }
        });

        this.confirmModal?.addEventListener('click', (e) => {
            if (e.target === this.confirmModal) {
                this.hideConfirmModal();
            }
        });

        this.moveModal?.addEventListener('click', (e) => {
            if (e.target === this.moveModal) {
                this.moveModal.classList.add('hidden');
            }
        });
    },

    /**
     * Show input modal
     */
    showInputModal(title, placeholder, defaultValue, buttonText, callback) {
        document.getElementById('inputModalTitle').textContent = title;
        document.getElementById('modalInput').placeholder = placeholder;
        document.getElementById('modalInput').value = defaultValue || '';
        document.getElementById('confirmInputBtn').textContent = buttonText;

        this.pendingInputCallback = callback;
        this.inputModal.classList.remove('hidden');

        setTimeout(() => {
            document.getElementById('modalInput').focus();
            document.getElementById('modalInput').select();
        }, 100);
    },

    hideInputModal() {
        this.inputModal.classList.add('hidden');
        this.pendingInputCallback = null;
        document.getElementById('modalInput').value = '';
    },

    confirmInput() {
        const value = document.getElementById('modalInput').value.trim();
        if (value && this.pendingInputCallback) {
            this.pendingInputCallback(value);
        }
        this.hideInputModal();
    },

    /**
     * Show confirm modal
     */
    showConfirmModal(title, message, buttonText, callback) {
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalMessage').textContent = message;
        document.getElementById('confirmActionBtn').textContent = buttonText;

        this.pendingConfirmCallback = callback;
        this.confirmModal.classList.remove('hidden');
    },

    hideConfirmModal() {
        this.confirmModal.classList.add('hidden');
        this.pendingConfirmCallback = null;
    },

    confirmAction() {
        if (this.pendingConfirmCallback) {
            this.pendingConfirmCallback();
        }
        this.hideConfirmModal();
    },

    /**
     * Render the navigation tree
     */
    render() {
        this.navTree.innerHTML = '';

        const rootFolders = Storage.getChildFolders(null);
        const rootPages = Storage.getPagesByFolder(null);

        rootFolders.forEach(folder => {
            this.navTree.appendChild(this.createFolderElement(folder));
        });

        rootPages.forEach(page => {
            this.navTree.appendChild(this.createPageElement(page));
        });

        const allPages = Object.keys(Storage.getAllPages()).length;
        const welcomeScreen = document.getElementById('welcomeScreen');
        const editorWrapper = document.getElementById('editorWrapper');

        if (allPages === 0) {
            welcomeScreen?.classList.remove('hidden');
            editorWrapper?.classList.add('hidden');
        }
    },

    /**
     * Create a folder element with children
     */
    createFolderElement(folder) {
        const item = document.createElement('div');
        item.className = 'nav-item';
        item.dataset.type = 'folder';
        item.dataset.id = folder.id;

        const isExpanded = this.expandedFolders.has(folder.id);

        const header = document.createElement('div');
        header.className = 'nav-item-header';
        header.innerHTML = `
            <span class="expand-icon ${isExpanded ? 'expanded' : ''}">▶</span>
            <span class="item-icon">📁</span>
            <span class="item-name">${this.escapeHtml(folder.name)}</span>
            <div class="folder-actions">
                <button class="folder-action-btn add-page-btn" title="Add page to folder">+</button>
            </div>
        `;

        // Add page button click handler
        const addBtn = header.querySelector('.add-page-btn');
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.createNewPage(folder.id);
            // Auto-expand the folder
            if (!this.expandedFolders.has(folder.id)) {
                this.expandedFolders.add(folder.id);
            }
        });

        // Click to expand/collapse
        header.addEventListener('click', (e) => {
            if (e.target.classList.contains('folder-action-btn')) return;
            if (e.button === 0) {
                this.toggleFolder(folder.id);
            }
        });

        // Right click for context menu
        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, 'folder', folder.id);
        });

        // Drag and drop - folder is a drop target
        header.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.draggedType === 'page') {
                header.classList.add('drag-over');
            }
        });

        header.addEventListener('dragleave', (e) => {
            header.classList.remove('drag-over');
        });

        header.addEventListener('drop', (e) => {
            e.preventDefault();
            header.classList.remove('drag-over');

            if (this.draggedType === 'page' && this.draggedId) {
                this.moveItem('page', this.draggedId, folder.id);
                // Auto-expand folder
                if (!this.expandedFolders.has(folder.id)) {
                    this.expandedFolders.add(folder.id);
                    this.render();
                }
            }
        });

        item.appendChild(header);

        // Children container
        const children = document.createElement('div');
        children.className = `nav-children ${isExpanded ? 'expanded' : ''}`;

        Storage.getChildFolders(folder.id).forEach(childFolder => {
            children.appendChild(this.createFolderElement(childFolder));
        });

        Storage.getPagesByFolder(folder.id).forEach(page => {
            children.appendChild(this.createPageElement(page));
        });

        item.appendChild(children);
        return item;
    },

    /**
     * Create a page element (draggable)
     */
    createPageElement(page) {
        const item = document.createElement('div');
        item.className = 'nav-item';
        item.dataset.type = 'page';
        item.dataset.id = page.id;
        item.draggable = true;

        const header = document.createElement('div');
        header.className = 'nav-item-header';

        if (App.currentPageId === page.id) {
            header.classList.add('active');
        }

        header.innerHTML = `
            <span class="expand-icon" style="visibility: hidden">▶</span>
            <span class="item-icon">📄</span>
            <span class="item-name">${this.escapeHtml(page.title || 'Untitled')}</span>
        `;

        // Click to open page
        header.addEventListener('click', () => {
            App.openPage(page.id);
        });

        // Right click for context menu
        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, 'page', page.id);
        });

        // Drag start
        item.addEventListener('dragstart', (e) => {
            this.draggedItem = item;
            this.draggedType = 'page';
            this.draggedId = page.id;
            item.classList.add('dragging');

            // Set drag data
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', page.id);
        });

        // Drag end
        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
            this.draggedItem = null;
            this.draggedType = null;
            this.draggedId = null;

            // Remove all drag-over classes
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
        });

        item.appendChild(header);
        return item;
    },

    /**
     * Create a new page
     */
    createNewPage(folderId = null) {
        const page = Storage.savePage({
            title: 'Untitled',
            content: '',
            folderId: folderId,
            voiceMemos: []
        });

        this.render();
        App.openPage(page.id);
    },

    /**
     * Create a new folder
     */
    createNewFolder(parentId = null) {
        this.showInputModal(
            'Create New Folder',
            'Enter folder name...',
            '',
            'Create',
            (name) => {
                Storage.saveFolder({
                    name: name,
                    parentId: parentId
                });
                this.render();
            }
        );
    },

    /**
     * Toggle folder expansion
     */
    toggleFolder(folderId) {
        if (this.expandedFolders.has(folderId)) {
            this.expandedFolders.delete(folderId);
        } else {
            this.expandedFolders.add(folderId);
        }
        this.render();
    },

    /**
     * Show context menu
     */
    showContextMenu(e, type, id) {
        this.contextTarget = { type, id };
        this.contextMenu.classList.remove('hidden');
        this.contextMenu.style.left = `${e.clientX}px`;
        this.contextMenu.style.top = `${e.clientY}px`;
    },

    hideContextMenu() {
        this.contextMenu.classList.add('hidden');
        this.contextTarget = null;
    },

    /**
     * Handle context menu action
     */
    handleContextAction(action) {
        if (!this.contextTarget) return;

        const { type, id } = this.contextTarget;

        switch (action) {
            case 'rename':
                this.renameItem(type, id);
                break;
            case 'move':
                this.showMoveModal(type, id);
                break;
            case 'delete':
                this.deleteItem(type, id);
                break;
        }

        this.hideContextMenu();
    },

    /**
     * Rename an item
     */
    renameItem(type, id) {
        if (type === 'page') {
            const page = Storage.getPage(id);
            if (!page) return;

            this.showInputModal(
                'Rename Page',
                'Enter new page name...',
                page.title,
                'Rename',
                (newName) => {
                    page.title = newName;
                    Storage.savePage(page);
                    this.render();

                    if (App.currentPageId === id) {
                        document.getElementById('pageTitleInput').value = page.title;
                    }
                }
            );
        } else {
            const folder = Storage.getFolder(id);
            if (!folder) return;

            this.showInputModal(
                'Rename Folder',
                'Enter new folder name...',
                folder.name,
                'Rename',
                (newName) => {
                    folder.name = newName;
                    Storage.saveFolder(folder);
                    this.render();
                }
            );
        }
    },

    /**
     * Show move modal
     */
    showMoveModal(type, id) {
        const folderList = document.getElementById('folderSelectList');
        folderList.innerHTML = '';

        const rootItem = document.createElement('div');
        rootItem.className = 'folder-select-item';
        rootItem.innerHTML = '📂 Root (No folder)';
        rootItem.addEventListener('click', () => {
            this.moveItem(type, id, null);
            this.moveModal.classList.add('hidden');
        });
        folderList.appendChild(rootItem);

        const folders = Object.values(Storage.getAllFolders());
        folders.forEach(folder => {
            if (type === 'folder' && folder.id === id) return;

            const item = document.createElement('div');
            item.className = 'folder-select-item';
            item.innerHTML = `📁 ${this.escapeHtml(folder.name)}`;
            item.addEventListener('click', () => {
                this.moveItem(type, id, folder.id);
                this.moveModal.classList.add('hidden');
            });
            folderList.appendChild(item);
        });

        this.moveModal.classList.remove('hidden');
    },

    /**
     * Move an item to a folder
     */
    moveItem(type, id, targetFolderId) {
        if (type === 'page') {
            const page = Storage.getPage(id);
            if (page) {
                page.folderId = targetFolderId;
                Storage.savePage(page);
            }
        } else {
            const folder = Storage.getFolder(id);
            if (folder) {
                folder.parentId = targetFolderId;
                Storage.saveFolder(folder);
            }
        }
        this.render();
    },

    /**
     * Delete an item
     */
    deleteItem(type, id) {
        if (type === 'page') {
            const page = Storage.getPage(id);
            if (!page) return;

            this.showConfirmModal(
                'Delete Page',
                `Delete "${page.title}"? This cannot be undone.`,
                'Delete',
                () => {
                    Storage.deletePage(id);
                    this.render();

                    if (App.currentPageId === id) {
                        App.closePage();
                    }
                }
            );
        } else {
            const folder = Storage.getFolder(id);
            if (!folder) return;

            const hasContents = Storage.getPagesByFolder(id).length > 0 ||
                Storage.getChildFolders(id).length > 0;

            let message = `Delete folder "${folder.name}"?`;
            if (hasContents) {
                message += ' This folder contains items that will be moved to root.';
            }

            this.showConfirmModal(
                'Delete Folder',
                message,
                'Delete',
                () => {
                    Storage.deleteFolder(id, false);
                    this.render();
                }
            );
        }
    },

    /**
     * Handle search
     */
    handleSearch(query) {
        if (!query.trim()) {
            this.render();
            return;
        }

        const results = Storage.searchPages(query);
        this.navTree.innerHTML = '';

        if (results.length === 0) {
            this.navTree.innerHTML = '<div class="nav-item-header" style="color: var(--text-muted);">No results found</div>';
            return;
        }

        results.forEach(page => {
            this.navTree.appendChild(this.createPageElement(page));
        });
    },

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('open');
    },

    /**
     * Escape HTML special characters
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
