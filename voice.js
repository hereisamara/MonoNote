/**
 * Voice Module - Voice recording and speech-to-text
 */

const Voice = {
    mediaRecorder: null,
    audioChunks: [],
    recognition: null,
    isRecording: false,
    currentTranscript: '',
    currentAudioBlob: null,
    finalTranscripts: [], // Array to accumulate final speech results

    /**
     * Initialize voice module
     */
    init() {
        this.bindEvents();
        this.checkSpeechRecognitionSupport();
    },

    /**
     * Check if speech recognition is supported
     */
    checkSpeechRecognitionSupport() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser');
            document.getElementById('recordBtn').title = 'Speech recognition not supported in this browser';
        }
    },

    /**
     * Bind voice control events
     */
    bindEvents() {
        // Record button
        document.getElementById('recordBtn').addEventListener('click', () => {
            this.startRecording();
        });

        // Stop button
        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopRecording();
        });

        // Insert transcript button
        document.getElementById('insertTranscriptBtn').addEventListener('click', () => {
            this.insertTranscript();
        });

        // Discard transcript button
        document.getElementById('discardTranscriptBtn').addEventListener('click', () => {
            this.discardTranscript();
        });

        // Language select change
        document.getElementById('languageSelect').addEventListener('change', () => {
            // Save preference
            const settings = Storage.getSettings();
            settings.language = document.getElementById('languageSelect').value;
            Storage.saveSettings(settings);
        });

        // Load saved language preference
        const settings = Storage.getSettings();
        if (settings.language) {
            document.getElementById('languageSelect').value = settings.language;
        }
    },

    /**
     * Start recording audio and speech recognition
     */
    async startRecording() {
        try {
            // Get audio stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Setup media recorder for audio recording
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.audioChunks.push(e.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.currentAudioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
            };

            // Start recording
            this.mediaRecorder.start();

            // Setup speech recognition
            this.startSpeechRecognition();

            // Update UI
            this.isRecording = true;
            this.updateRecordingUI(true);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone. Please allow microphone permissions and try again.');
        }
    },

    /**
     * Start speech recognition
     */
    startSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = document.getElementById('languageSelect').value;

        this.currentTranscript = '';
        this.finalTranscripts = []; // Store all final transcripts

        this.recognition.onresult = (event) => {
            let interimTranscript = '';

            // Process all results from the beginning
            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;

                if (result.isFinal) {
                    // Store final result if not already stored
                    if (i >= this.finalTranscripts.length) {
                        this.finalTranscripts.push(transcript);
                    }
                } else {
                    interimTranscript = transcript;
                }
            }

            // Combine all final transcripts + current interim
            this.currentTranscript = this.finalTranscripts.join(' ');

            // Update transcript preview
            const displayText = this.currentTranscript + (interimTranscript ? ' ' + interimTranscript : '');
            document.getElementById('transcriptText').textContent = displayText.trim();
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                alert('Microphone access denied. Please allow microphone permissions.');
            }
            // On no-speech error, keep trying if still recording
            if (event.error === 'no-speech' && this.isRecording) {
                this.restartRecognition();
            }
        };

        this.recognition.onend = () => {
            // Restart if still recording (speech recognition auto-stops after silence)
            if (this.isRecording) {
                this.restartRecognition();
            }
        };

        try {
            this.recognition.start();
        } catch (e) {
            console.error('Could not start speech recognition:', e);
        }
    },

    /**
     * Restart speech recognition with a small delay
     */
    restartRecognition() {
        setTimeout(() => {
            if (this.isRecording && this.recognition) {
                try {
                    this.recognition.start();
                } catch (e) {
                    // Already started - ignore
                }
            }
        }, 100);
    },

    /**
     * Stop recording
     */
    stopRecording() {
        this.isRecording = false;

        // Stop media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        // Stop speech recognition
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Ignore if already stopped
            }
        }

        // Update UI
        this.updateRecordingUI(false);

        // Show transcript preview if we have a transcript
        if (this.currentTranscript.trim()) {
            document.getElementById('transcriptPreview').classList.remove('hidden');
            document.getElementById('transcriptText').textContent = this.currentTranscript.trim();
        } else {
            // No transcript - just show a message
            document.getElementById('transcriptPreview').classList.remove('hidden');
            document.getElementById('transcriptText').textContent = '(No speech detected)';
        }
    },

    /**
     * Update recording UI state
     * @param {boolean} isRecording - Recording state
     */
    updateRecordingUI(isRecording) {
        const recordBtn = document.getElementById('recordBtn');
        const stopBtn = document.getElementById('stopBtn');
        const indicator = document.getElementById('recordingIndicator');
        const preview = document.getElementById('transcriptPreview');

        if (isRecording) {
            recordBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            indicator.classList.remove('hidden');
            preview.classList.add('hidden');
        } else {
            recordBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
            indicator.classList.add('hidden');
        }
    },

    /**
     * Insert transcript into editor
     */
    insertTranscript() {
        const transcript = this.currentTranscript.trim();

        if (transcript && transcript !== '(No speech detected)') {
            Editor.insertAtCursor('\n\n' + transcript + '\n\n');
        }

        // Save voice memo with audio
        this.saveVoiceMemo(transcript);

        // Reset
        this.discardTranscript();
    },

    /**
     * Save voice memo to page
     * @param {string} transcript - Transcript text
     */
    async saveVoiceMemo(transcript) {
        if (!App.currentPageId || !this.currentAudioBlob) return;

        try {
            // Convert audio blob to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const audioBase64 = reader.result;

                Storage.addVoiceMemo(App.currentPageId, {
                    audio: audioBase64,
                    transcript: transcript
                });

                // Refresh memos list
                const page = Storage.getPage(App.currentPageId);
                this.loadMemos(page);
            };
            reader.readAsDataURL(this.currentAudioBlob);
        } catch (e) {
            console.error('Error saving voice memo:', e);
        }
    },

    /**
     * Discard transcript and reset
     */
    discardTranscript() {
        this.currentTranscript = '';
        this.currentAudioBlob = null;
        this.finalTranscripts = []; // Reset accumulated transcripts
        document.getElementById('transcriptPreview').classList.add('hidden');
        document.getElementById('transcriptText').textContent = '';
    },

    /**
     * Load and display voice memos for a page
     * @param {Object} page - Page object
     */
    loadMemos(page) {
        const memosList = document.getElementById('voiceMemosList');
        const memosContainer = document.getElementById('memosContainer');

        if (!page.voiceMemos || page.voiceMemos.length === 0) {
            memosList.classList.add('hidden');
            return;
        }

        memosList.classList.remove('hidden');
        memosContainer.innerHTML = '';

        page.voiceMemos.forEach(memo => {
            const item = document.createElement('div');
            item.className = 'voice-memo-item';

            // Audio player
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = memo.audio;

            // Transcript
            const transcript = document.createElement('div');
            transcript.className = 'memo-transcript';
            transcript.textContent = memo.transcript || '(No transcript)';

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'memo-delete';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => {
                this.deleteMemo(memo.id);
            });

            item.appendChild(audio);
            item.appendChild(transcript);
            item.appendChild(deleteBtn);
            memosContainer.appendChild(item);
        });
    },

    /**
     * Delete a voice memo
     * @param {string} memoId - Memo ID
     */
    deleteMemo(memoId) {
        if (!App.currentPageId) return;

        if (confirm('Delete this voice memo?')) {
            Storage.deleteVoiceMemo(App.currentPageId, memoId);

            // Refresh memos list
            const page = Storage.getPage(App.currentPageId);
            this.loadMemos(page);
        }
    }
};
