// LocalStorage Key Constant
const STORAGE_KEY = 'memorik_cards_data';
const TAGS_STORAGE_KEY = 'memorik_tags_data';
const SELECTED_IDS_KEY = 'memorik_selected_card_ids';

// State Variables
let studyCards = [];
let currentIndex = 0;

let isFlipped = false; // Tracks whether current card shows Front (false) or Back (true)

document.addEventListener('DOMContentLoaded', () => {
    loadStudySession();
    setupNavigationListeners();
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
            currentIndex++;
            isFlipped = false; // reset to front for new card
            renderCard();
        }
    });

    prevBtn?.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            isFlipped = false; // reset to front for new card
            renderCard();
        }
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