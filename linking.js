/**
 * Linking Module - Page linking with [[Page Name]] syntax
 */

const Linking = {
    // Regex to match [[Page Name]] links
    linkPattern: /\[\[([^\]]+)\]\]/g,

    /**
     * Process content to convert [[links]] to clickable HTML
     * @param {string} content - Markdown content
     * @returns {string} Processed content with HTML links
     */
    processLinks(content) {
        return content.replace(this.linkPattern, (match, pageName) => {
            const page = this.findPageByTitle(pageName);
            if (page) {
                return `<span class="page-link" data-page-id="${page.id}" data-page-name="${this.escapeHtml(pageName)}">${this.escapeHtml(pageName)}</span>`;
            } else {
                // Page doesn't exist - show as potential new page
                return `<span class="page-link new-page" data-page-name="${this.escapeHtml(pageName)}" title="Click to create">${this.escapeHtml(pageName)}</span>`;
            }
        });
    },

    /**
     * Find a page by its title (case-insensitive)
     * @param {string} title - Page title to find
     * @returns {Object|null} Page object or null
     */
    findPageByTitle(title) {
        const pages = Storage.getAllPages();
        const lowerTitle = title.toLowerCase().trim();

        return Object.values(pages).find(page =>
            page.title.toLowerCase().trim() === lowerTitle
        ) || null;
    },

    /**
     * Bind click events to page links in the preview
     * @param {HTMLElement} container - Container element
     */
    bindLinkClicks(container) {
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                const pageId = link.dataset.pageId;
                const pageName = link.dataset.pageName;

                if (pageId) {
                    // Navigate to existing page
                    App.openPage(pageId);
                } else if (pageName) {
                    // Create new page with this name
                    this.createPageFromLink(pageName);
                }
            });
        });
    },

    /**
     * Create a new page from a link
     * @param {string} title - Page title
     */
    createPageFromLink(title) {
        const currentPage = Storage.getPage(App.currentPageId);
        const folderId = currentPage ? currentPage.folderId : null;

        const page = Storage.savePage({
            title: title,
            content: '',
            folderId: folderId,
            voiceMemos: []
        });

        Sidebar.render();
        App.openPage(page.id);
    },

    /**
     * Update the backlinks section for a page
     * @param {string} pageId - Current page ID
     */
    updateBacklinks(pageId) {
        const backlinksSection = document.getElementById('backlinksSection');
        const backlinksList = document.getElementById('backlinksList');

        const backlinks = Storage.getBacklinks(pageId);

        if (backlinks.length === 0) {
            backlinksSection.style.display = 'none';
            return;
        }

        backlinksSection.style.display = 'block';
        backlinksList.innerHTML = '';

        backlinks.forEach(page => {
            const item = document.createElement('div');
            item.className = 'backlink-item';
            item.textContent = page.title || 'Untitled';
            item.addEventListener('click', () => {
                App.openPage(page.id);
            });
            backlinksList.appendChild(item);
        });
    },

    /**
     * Get all pages that the current page links to
     * @param {string} pageId - Page ID
     * @returns {Array} Array of linked pages
     */
    getOutgoingLinks(pageId) {
        const page = Storage.getPage(pageId);
        if (!page) return [];

        const links = [];
        let match;

        const regex = new RegExp(this.linkPattern.source, 'g');
        while ((match = regex.exec(page.content)) !== null) {
            const linkedPage = this.findPageByTitle(match[1]);
            if (linkedPage && linkedPage.id !== pageId) {
                links.push(linkedPage);
            }
        }

        return links;
    },

    /**
     * Insert a page link at the cursor position
     * @param {string} pageTitle - Title of the page to link
     */
    insertLink(pageTitle) {
        Editor.insertAtCursor(`[[${pageTitle}]]`);
    },

    /**
     * Get suggestions for page links based on partial input
     * @param {string} query - Partial page name
     * @returns {Array} Matching pages
     */
    getSuggestions(query) {
        if (!query || query.length < 2) return [];

        const pages = Storage.getAllPages();
        const lowerQuery = query.toLowerCase();

        return Object.values(pages)
            .filter(page => page.title.toLowerCase().includes(lowerQuery))
            .slice(0, 5);
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
