/**
 * LLM Module - AI Summarization & Smart Actions
 * Supports: OpenAI, Google Gemini, Anthropic Claude
 * Features: Summarize, Smart action prompts based on content
 */

const LLM = {
    providers: {
        openai: {
            name: 'OpenAI (GPT)',
            endpoint: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-3.5-turbo'
        },
        gemini: {
            name: 'Google Gemini',
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            model: 'gemini-2.0-flash'
        },
        anthropic: {
            name: 'Anthropic Claude',
            endpoint: 'https://api.anthropic.com/v1/messages',
            model: 'claude-3-haiku-20240307'
        }
    },

    settingsModal: null,
    currentProvider: 'openai',
    apiKey: '',

    // Smart action definitions
    smartActions: {
        format: {
            icon: '✨',
            label: 'Format & Prettify',
            description: 'Clean up grammar, format as lists/tables/headings',
            prompt: `Improve this note by:
1. Correcting grammar and spelling while keeping the same tone
2. Formatting content appropriately using markdown (headings, lists, tables, bold, etc.)
3. Organizing information logically
4. Keeping the original meaning and style

Return ONLY the improved markdown content, no explanations:`
        },
        summarize: {
            icon: '📝',
            label: 'Summarize',
            description: 'Create a brief summary',
            prompt: 'Summarize this note in 2-3 concise sentences. Return only the summary:'
        },
        budget: {
            icon: '💰',
            label: 'Calculate Totals',
            description: 'Sum up numbers and create a table',
            prompt: `Analyze the numbers/budget/expenses in this note and:
1. Calculate all totals
2. Format as a clean markdown table
3. Add a total/summary row
Return ONLY the formatted markdown table:`
        },
        report: {
            icon: '📋',
            label: 'Format as Report',
            description: 'Structure as a professional report',
            prompt: `Transform this note into a professional report format with:
1. Executive summary at the top
2. Clear sections with headings
3. Bullet points for key items
4. Conclusion if appropriate
Return ONLY the formatted markdown report:`
        },
        actionItems: {
            icon: '✅',
            label: 'Extract Action Items',
            description: 'Pull out tasks and to-dos',
            prompt: `Extract all action items, tasks, and to-dos from this note.
Format as a checkbox list: - [ ] item
Group by category if applicable.
Return ONLY the action items list:`
        },
        expand: {
            icon: '📖',
            label: 'Expand & Elaborate',
            description: 'Add more detail',
            prompt: `Expand on this note by adding more detail and explanation while keeping the same style and tone.
Return ONLY the expanded content:`
        },
        simplify: {
            icon: '🎯',
            label: 'Simplify',
            description: 'Make it clearer and simpler',
            prompt: `Simplify this note to make it clearer and easier to understand.
Use simple language, short sentences.
Return ONLY the simplified content:`
        },
        outline: {
            icon: '📑',
            label: 'Create Outline',
            description: 'Structure as hierarchical outline',
            prompt: `Convert this note into a clean hierarchical outline with:
- Main topics as headings
- Subtopics as nested bullets
Return ONLY the markdown outline:`
        }
    },

    /**
     * Initialize LLM module
     */
    init() {
        this.settingsModal = document.getElementById('llmSettingsModal');
        this.loadSettings();
        this.bindEvents();
    },

    /**
     * Bind events
     */
    bindEvents() {
        // Settings button
        document.getElementById('llmSettingsBtn')?.addEventListener('click', () => {
            this.showSettings();
        });

        // Cancel settings
        document.getElementById('cancelLLMSettingsBtn')?.addEventListener('click', () => {
            this.hideSettings();
        });

        // Save settings
        document.getElementById('saveLLMSettingsBtn')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // AI Actions button (replaces simple summarize)
        document.getElementById('aiActionsBtn')?.addEventListener('click', () => {
            this.showSmartActions();
        });

        // Close on backdrop
        this.settingsModal?.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.hideSettings();
            }
        });

        // Close actions panel when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('smartActionsPanel');
            const btn = document.getElementById('aiActionsBtn');
            if (panel && !panel.contains(e.target) && !btn?.contains(e.target)) {
                panel.classList.add('hidden');
            }
        });
    },

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('notionlite_llm_settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.currentProvider = settings.provider || 'openai';
                this.apiKey = settings.apiKey || '';
            } catch (e) {
                console.error('Failed to load LLM settings:', e);
            }
        }
    },

    /**
     * Show settings modal
     */
    showSettings() {
        document.getElementById('llmProviderSelect').value = this.currentProvider;
        document.getElementById('llmApiKeyInput').value = this.apiKey;
        this.settingsModal.classList.remove('hidden');
    },

    /**
     * Hide settings modal
     */
    hideSettings() {
        this.settingsModal.classList.add('hidden');
    },

    /**
     * Save settings
     */
    saveSettings() {
        this.currentProvider = document.getElementById('llmProviderSelect').value;
        this.apiKey = document.getElementById('llmApiKeyInput').value.trim();

        localStorage.setItem('notionlite_llm_settings', JSON.stringify({
            provider: this.currentProvider,
            apiKey: this.apiKey
        }));

        this.hideSettings();
    },

    /**
     * Check if LLM is configured
     */
    isConfigured() {
        return this.apiKey && this.apiKey.length > 0;
    },

    /**
     * Analyze content and determine suggested actions
     * @param {string} content - Note content
     * @returns {Array} Array of action keys
     */
    analyzeContent(content) {
        const lower = content.toLowerCase();
        const actions = [];

        // Always include Format first
        actions.push('format');

        // Check for budget/expense patterns
        if (/(\$|usd|budget|expense|cost|price|total|income|spent|\d+\.\d{2})/i.test(content)) {
            actions.push('budget');
        }

        // Check for project/specs/report patterns
        if (/project|spec|requirement|feature|milestone|objective|goal|deliverable|scope/i.test(lower)) {
            actions.push('report');
        }

        // Check for task/todo patterns
        if (/todo|task|action|deadline|assign|follow.?up|need to|should|must|will/i.test(lower)) {
            actions.push('actionItems');
        }

        // Check if content is long (might need simplification or outline)
        if (content.length > 500) {
            actions.push('outline');
        }

        // Check if content is brief (might need expansion)
        if (content.length < 200 && content.length > 20) {
            actions.push('expand');
        }

        // Default fallbacks
        if (actions.length < 4) {
            if (!actions.includes('summarize')) actions.push('summarize');
            if (!actions.includes('simplify') && actions.length < 4) actions.push('simplify');
            if (!actions.includes('outline') && actions.length < 4) actions.push('outline');
        }

        // Return only first 4
        return actions.slice(0, 4);
    },

    /**
     * Show smart actions panel
     */
    showSmartActions() {
        if (!App.currentPageId) {
            alert('No note is currently open.');
            return;
        }

        if (!this.isConfigured()) {
            this.showSettings();
            return;
        }

        const content = Editor.getContent();
        if (!content || content.trim().length < 5) {
            alert('Add some content to your note first.');
            return;
        }

        // Analyze content and get suggested actions
        const suggestedActions = this.analyzeContent(content);

        // Render actions panel
        this.renderActionsPanel(suggestedActions);
    },

    /**
     * Render the smart actions panel
     * @param {Array} actionKeys - Array of action keys to show
     */
    renderActionsPanel(actionKeys) {
        let panel = document.getElementById('smartActionsPanel');

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'smartActionsPanel';
            panel.className = 'smart-actions-panel';
            document.getElementById('editorWrapper').appendChild(panel);
        }

        panel.innerHTML = `
            <div class="smart-actions-header">
                <span>✨ AI Actions</span>
                <button class="close-actions-btn" onclick="document.getElementById('smartActionsPanel').classList.add('hidden')">×</button>
            </div>
            <div class="smart-actions-list">
                ${actionKeys.map(key => {
            const action = this.smartActions[key];
            return `
                        <button class="smart-action-btn" data-action="${key}">
                            <span class="action-icon">${action.icon}</span>
                            <div class="action-info">
                                <span class="action-label">${action.label}</span>
                                <span class="action-desc">${action.description}</span>
                            </div>
                        </button>
                    `;
        }).join('')}
            </div>
        `;

        // Bind click handlers
        panel.querySelectorAll('.smart-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const actionKey = btn.dataset.action;
                this.executeAction(actionKey, btn);
            });
        });

        panel.classList.remove('hidden');
    },

    /**
     * Execute a smart action
     * @param {string} actionKey - Action key
     * @param {HTMLElement} btn - Button element
     */
    async executeAction(actionKey, btn) {
        const action = this.smartActions[actionKey];
        if (!action) return;

        const content = Editor.getContent();

        // Show loading overlay
        this.showLoading(action.label);

        // Show button loading state
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<span class="loading-spinner"></span> Processing...';
        btn.disabled = true;

        try {
            const result = await this.callLLM(action.prompt + '\n\n' + content);

            if (result) {
                // Replace or insert content based on action
                if (actionKey === 'summarize') {
                    this.insertSummary(result);
                } else {
                    this.replaceContent(result);
                }

                // Hide panel
                document.getElementById('smartActionsPanel')?.classList.add('hidden');
            }
        } catch (error) {
            console.error('Action failed:', error);
            alert('Action failed: ' + error.message);
        } finally {
            this.hideLoading();
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    },

    /**
     * Show loading overlay
     * @param {string} action - Action name being performed
     */
    showLoading(action) {
        const overlay = document.getElementById('aiLoadingOverlay');
        if (overlay) {
            const text = overlay.querySelector('.ai-loading-text');
            if (text) text.textContent = `${action}...`;
            overlay.classList.remove('hidden');
        }
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('aiLoadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    },

    /**
     * Call the configured LLM
     * @param {string} prompt - Full prompt
     * @returns {Promise<string>} Response
     */
    async callLLM(prompt) {
        switch (this.currentProvider) {
            case 'openai':
                return await this.callOpenAI(prompt);
            case 'gemini':
                return await this.callGemini(prompt);
            case 'anthropic':
                return await this.callAnthropic(prompt);
            default:
                throw new Error('Unknown provider: ' + this.currentProvider);
        }
    },

    /**
     * Call OpenAI API
     */
    async callOpenAI(prompt) {
        const response = await fetch(this.providers.openai.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.providers.openai.model,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant. Format output as clean markdown.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 1500,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    },

    /**
     * Call Google Gemini API
     */
    async callGemini(prompt) {
        const url = `${this.providers.gemini.endpoint}?key=${this.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    maxOutputTokens: 1500,
                    temperature: 0.3
                }
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    },

    /**
     * Call Anthropic Claude API
     */
    async callAnthropic(prompt) {
        const response = await fetch(this.providers.anthropic.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: this.providers.anthropic.model,
                max_tokens: 1500,
                messages: [
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        return data.content?.[0]?.text?.trim() || '';
    },

    /**
     * Insert summary at top of note
     * @param {string} summary - Summary text
     */
    insertSummary(summary) {
        const summaryBlock = `> **📝 Summary:** ${summary}`;

        if (Editor.blocks.length > 0) {
            if (Editor.blocks[0].content.startsWith('> **📝 Summary:**')) {
                Editor.blocks[0].content = summaryBlock;
            } else {
                Editor.blocks.unshift({ content: summaryBlock });
            }
        } else {
            Editor.blocks.push({ content: summaryBlock });
        }

        Editor.renderAllBlocks();
        Editor.save();
    },

    /**
     * Replace entire note content
     * @param {string} newContent - New content
     */
    replaceContent(newContent) {
        // Split content into blocks
        const lines = newContent.split('\n');
        const blocks = [];
        let currentBlock = [];

        for (const line of lines) {
            if (line.trim() === '' && currentBlock.length > 0) {
                blocks.push({ content: currentBlock.join('\n') });
                currentBlock = [];
            } else if (line.trim() !== '') {
                currentBlock.push(line);
            }
        }

        if (currentBlock.length > 0) {
            blocks.push({ content: currentBlock.join('\n') });
        }

        if (blocks.length === 0) {
            blocks.push({ content: newContent });
        }

        Editor.blocks = blocks;
        Editor.renderAllBlocks();
        Editor.save();
    }
};
