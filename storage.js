/**
 * Storage Module - LocalStorage management for pages and folders
 */

const Storage = {
    PAGES_KEY: 'notionlite_pages',
    FOLDERS_KEY: 'notionlite_folders',
    SETTINGS_KEY: 'notionlite_settings',

    // ============================================
    // Pages
    // ============================================

    /**
     * Get all pages from storage
     * @returns {Object} Object with page IDs as keys
     */
    getAllPages() {
        const data = localStorage.getItem(this.PAGES_KEY);
        return data ? JSON.parse(data) : {};
    },

    /**
     * Get a single page by ID
     * @param {string} id - Page ID
     * @returns {Object|null} Page object or null
     */
    getPage(id) {
        const pages = this.getAllPages();
        return pages[id] || null;
    },

    /**
     * Save a page (create or update)
     * @param {Object} page - Page object with id, title, content, etc.
     * @returns {Object} Saved page
     */
    savePage(page) {
        const pages = this.getAllPages();
        const now = new Date().toISOString();
        
        if (!page.id) {
            page.id = this.generateId();
            page.createdAt = now;
        }
        
        page.updatedAt = now;
        pages[page.id] = page;
        
        localStorage.setItem(this.PAGES_KEY, JSON.stringify(pages));
        return page;
    },

    /**
     * Delete a page by ID
     * @param {string} id - Page ID
     * @returns {boolean} Success status
     */
    deletePage(id) {
        const pages = this.getAllPages();
        if (pages[id]) {
            delete pages[id];
            localStorage.setItem(this.PAGES_KEY, JSON.stringify(pages));
            return true;
        }
        return false;
    },

    /**
     * Get pages in a specific folder
     * @param {string|null} folderId - Folder ID or null for root
     * @returns {Array} Array of pages
     */
    getPagesByFolder(folderId) {
        const pages = this.getAllPages();
        return Object.values(pages).filter(page => page.folderId === folderId);
    },

    /**
     * Search pages by title or content
     * @param {string} query - Search query
     * @returns {Array} Matching pages
     */
    searchPages(query) {
        const pages = this.getAllPages();
        const lowerQuery = query.toLowerCase();
        
        return Object.values(pages).filter(page => 
            page.title.toLowerCase().includes(lowerQuery) ||
            page.content.toLowerCase().includes(lowerQuery)
        );
    },

    /**
     * Get pages that link to a specific page
     * @param {string} pageId - Target page ID
     * @returns {Array} Pages that contain links to the target
     */
    getBacklinks(pageId) {
        const pages = this.getAllPages();
        const targetPage = pages[pageId];
        if (!targetPage) return [];
        
        const linkPattern = new RegExp(`\\[\\[${this.escapeRegex(targetPage.title)}\\]\\]`, 'gi');
        
        return Object.values(pages).filter(page => 
            page.id !== pageId && linkPattern.test(page.content)
        );
    },

    // ============================================
    // Folders
    // ============================================

    /**
     * Get all folders from storage
     * @returns {Object} Object with folder IDs as keys
     */
    getAllFolders() {
        const data = localStorage.getItem(this.FOLDERS_KEY);
        return data ? JSON.parse(data) : {};
    },

    /**
     * Get a single folder by ID
     * @param {string} id - Folder ID
     * @returns {Object|null} Folder object or null
     */
    getFolder(id) {
        const folders = this.getAllFolders();
        return folders[id] || null;
    },

    /**
     * Save a folder (create or update)
     * @param {Object} folder - Folder object with id, name, parentId
     * @returns {Object} Saved folder
     */
    saveFolder(folder) {
        const folders = this.getAllFolders();
        const now = new Date().toISOString();
        
        if (!folder.id) {
            folder.id = this.generateId();
            folder.createdAt = now;
        }
        
        folders[folder.id] = folder;
        localStorage.setItem(this.FOLDERS_KEY, JSON.stringify(folders));
        return folder;
    },

    /**
     * Delete a folder and optionally its contents
     * @param {string} id - Folder ID
     * @param {boolean} deleteContents - Whether to delete pages inside
     * @returns {boolean} Success status
     */
    deleteFolder(id, deleteContents = false) {
        const folders = this.getAllFolders();
        const pages = this.getAllPages();
        
        if (!folders[id]) return false;
        
        if (deleteContents) {
            // Delete all pages in this folder
            Object.values(pages).forEach(page => {
                if (page.folderId === id) {
                    delete pages[page.id];
                }
            });
            localStorage.setItem(this.PAGES_KEY, JSON.stringify(pages));
            
            // Delete child folders recursively
            Object.values(folders).forEach(folder => {
                if (folder.parentId === id) {
                    this.deleteFolder(folder.id, true);
                }
            });
        } else {
            // Move pages to root
            Object.values(pages).forEach(page => {
                if (page.folderId === id) {
                    page.folderId = null;
                }
            });
            localStorage.setItem(this.PAGES_KEY, JSON.stringify(pages));
        }
        
        // Delete the folder itself
        delete folders[id];
        localStorage.setItem(this.FOLDERS_KEY, JSON.stringify(folders));
        return true;
    },

    /**
     * Get child folders of a parent
     * @param {string|null} parentId - Parent folder ID or null for root
     * @returns {Array} Array of folders
     */
    getChildFolders(parentId) {
        const folders = this.getAllFolders();
        return Object.values(folders).filter(folder => folder.parentId === parentId);
    },

    // ============================================
    // Voice Memos
    // ============================================

    /**
     * Add a voice memo to a page
     * @param {string} pageId - Page ID
     * @param {Object} memo - Memo object with audio (base64), transcript
     * @returns {Object} Updated page
     */
    addVoiceMemo(pageId, memo) {
        const page = this.getPage(pageId);
        if (!page) return null;
        
        if (!page.voiceMemos) {
            page.voiceMemos = [];
        }
        
        memo.id = this.generateId();
        memo.createdAt = new Date().toISOString();
        page.voiceMemos.push(memo);
        
        return this.savePage(page);
    },

    /**
     * Delete a voice memo from a page
     * @param {string} pageId - Page ID
     * @param {string} memoId - Memo ID
     * @returns {Object} Updated page
     */
    deleteVoiceMemo(pageId, memoId) {
        const page = this.getPage(pageId);
        if (!page || !page.voiceMemos) return null;
        
        page.voiceMemos = page.voiceMemos.filter(m => m.id !== memoId);
        return this.savePage(page);
    },

    // ============================================
    // Settings
    // ============================================

    /**
     * Get app settings
     * @returns {Object} Settings object
     */
    getSettings() {
        const data = localStorage.getItem(this.SETTINGS_KEY);
        return data ? JSON.parse(data) : { language: 'en-US' };
    },

    /**
     * Save app settings
     * @param {Object} settings - Settings object
     */
    saveSettings(settings) {
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    },

    // ============================================
    // Utilities
    // ============================================

    /**
     * Generate a unique ID
     * @returns {string} UUID-like string
     */
    generateId() {
        return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Escape special regex characters
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    /**
     * Export all data as JSON
     * @returns {string} JSON string
     */
    exportData() {
        return JSON.stringify({
            pages: this.getAllPages(),
            folders: this.getAllFolders(),
            settings: this.getSettings(),
            exportedAt: new Date().toISOString()
        }, null, 2);
    },

    /**
     * Import data from JSON
     * @param {string} jsonData - JSON string
     * @returns {boolean} Success status
     */
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.pages) localStorage.setItem(this.PAGES_KEY, JSON.stringify(data.pages));
            if (data.folders) localStorage.setItem(this.FOLDERS_KEY, JSON.stringify(data.folders));
            if (data.settings) localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(data.settings));
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    },

    /**
     * Clear all data
     */
    clearAll() {
        localStorage.removeItem(this.PAGES_KEY);
        localStorage.removeItem(this.FOLDERS_KEY);
        localStorage.removeItem(this.SETTINGS_KEY);
    }
};
