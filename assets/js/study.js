// LocalStorage Key Constant
const STORAGE_KEY = 'memorik_cards_data';
const TAGS_STORAGE_KEY = 'memorik_tags_data';
const SELECTED_IDS_KEY = 'memorik_selected_card_ids';
const EXAMPLES_STORAGE_KEY = 'memorik_example_cache';

// State Variables
let studyCards = [];
let currentIndex = 0;

let isFlipped = false; // Tracks whether current card shows Front (false) or Back (true)

// Cache to store generated example sentences by card ID
let exampleCache = JSON.parse(localStorage.getItem(EXAMPLES_STORAGE_KEY)) || {};

// Toggle mock mode for UI development
const USE_MOCK_DATA = false;

document.addEventListener('DOMContentLoaded', () => {
    loadStudySession();
    setupNavigationListeners();

    // Initial Trigger Setup
    document.getElementById("example-btn")?.addEventListener("click", function () {
        let currentCard = studyCards[currentIndex];
        const keyword = currentCard.korean; 
        const meaning = currentCard.english; 

        // Check if example cached for this card ID
        if (exampleCache[currentCard.id]) {
            renderExampleCard(exampleCache[currentCard.id]);
        } else {
            loadAIExampleSentence(keyword, meaning);
        }
    
    });

    // Auto-scroll after collapse panel has opened
    document.getElementById("example-container")?.addEventListener("shown.bs.collapse", function () {
    this.scrollIntoView({ behavior: "smooth", block: "start" });
});
});

/**
 * Loads selected flashcards from LocalStorage using saved IDs
 */
function loadStudySession() {
    const allCards = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const savedIds = JSON.parse(localStorage.getItem(SELECTED_IDS_KEY));

    // Filter master cards using saved selected IDs
    studyCards = allCards.filter(card => savedIds.includes(String(card.id)));

    renderCard();

    // Direct redirect from Study Mode to Library Edit Modal
    const editBtn = document.getElementById("edit-btn");
    editBtn.addEventListener('click', () => {
        const currentCard = studyCards[currentIndex];
        window.location.href = `index.html?edit=${currentCard.id}`; //redirect link
    });
}

/**
 * Renders the front side of the current card based on currentIndex
 */
function renderCard() {
    const currentCard = studyCards[currentIndex];
    const cardInner = document.querySelector(".flashcard-inner");
    
    const mainTextEl = document.getElementById("card-main-text");
    const subTextEl = document.getElementById("card-sub-text");

    if (!currentCard) return;

    // Reset flip state on card load
    cardInner.classList.add("no-transition"); //Disable transition to reset rotation instantly without revealing the back face of next card
    cardInner.classList.remove("flipped");
    isFlipped = false;

    // Reset example sentence section for the new card
    resetExampleContainer();

    // Force DOM reflow so the transition removal takes immediate effect
    void cardInner.offsetHeight;

    // Populate Front
    mainTextEl.textContent = currentCard.korean;
    subTextEl.textContent = currentCard.phoneticHangul ? `[${currentCard.phoneticHangul}]` : '';

    // Populate Back
    const backEnglishEl = document.getElementById("back-english");
    backEnglishEl.textContent = currentCard.english;

    // Re-enable transitions for user flip actions
    cardInner.classList.remove("no-transition");

    // Update Navigation Buttons (Disable boundary states)
    updateNavigationButtons();
}

/**
 * Plays Korean speech audio for a given word using Web Speech API
 * @param {string} koreanText - The Korean text to speak
 */
function playKoreanSpeech(koreanText){
    if (!koreanText) return;

    // Check if Web Speech API is supported in current browser
    if ('speechSynthesis' in window) {
        // Cancel any active speech before starting new utterance
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(koreanText);
        utterance.lang = 'ko-KR'; // Korean locale
        utterance.rate = 0.9;      // Slightly slower for learning clarity

        window.speechSynthesis.speak(utterance);
    } else {
        alert("Sorry, your browser doesn't support speech synthesis.");
    }
}

/**
 * Handles enabling/disabling of Prev and Next buttons at deck bounds
 */
function updateNavigationButtons() {
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");

    if (prevBtn) {
        prevBtn.disabled = (currentIndex === 0);
    }
    if (nextBtn) {
        nextBtn.disabled = (currentIndex === studyCards.length - 1);
    }
}

/**
 * Sets up click event listeners for Next and Prev navigation
 */
function setupNavigationListeners() {
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const flipBtn = document.getElementById('flip-btn');
    const flashcardEl = document.getElementById('flashcard-card');
    const audioBtn = document.getElementById("tts-audio-btn");

    // Audio Control (Bound ONCE here to avoid listener duplication)
    audioBtn?.addEventListener("click", (e) => {
        const currentCard = studyCards[currentIndex];
        playKoreanSpeech(currentCard.korean);
    });

    // Flip Controls
    flipBtn?.addEventListener("click", toggleFlip);
    
    // Flip on flashcard body click
    flashcardEl?.addEventListener("click", (e) => {
        // Prevent flip if clicking the audio button
        if (e.target.closest('#tts-audio-btn')) return;
        toggleFlip();
    });

    // Navigation Controls
    nextBtn?.addEventListener("click", () => {
        if (currentIndex < studyCards.length - 1) {
            navigateWithSlide("next"); // Increments index and calls renderCard which also resets the card to front
        }
    });

    prevBtn?.addEventListener("click", () => {
        navigateWithSlide("prev");
    });
}

/**
 * Toggles card flip state
 */
function toggleFlip() {
    const cardInner = document.querySelector(".flashcard-inner");

    isFlipped = !isFlipped;
    cardInner.classList.toggle("flipped", isFlipped);
}

/**
 * Handles sliding transitions between cards
 * @param {'next' | 'prev'} direction 
 */
function navigateWithSlide(direction) {

    const flashcard= document.getElementById("flashcard-card");

    const outClass = direction === 'next' ? 'slide-out-left' : 'slide-out-right';
    const inClass = direction === 'next' ? 'slide-in-right' : 'slide-in-left';

    // Play Slide Out Animation
    flashcard.classList.add(outClass);

    setTimeout(() => {
        // Increment/Decrement state & update content off-screen
        if (direction === 'next' && currentIndex < studyCards.length - 1) {
            currentIndex++;
        } else if (direction === 'prev' && currentIndex > 0) {
            currentIndex--;
        }
        renderCard(); // Resets flip state & updates text while card is invisible

        // Swap exit animation class with entry animation class
        flashcard.classList.remove(outClass);
        flashcard.classList.add(inClass);

        //Clean up slide classes after slide-in finishes
        setTimeout(() => {
            flashcard.classList.remove(inClass);
        }, 200);

    }, 200); // Matches the CSS animation duration
}


// AI EXAMPLE SENTENCE

/**
 * Persists exampleCache object to LocalStorage
 */
function saveExampleCache() {
    try {
        localStorage.setItem(EXAMPLES_STORAGE_KEY, JSON.stringify(exampleCache));
    } catch (e) {
        console.error("Failed to save example cache to LocalStorage:", e);
    }
}


/**
 * Fetches or generates an AI example sentence for a given card keyword and meaning.
 * Displays loading/error UI states in #example-status and persists results to exampleCache.
 *
 * @async
 * @param {string} keyword - The Korean word from the current flashcard.
 * @param {string} meaning - The corresponding English translation/meaning.
 * @returns {Promise<void>}
 */
async function loadAIExampleSentence(keyword, meaning) {
    const contentArea = document.getElementById("example-status");
    const currentCard = studyCards[currentIndex];
    //  if (!contentArea) return;

    contentArea.innerHTML = `
        <div class="p-4 text-center">
            <img src="assets/images/tutor-writing-blue.jpg" 
                 alt="Korean Tutor Writing" 
                 class="tutor-status-img mb-3">
                
            <div class="spinner-border text-purple" role="status">
               <span class="visually-hidden">Loading...</span>
            </div>
            
            <div class="d-flex align-items-center justify-content-center gap-2 mt-2">
                <p class="fw-semibold text-purple mb-0">
                    Your Korean tutor is scribbling down a custom example sentence... ✍️
                </p>
            </div>
            <small class="text-muted d-block mt-1">Drafting something awesome for you!</small>
        </div>
    `;

    // Mock response branch
    if (USE_MOCK_DATA) {
        // data returned from my api
        const mockApiResponse = {
            "status": "success",
            "data": {
                "korean": "새 차를 사서 기분이 정말 좋아요.",
                "translation": "I am really happy because I bought a new car.",
                "vocabulary": [
                {
                    "word": "새",
                    "meaning": "new",
                    "partOfSpeech": "determiner"
                },
                {
                    "word": "차를",
                    "meaning": "car (with object marker)",
                    "partOfSpeech": "noun + particle"
                },
                {
                    "word": "사서",
                    "meaning": "bought and / because I bought",
                    "partOfSpeech": "verb"
                },
                {
                    "word": "기분이",
                    "meaning": "feeling / mood (with subject marker)",
                    "partOfSpeech": "noun + particle"
                },
                {
                    "word": "정말",
                    "meaning": "really / truly",
                    "partOfSpeech": "adverb"
                },
                {
                    "word": "좋아요.",
                    "meaning": "is good / feels good",
                    "partOfSpeech": "adjective"
                }
                ],
                "grammar": [
                {
                    "pattern": "-아/어서",
                    "explanation": "A connective ending used here to express cause or reason ('because' or 'so')."
                },
                {
                    "pattern": "-을/를",
                    "explanation": "An object-marking particle attached to nouns indicating the direct object of a transitive verb."
                },
                {
                    "pattern": "-이/가 좋다",
                    "explanation": "An expression meaning 'to feel good' or 'to like', where the thing felt or liked is marked by the subject particle."
                }
                ]
            }
            };

        setTimeout(() => {
            contentArea.innerHTML ="";
            const exampleData = mockApiResponse.data;
            //exampleCache[currentCard.id] = exampleData; // Save to separate cache lookup by card ID
            renderExampleCard(exampleData);
        }, 3000);
        return;
    }

    // Live API Fetch
    try {
        const url = `/api/proxy?keyword=${encodeURIComponent(keyword)}&meaning=${encodeURIComponent(meaning)}`;
        const response = await fetch(url);

        if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
        }

        const result = await response.json();
        const data = result.data;
        contentArea.innerHTML ="";
        exampleCache[currentCard.id] = data; // Save to separate cache lookup by card ID
        saveExampleCache();
        renderExampleCard(data);

    } catch (error) {
        console.error("AI Example Fetch Error:", error);

        contentArea.innerHTML = `
            <div class="p-4 text-center">
                <img src="assets/images/tutor-overwhelmed-blue.jpg" 
                     alt="Overwhelmed Korean Tutor" 
                     class="tutor-status-img mb-3">
                
                <h6 class="fw-bold text-dark-blue mb-2">Tutor Overload! 💼</h6>
                <p class="small text-muted mb-3 px-2">
                    Your Korean tutor is overwhelmed with students right now and requested <strong>3 to 5 business seconds</strong> to recover!
                </p>
                
                <button class="btn btn-brand-k rounded-pill px-4 btn-retry">
                    <i class="fa-solid fa-rotate-right me-1"></i> Try Again
                </button>
            </div>
        `;

        // Attach retry handler
        contentArea.querySelector(".btn-retry")?.addEventListener("click", () => {
        loadAIExampleSentence(keyword, meaning);
        });
    }
}


/**
 * Renders the structured AI example sentence data into a template.
 * Dynamically builds interactive Korean word spans, vocabulary items, and grammar patterns
 * with individual click-to-speak TTS audio handlers.
 *
 * @param {Object} data - The example sentence data.
 * @param {string} data.korean - The complete Korean example sentence.
 * @param {string} data.translation - The English translation of the Korean sentence.
 * @param {Array<{word: string, meaning: string, partOfSpeech?: string}>} [data.vocabulary] - Vocabulary item breakdowns.
 * @param {Array<{pattern: string, explanation: string}>} [data.grammar] - Grammar pattern explanations.
 * @returns {void}
 */
function renderExampleCard(data) {
    let contentArea = document.getElementById("example-content");
    contentArea.classList.remove("d-none");

    // Populate Sentence & Translation
    const sentenceEl = document.getElementById("example-sentence-text");
    const translationEl = document.getElementById("example-translation-text");

    if (sentenceEl){
        sentenceEl.innerHTML = "";

        if (data.vocabulary && data.vocabulary.length > 0) {
            data.vocabulary.forEach((item, index) => {
                const wordSpan = document.createElement("span");
                wordSpan.className = "word me-1";
                wordSpan.textContent = item.word;

                // Play individual word audio when clicked in the sentence
                wordSpan.addEventListener("click", () => {
                    playKoreanSpeech(item.word);
                });

                sentenceEl.appendChild(wordSpan);
            });
        } else {
            // Fallback if vocabulary array isn't available
            sentenceEl.textContent = data.korean;
        }
    }
    if (translationEl) translationEl.textContent = data.translation;

    // Populate Vocabulary List using <template>
    const vocabList = document.getElementById("example-vocab-list");
    const vocabTemplate = document.getElementById("vocab-item-template");
    if (vocabList && vocabTemplate && data.vocabulary) {
        vocabList.innerHTML = "";
        data.vocabulary.forEach(item => {
            const clone = vocabTemplate.content.cloneNode(true);
            clone.querySelector(".vocab-word").textContent = item.word;
            clone.querySelector(".vocab-pos").textContent = item.partOfSpeech ? `(${item.partOfSpeech})` : "";
            clone.querySelector(".vocab-meaning").textContent = item.meaning;

            clone.querySelector(".vocab-word").addEventListener("click",() => {
                playKoreanSpeech(item.word);
            });
            
            vocabList.appendChild(clone);
        });
    }

    // Populate Grammar List using <template>
    const grammarList = document.getElementById("example-grammar-list");
    const grammarTemplate = document.getElementById("grammar-item-template");
    if (grammarList && grammarTemplate && data.grammar) {
        grammarList.innerHTML = "";
        data.grammar.forEach(item => {
            const clone = grammarTemplate.content.cloneNode(true);
            clone.querySelector(".grammar-pattern").textContent = item.pattern;
            clone.querySelector(".grammar-explanation").textContent = item.explanation;

            clone.querySelector(".grammar-pattern").addEventListener("click",() => {
                playKoreanSpeech(item.pattern);
            });

            grammarList.appendChild(clone);
        });
    }

    // Bind Audio & Regenerate Handlers
    const ttsBtn = document.getElementById("example-tts-btn");
    if (ttsBtn) {
        ttsBtn.onclick = () => playKoreanSpeech(data.korean);
        // ttsBtn.onclick = () => playSentenceAudio(data.korean);
    }

    const regenBtn = document.getElementById("example-regenerate-btn");
    if (regenBtn) {
        regenBtn.onclick = () => {
            const currentCard = studyCards[currentIndex];
            if (currentCard) {
                contentArea.classList.add("d-none")
                loadAIExampleSentence(currentCard.korean, currentCard.english);
            }
        };
    }
}

/**
 * Resets the AI Example section state when changing flashcards
 */
function resetExampleContainer() {
    const exampleContainer = document.getElementById("example-container");
    const exampleContent = document.getElementById("example-content");
    const exampleStatus = document.getElementById("example-status");

    
    exampleContent?.classList.add("d-none"); // Hide the example content panel

    // Collapse the Bootstrap container if open
    if (exampleContainer && exampleContainer.classList.contains("show")) {
        const bsCollapse = bootstrap.Collapse.getInstance(exampleContainer);
        if (bsCollapse) {
            bsCollapse.hide();
        }
    }
}


async function playSentenceAudio(text) {
    try {
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.audio) {
            // Audio data returned is base64-encoded audio/wav
            const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
            audio.play();
        } else {
            throw new Error('No audio property in response');
        }
    } catch (err) {
        console.warn('Gemini TTS failed, falling back to Web Speech API:', err.message);
        // fallback to browser speech
        playKoreanSpeech(text); 
    }
}