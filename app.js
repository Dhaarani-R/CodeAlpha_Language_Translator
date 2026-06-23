/**
 * ==========================================================================
 * SUPPORTED LANGUAGES DICTIONARY
 * ==========================================================================
 * A Javascript Object (dictionary) holding language codes as keys, and 
 * language names as values. We use ISO 639-1 language codes.
 */
const languages = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "hi": "Hindi",
    "ta": "Tamil",
    "zh": "Chinese",
    "ar": "Arabic",
    "ja": "Japanese",
    "pt": "Portuguese",
    "ru": "Russian",
    "tr": "Turkish",
    "nl": "Dutch",
    "ko": "Korean",
    "vi": "Vietnamese",
    "pl": "Polish",
    "sv": "Swedish"
};

/**
 * ==========================================================================
 * DOM ELEMENT SELECTORS
 * ==========================================================================
 * Document Object Model (DOM) elements are HTML tags that we grab in JavaScript
 * so we can read their contents, modify them, or listen to user interactions.
 */
const sourceLangSelect = document.getElementById("source-lang");
const targetLangSelect = document.getElementById("target-lang");
const sourceTextarea = document.getElementById("source-text");
const targetTextarea = document.getElementById("target-text");
const translateBtn = document.getElementById("translate-btn");
const swapBtn = document.getElementById("swap-btn");
const clearBtn = document.getElementById("clear-btn");
const recordBtn = document.getElementById("record-btn");
const speakSourceBtn = document.getElementById("speak-source-btn");
const speakTargetBtn = document.getElementById("speak-target-btn");
const copyBtn = document.getElementById("copy-btn");
const copyTooltip = document.getElementById("copy-tooltip");
const themeToggleBtn = document.getElementById("theme-toggle");
const charNumSpan = document.getElementById("char-num");
const statusIndicator = document.getElementById("status-indicator");
const pronunciationBar = document.getElementById("pronunciation-bar");
const pronunciationText = document.getElementById("pronunciation-text");

// A variable to store our timer for "debouncing" (translating as the user types)
let debounceTimer;

/**
 * ==========================================================================
 * INITIALIZATION (When the webpage loads)
 * ==========================================================================
 */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Populate the Dropdown Select Options
    populateLanguageSelects();

    // 2. Set default languages (Source: English, Target: Spanish)
    sourceLangSelect.value = "en";
    targetLangSelect.value = "es";

    // 3. Load saved dark/light theme preference from browser storage
    loadSavedTheme();

    // 4. Render translation history (Unique feature)
    renderHistory();
});

/**
 * Inserts options into our language dropdown elements using the languages object.
 */
function populateLanguageSelects() {
    // Loop through each language key-value pair in our dictionary
    for (const [code, name] of Object.entries(languages)) {
        // Create a new option element: <option value="code">name</option>
        const optionSource = document.createElement("option");
        optionSource.value = code;
        optionSource.textContent = name;
        sourceLangSelect.appendChild(optionSource);

        const optionTarget = document.createElement("option");
        optionTarget.value = code;
        optionTarget.textContent = name;
        targetLangSelect.appendChild(optionTarget);
    }
}

/**
 * ==========================================================================
 * CORE TRANSLATION LOGIC (API Calling)
 * ==========================================================================
 */

/**
 * Fetches the translation from Google Translate (free public endpoint).
 * This is an "async" (asynchronous) function because fetching data over the internet 
 * takes time, and we don't want to freeze the rest of the browser while we wait.
 */
async function translateText() {
    const text = sourceTextarea.value.trim();
    let sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

    // If input is empty, clear output and stop
    if (!text) {
        targetTextarea.value = "";
        hidePronunciation();
        return;
    }

    // Show loading spinner
    statusIndicator.classList.add("active");

    // If source language is set to "detect" (Auto-detect), Google uses "auto"
    if (sourceLang === "detect") {
        sourceLang = "auto";
    }

    /**
     * Translation API URL:
     * We send our request to our local proxy server at /api/translate
     * The proxy forwards it to Google Translate and returns the result.
     * 
     * Why a proxy? Browsers block direct requests to translate.googleapis.com
     * due to CORS (Cross-Origin Resource Sharing) security rules. Our proxy
     * bypasses this because server-to-server requests aren't restricted by CORS.
     * 
     * Parameters:
     *   sl=         - Source language code (or "auto" for auto-detect)
     *   tl=         - Target language code
     *   dt=t        - Data type: "t" means we want translated text
     *   dt=rm       - Data type: "rm" means we also want romanized/pronunciation text
     *   q=          - The query text to translate
     * 
     * encodeURIComponent() makes the text safe to send as a URL. For example, 
     * it changes spaces to "%20" and question marks to "%3F".
     */
    const url = `/api/translate?sl=${sourceLang}&tl=${targetLang}&dt=t&dt=rm&q=${encodeURIComponent(text)}`;

    try {
        // fetch() makes the HTTP request to the API
        const response = await fetch(url);
        
        // Check if the server responded with an error status
        if (!response.ok) {
            console.error("Server responded with status:", response.status);
            targetTextarea.value = "Translation server error (status " + response.status + "). Please try again.";
            hidePronunciation();
            return;
        }

        // Read the raw response text first (for debugging)
        const rawText = await response.text();
        
        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (parseError) {
            console.error("Failed to parse response as JSON:", rawText.substring(0, 200));
            targetTextarea.value = "Received invalid response from server. Please try again.";
            hidePronunciation();
            return;
        }

        // Log the response for debugging (can be viewed in browser's Developer Console)
        console.log("Translation API response:", data);

        /**
         * Google's response format is a nested array:
         * data[0] contains an array of translation segments.
         * Each segment is [translatedText, originalText, ...]
         * The last element in data[0] may contain romanization at index [2].
         * We join all translated segments together to get the full translation.
         */
        if (data && data[0]) {
            // Collect all translated text segments and join them
            const segments = data[0].filter(segment => segment && segment[0]);
            const translatedText = segments
                .map(segment => segment[0])                 // Extract translated text
                .join("");                                  // Combine into one string
            
            if (!translatedText) {
                targetTextarea.value = "No translation available for this text.";
                hidePronunciation();
                return;
            }

            // Update the translation panel with the translated text
            targetTextarea.value = translatedText;

            /**
             * Extract romanized pronunciation (if available).
             * Google returns romanization for non-Latin scripts (Tamil, Hindi, Chinese, etc.)
             * The romanization is in the last element of data[0] at index [2].
             * Example: For Tamil, data[0] might contain:
             *   ["வணக்கம்", "Hello", null, null, ...],
             *   [null, null, "vanakkam eppadi irukkireergal"]
             */
            let romanized = null;
            // Search through segments for romanization text (at index [2] of each segment)
            for (let i = data[0].length - 1; i >= 0; i--) {
                const seg = data[0][i];
                if (seg && seg[2] && typeof seg[2] === "string" && seg[2].trim()) {
                    romanized = seg[2].trim();
                    break;
                }
            }

            /**
             * SUBTITLE LOGIC - Language learning style breakdown for ALL languages:
             * 
             * Shows the pronunciation (romanized for non-Latin scripts, or the 
             * translated text for Latin scripts) paired with the original English text.
             * 
             * Examples:
             *   Tamil:    "vanakkam eppadi irukkireergal  —  Hello how are you"
             *   Spanish:  "Hola cómo estás  —  Hello how are you"
             *   Chinese:  "nǐ hǎo nǐ hǎo ma  —  Hello how are you"
             */
            // Only show subtitle if the translated text is actually different from source
            if (text.toLowerCase() !== translatedText.toLowerCase()) {
                // Pick the best "readable" form to display
                // For non-Latin scripts: use romanization (e.g., "vanakkam")
                // For Latin scripts: use the translated text itself (e.g., "Hola")
                const readableForm = (romanized && romanized.toLowerCase() !== translatedText.toLowerCase()) 
                    ? romanized 
                    : translatedText;
                
                showPronunciation(readableForm + "  —  " + text);
            } else {
                // Same text (e.g., source and target are the same language)
                hidePronunciation();
            }
            
            // Save to history (Unique Feature)
            saveToHistory(text, translatedText, sourceLang === "auto" ? "detect" : sourceLang, targetLang);
        } else {
            console.error("Unexpected response format:", data);
            targetTextarea.value = "Translation error. Please try again.";
            hidePronunciation();
        }
    } catch (error) {
        console.error("Translation API Error:", error);
        targetTextarea.value = "Could not connect to Translation Server. Check your internet connection.";
        hidePronunciation();
    } finally {
        // Hide loading spinner (runs no matter if request succeeded or failed)
        statusIndicator.classList.remove("active");
    }
}

/**
 * Shows the pronunciation subtitle bar with romanized text.
 * @param {string} text - The romanized pronunciation text.
 */
function showPronunciation(text) {
    if (pronunciationBar && pronunciationText) {
        pronunciationText.textContent = text;
        pronunciationBar.style.display = "flex";
    }
}

/**
 * Hides the pronunciation subtitle bar.
 */
function hidePronunciation() {
    if (pronunciationBar) {
        pronunciationBar.style.display = "none";
    }
}

/**
 * ==========================================================================
 * EVENT LISTENERS (User Actions)
 * ==========================================================================
 */

// Translate button click event
translateBtn.addEventListener("click", translateText);

// Character Counter and Auto-Translation on Typing (Debouncing)
sourceTextarea.addEventListener("input", () => {
    const length = sourceTextarea.value.length;
    charNumSpan.textContent = length;

    // Clear any previous countdown timer
    clearTimeout(debounceTimer);

    // Debounce: Wait 800 milliseconds after the user stops typing before translating.
    // This stops us from making 100 API calls if the user types a 100-letter word.
    debounceTimer = setTimeout(() => {
        translateText();
    }, 800);
});

// Swap Languages Button click event
swapBtn.addEventListener("click", () => {
    const sourceText = sourceTextarea.value;
    const targetText = targetTextarea.value;
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

    // Cannot swap "Auto-Detect" with target language
    if (sourceLang === "detect") {
        alert("Please select a specific source language before swapping.");
        return;
    }

    // Swap select dropdown selections
    sourceLangSelect.value = targetLang;
    targetLangSelect.value = sourceLang;

    // Swap textbox contents
    sourceTextarea.value = targetText;
    targetTextarea.value = sourceText;

    // Re-calculate characters and trigger new translation
    charNumSpan.textContent = sourceTextarea.value.length;
    translateText();
});

// Clear Text Button click event
clearBtn.addEventListener("click", () => {
    sourceTextarea.value = "";
    targetTextarea.value = "";
    charNumSpan.textContent = "0";
    hidePronunciation();
});

/**
 * ==========================================================================
 * FEATURE 1: COPY TO CLIPBOARD
 * ==========================================================================
 */
copyBtn.addEventListener("click", () => {
    const textToCopy = targetTextarea.value;
    if (!textToCopy) return;

    // Navigator Clipboard API writes text directly to operating system clipboard
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            // Update tooltip text to say "Copied!" and show it
            copyTooltip.textContent = "Copied!";
            copyTooltip.classList.add("show");

            // Change icon to checkmark temporarily
            const icon = copyBtn.querySelector("i");
            icon.className = "fa-solid fa-check";

            // Reset back to copy icon and hide tooltip after 2 seconds
            setTimeout(() => {
                copyTooltip.classList.remove("show");
                copyTooltip.textContent = "Copy";
                icon.className = "fa-solid fa-copy";
            }, 2000);
        })
        .catch(err => {
            console.error("Failed to copy text: ", err);
        });
});

/**
 * ==========================================================================
 * FEATURE 2: TEXT-TO-SPEECH (TTS) - Audio Playback
 * ==========================================================================
 */

/**
 * Language code to locale mapping.
 * Speech APIs work best with full locale codes (e.g. "en-US") rather than
 * short ISO codes (e.g. "en"). This map converts our short codes to locales.
 */
const langLocaleMap = {
    "en": "en-US",
    "es": "es-ES",
    "fr": "fr-FR",
    "de": "de-DE",
    "it": "it-IT",
    "hi": "hi-IN",
    "ta": "ta-IN",
    "zh": "zh-CN",
    "ar": "ar-SA",
    "ja": "ja-JP",
    "pt": "pt-BR",
    "ru": "ru-RU",
    "tr": "tr-TR",
    "nl": "nl-NL",
    "ko": "ko-KR",
    "vi": "vi-VN",
    "pl": "pl-PL",
    "sv": "sv-SE"
};

/**
 * Cache of available browser voices. Chrome loads voices asynchronously,
 * so we store them once the 'voiceschanged' event fires.
 */
let cachedVoices = [];

if (window.speechSynthesis) {
    // Try loading voices immediately (works in Firefox/Safari)
    cachedVoices = window.speechSynthesis.getVoices();

    // Chrome fires this event when voices are ready (they load asynchronously)
    window.speechSynthesis.onvoiceschanged = () => {
        cachedVoices = window.speechSynthesis.getVoices();
    };
}

/**
 * Speaks text using the browser's speechSynthesis API.
 * @param {string} text - The text to read aloud.
 * @param {string} langCode - The ISO 639-1 language code (e.g. "en", "ta").
 */
function speakText(text, langCode) {
    // If the browser doesn't support speaking aloud, alert the user and stop
    if (!window.speechSynthesis) {
        alert("Text-to-Speech is not supported in this browser. Try using Chrome or Edge.");
        return;
    }

    if (!text.trim()) return;

    // Stop any speech that is currently playing
    window.speechSynthesis.cancel();

    // Chrome bug workaround: a small delay after cancel() prevents silent failure
    setTimeout(() => {
        // Create a new Speech Utterance instance
        const utterance = new SpeechSynthesisUtterance(text);

        // Convert short code to full locale (e.g. "ta" -> "ta-IN")
        const locale = langLocaleMap[langCode] || langCode;
        utterance.lang = locale;

        // Try to find a matching voice from cached voices
        const matchingVoice = cachedVoices.find(voice => voice.lang.startsWith(langCode)) ||
                              cachedVoices.find(voice => voice.lang === locale);
        if (matchingVoice) {
            utterance.voice = matchingVoice;
        }

        // Speak!
        window.speechSynthesis.speak(utterance);
    }, 100);
}

// Event Listeners for Speaking text
speakSourceBtn.addEventListener("click", () => {
    const text = sourceTextarea.value;
    let lang = sourceLangSelect.value;

    if (!text.trim()) return;

    // If source language is Auto-Detect, default to English for speech
    if (lang === "detect") {
        lang = "en";
    }
    speakText(text, lang);
});

speakTargetBtn.addEventListener("click", () => {
    const text = targetTextarea.value;
    const lang = targetLangSelect.value;
    if (text.trim()) {
        speakText(text, lang);
    }
});

/**
 * ==========================================================================
 * FEATURE 3: SPEECH-TO-TEXT (STT) - Voice Typing
 * ==========================================================================
 */

// Check if browser supports speech recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    
    // Keep listening while the user is talking
    recognition.continuous = false;
    
    // Show intermediate results while typing (set false for final sentence only)
    recognition.interimResults = false;

    // Event listener when speech recognition starts
    recognition.onstart = () => {
        recordBtn.classList.add("recording");
        recordBtn.title = "Listening... Click to stop";
    };

    // Event listener when speech recognition stops
    recognition.onend = () => {
        recordBtn.classList.remove("recording");
        recordBtn.title = "Start Voice Typing";
    };

    // Event listener when speech recognition successfully captures audio
    recognition.onresult = (event) => {
        // Extract the transcript text from the result event
        const transcript = event.results[0][0].transcript;
        
        // Append voice text to source textarea
        sourceTextarea.value += (sourceTextarea.value ? " " : "") + transcript;
        
        // Update character count and trigger translation
        charNumSpan.textContent = sourceTextarea.value.length;
        translateText();
    };

    // Event listener for audio capturing errors
    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        recordBtn.classList.remove("recording");
        recordBtn.title = "Start Voice Typing";

        if (event.error === "not-allowed") {
            alert("Microphone access was denied. Please allow microphone access in your browser settings and try again.");
        } else if (event.error === "no-speech") {
            alert("No speech was detected. Please try again and speak clearly into your microphone.");
        } else if (event.error === "network") {
            alert("A network error occurred during speech recognition. Please check your internet connection.");
        } else if (event.error === "aborted") {
            // User cancelled, no need to alert
        } else {
            alert("Speech recognition error: " + event.error + ". Please try again.");
        }
    };

    // Clicking the record button toggles listening state
    recordBtn.addEventListener("click", () => {
        if (recordBtn.classList.contains("recording")) {
            recognition.stop();
        } else {
            // Set voice recognition language using proper locale code
            const sourceLang = sourceLangSelect.value;
            recognition.lang = sourceLang === "detect" 
                ? "en-US" 
                : (langLocaleMap[sourceLang] || sourceLang);
            
            try {
                recognition.start();
            } catch (err) {
                console.error("Mic start error:", err);
                // This can happen if recognition is already running
                // Try stopping and restarting
                recognition.stop();
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (retryErr) {
                        alert("Could not start the microphone. Please refresh the page and try again.");
                    }
                }, 300);
            }
        }
    });
} else {
    // If not supported (e.g. Firefox/Opera), disable record button visually
    recordBtn.style.opacity = "0.3";
    recordBtn.style.cursor = "not-allowed";
    recordBtn.title = "Speech recognition is not supported in this browser. Use Chrome or Edge.";
    recordBtn.addEventListener("click", () => {
        alert("Speech-to-Text is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
    });
}

/**
 * ==========================================================================
 * FEATURE 4: LIGHT / DARK THEME TOGGLE (Persistent)
 * ==========================================================================
 */

themeToggleBtn.addEventListener("click", () => {
    // Toggle the .light-mode CSS class on body tag
    const isLightMode = document.body.classList.toggle("light-mode");
    
    // Update the icon inside the button (Sun/Moon)
    const icon = themeToggleBtn.querySelector("i");
    if (isLightMode) {
        icon.className = "fa-solid fa-sun";
        localStorage.setItem("theme", "light"); // Save choice to browser memory
    } else {
        icon.className = "fa-solid fa-moon";
        localStorage.setItem("theme", "dark");  // Save choice to browser memory
    }
});

function loadSavedTheme() {
    const savedTheme = localStorage.getItem("theme");
    const icon = themeToggleBtn.querySelector("i");

    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        icon.className = "fa-solid fa-sun";
    } else {
        document.body.classList.remove("light-mode");
        icon.className = "fa-solid fa-moon";
    }
}

/**
 * ==========================================================================
 * UNIQUE FEATURE: TRANSLATION HISTORY LOGIC
 * ==========================================================================
 */

/**
 * Saves a translation record to the browser's localStorage.
 */
function saveToHistory(srcText, destText, srcLangCode, destLangCode) {
    // Look up readable language names (default back to codes if not found)
    const srcLangName = srcLangCode === "detect" ? "Detected Language" : (languages[srcLangCode] || srcLangCode);
    const destLangName = languages[destLangCode] || destLangCode;
    
    // Create new translation entry object
    const newItem = {
        id: Date.now(), // Generate a unique ID using current timestamp
        srcText: srcText,
        destText: destText,
        srcLangCode: srcLangCode,
        destLangCode: destLangCode,
        srcLangName: srcLangName,
        destLangName: destLangName
    };
    
    // Retrieve existing history, or initialize as an empty array
    let history = JSON.parse(localStorage.getItem("translate_history")) || [];
    
    // Check if this translation already exists in the recent list to avoid duplicates
    const isDuplicate = history.some(item => 
        item.srcText.toLowerCase() === srcText.toLowerCase() && 
        item.srcLangCode === srcLangCode && 
        item.destLangCode === destLangCode
    );
    
    if (isDuplicate) return; // Don't add if duplicate

    // Add new translation item to the beginning of the list
    history.unshift(newItem);
    
    // Restrict history to only show the last 6 entries to keep UI clean
    history = history.slice(0, 6);
    
    // Save list back to browser storage
    localStorage.setItem("translate_history", JSON.stringify(history));
    
    // Re-draw history list on page
    renderHistory();
}

/**
 * Renders the saved translation items on the screen.
 */
function renderHistory() {
    const historyList = document.getElementById("history-list");
    
    // Load history array
    const history = JSON.parse(localStorage.getItem("translate_history")) || [];
    
    // If no history exists, display placeholder text
    if (history.length === 0) {
        historyList.innerHTML = `<p class="no-history">No translations yet. Start translating to build history!</p>`;
        return;
    }
    
    // Clear list
    historyList.innerHTML = "";
    
    // Loop through entries and build HTML elements
    history.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "history-item";
        itemDiv.innerHTML = `
            <div class="history-item-content">
                <div class="history-item-langs">
                    <span>${item.srcLangName}</span>
                    <i class="fa-solid fa-arrow-right"></i>
                    <span>${item.destLangName}</span>
                </div>
                <div class="history-item-text">${item.srcText}</div>
                <div class="history-item-translated">${item.destText}</div>
            </div>
            <div class="history-actions">
                <!-- Copy Translation -->
                <button class="history-action-btn copy-hist-btn" title="Copy Translation" data-text="${item.destText}">
                    <i class="fa-solid fa-copy"></i>
                </button>
                <!-- Load back into main translator boxes -->
                <button class="history-action-btn load-hist-btn" title="Use in Translator" 
                    data-srctext="${item.srcText}" data-desttext="${item.destText}" 
                    data-srclang="${item.srcLangCode}" data-destlang="${item.destLangCode}">
                    <i class="fa-solid fa-arrow-up-from-bracket"></i>
                </button>
                <!-- Delete single item -->
                <button class="history-action-btn delete-btn delete-hist-btn" title="Delete Entry" data-id="${item.id}">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        historyList.appendChild(itemDiv);
    });

    // Add event listeners to "Copy" buttons in the history list
    document.querySelectorAll(".copy-hist-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const btnEl = e.currentTarget;
            const text = btnEl.getAttribute("data-text");
            navigator.clipboard.writeText(text).then(() => {
                const icon = btnEl.querySelector("i");
                icon.className = "fa-solid fa-check";
                setTimeout(() => {
                    icon.className = "fa-solid fa-copy";
                }, 1500);
            });
        });
    });

    // Add event listeners to "Load/Restore" buttons in the history list
    document.querySelectorAll(".load-hist-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const btnEl = e.currentTarget;
            sourceTextarea.value = btnEl.getAttribute("data-srctext");
            targetTextarea.value = btnEl.getAttribute("data-desttext");
            sourceLangSelect.value = btnEl.getAttribute("data-srclang");
            targetLangSelect.value = btnEl.getAttribute("data-destlang");
            charNumSpan.textContent = sourceTextarea.value.length;
            
            // Scroll smoothly back up to the main translator card
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });

    // Add event listeners to "Delete" buttons in the history list
    document.querySelectorAll(".delete-hist-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const btnEl = e.currentTarget;
            const id = parseInt(btnEl.getAttribute("data-id"));
            let hist = JSON.parse(localStorage.getItem("translate_history")) || [];
            
            // Filter out the selected item
            hist = hist.filter(item => item.id !== id);
            localStorage.setItem("translate_history", JSON.stringify(hist));
            
            // Re-render
            renderHistory();
        });
    });
}

// Clear All History Button Listener
const clearHistoryBtn = document.getElementById("clear-history-btn");
if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear all translation history?")) {
            localStorage.removeItem("translate_history");
            renderHistory();
        }
    });
}
