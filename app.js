/**
 * App Module - Main application controller
 * With theme toggle support
 */

const App = {
    currentPageId: null,
    currentTheme: 'dark',

    /**
     * Initialize the application
     */
    init() {
        console.log('MonoNote initializing...');

        // Initialize theme
        this.initTheme();

        // Initialize all modules
        Sidebar.init();
        Editor.init();
        Voice.init();
        LLM.init();

        // Bind theme toggle
        document.getElementById('themeToggleBtn').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Check for existing pages
        const pages = Storage.getAllPages();
        const pageCount = Object.keys(pages).length;

        if (pageCount > 0) {
            // Open the most recently updated page
            const sortedPages = Object.values(pages).sort((a, b) =>
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );
            this.openPage(sortedPages[0].id);
        }

        console.log('MonoNote ready!');
    },

    /**
     * Initialize theme from localStorage
     */
    initTheme() {
        const savedTheme = localStorage.getItem('notionlite_theme') || 'dark';
        this.currentTheme = savedTheme;
        this.applyTheme(savedTheme);
    },

    /**
     * Toggle between dark and light theme
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.currentTheme);
        localStorage.setItem('notionlite_theme', this.currentTheme);
    },

    /**
     * Apply theme to document
     * @param {string} theme - 'dark' or 'light'
     */
    applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        // Update toggle button icon
        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.textContent = theme === 'dark' ? '○' : '●';
            btn.title = theme === 'dark' ? 'Switch to Light' : 'Switch to Dark';
        }
    },

    /**
     * Open a page for editing
     * @param {string} pageId - Page ID
     */
    openPage(pageId) {
        const page = Storage.getPage(pageId);
        if (!page) {
            console.error('Page not found:', pageId);
            return;
        }

        this.currentPageId = pageId;

        // Load page into editor
        Editor.loadPage(page);

        // Update sidebar active state
        Sidebar.render();

        // Update breadcrumb
        this.updateBreadcrumb(page);
    },

    /**
     * Close the current page
     */
    closePage() {
        this.currentPageId = null;
        Editor.clear();
        this.updateBreadcrumb(null);
    },

    /**
     * Update the breadcrumb navigation
     * @param {Object|null} page - Current page or null
     */
    updateBreadcrumb(page) {
        const breadcrumb = document.getElementById('breadcrumb');

        if (!page) {
            breadcrumb.innerHTML = '';
            return;
        }

        let html = '';

        // If page is in a folder, show folder path
        if (page.folderId) {
            const folder = Storage.getFolder(page.folderId);
            if (folder) {
                html += `<span class="breadcrumb-item">${this.escapeHtml(folder.name)}</span>`;
                html += '<span class="breadcrumb-separator">/</span>';
            }
        }

        html += `<span class="breadcrumb-item">${this.escapeHtml(page.title || 'Untitled')}</span>`;

        breadcrumb.innerHTML = html;
    },

    /**
     * Escape HTML special characters
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
