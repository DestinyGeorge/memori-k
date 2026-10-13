// LocalStorage Key Constant
const STORAGE_KEY = 'memorik_cards_data';
const selectedCardIds = new Set(); // Set prevents duplicates automatically

/**
 Page Initialization
 */
document.addEventListener('DOMContentLoaded', async () => {
    
    const cards = await loadFlashcardData();
    updateLibraryOverviewStats(cards);


    // DASHBOARD

    // Attach reset event listener safely
    const resetButton = document.getElementById("reset-app-data");
    if (resetButton) {
        resetButton.addEventListener("click", resetAppData);
    }

    // Library

    renderFlashcards(cards);

    
});


// DASHBOARD
function resetAppData() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload(); // Reloads page to re-trigger default-deck.json fetch
    console.log("App Data Reset")
}



// document.getElementById("reset-app-data").addEventListener("click", resetAppData);


// LIBRARY
/**
 * 1. Load Data: Checks LocalStorage first; if empty, fetches default-data.json
 */
async function loadFlashcardData() {
    const localData = localStorage.getItem(STORAGE_KEY);

    if (localData) {
        return JSON.parse(localData);
    } else {
        try {
            const response = await fetch('assets/data/default-deck.json');
            const defaultData = await response.json();
            
            // Seed LocalStorage for future modifications
            localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
            return defaultData;
        } catch (error) {
            console.error('Error fetching default card data:', error);
            return [];
        }
    }
}

/**
 * 2. Update Stats Panel: Calculates counts & updates DOM spans
 */
function updateLibraryOverviewStats(cards) {
    if (!cards || cards.length === 0) return;

    let memorised = 0;
    let familiar = 0;
    let weak = 0;
    let unknown = 0;

    cards.forEach(card => {
        switch (card.rating) {
            case 3:
                memorised++;
                break;
            case 2:
                familiar++;
                break;
            case 1:
                weak++;
                break;
            case 0:
            default:
                unknown++;
                break;
        }
    });

    // Calculate total mastery percentage
    const totalCards = cards.length;
    // Example formula: Memorised = 100% value, Familiar = 50% value
    const masteryScore = Math.round(((memorised + (familiar * 0.5)) / totalCards) * 100);

    // Update DOM Spans
    document.getElementById('memorised-words').textContent = memorised;
    document.getElementById('familiar-words').textContent = familiar;
    document.getElementById('weak-words').textContent = weak;
    document.getElementById('unkown-words').textContent = unknown;
    document.getElementById('mastery-percentage').textContent = masteryScore;

}

// TABS

const allCardsTabButton = document.getElementById("all-cards-tab");
const decksTabButton = document.getElementById("decks-tab");
const studyTracksTabButton = document.getElementById("study-tracks-tab");

const breadCrumbsElement = document.getElementById("library-breadcrumbs");

allCardsTabButton.addEventListener("click", updateBreadCrumbs)

function updateBreadCrumbs(){
        
}

function renderFlashcards(cardsArray) {
    const container = document.getElementById("cards-container");
    const template = document.getElementById("card-template");

    const createTile = document.getElementById("create-flashcard").parentElement;
    container.innerHTML = "";
    // if (createTile) container.appendChild(createTile);
    container.appendChild(createTile);
        
    cardsArray.forEach(card => {
        // Clone the template
        const clone = template.content.cloneNode(true);
        const cardElement = clone.querySelector(".flashcard");

        // Attach dataset ID for tracking
        cardElement.dataset.id = card.id;

        // Populate Vocabulary Text
        clone.querySelector(".card-korean").textContent = card.korean;
        clone.querySelector(".card-english").textContent = card.english;

        // Handle Optional Phonetic Hangul
        const phoneticEl = clone.querySelector(".card-phonetic");
        if (card.phoneticHangul) {
            phoneticEl.textContent = `[${card.phoneticHangul}]`;
        } else {
            phoneticEl.remove();
        }

        // Render Rating Stars (0 to 3 stars)
        const starsContainer = clone.querySelector(".card-rating-stars");
        // starsContainer.title = `Rating: ${card.rating}/3`;
        starsContainer.title = ``
        switch(card.rating){
            case 0:
                starsContainer.title = `Unkown`;
                break;
            case 1:
                starsContainer.title = `Weak`;
                break;
            case 2:
                starsContainer.title = `Familiar`;
                break;
            case 3:
                starsContainer.title = `Memorised`
                break;
        }

        let starsHTML = "";
        for (let i = 0; i < 3; i++) {
            if (i < card.rating) {
                starsHTML += '<i class="fa-solid fa-star text-warning me-1"></i>';
            } else {
                starsHTML += '<i class="fa-regular fa-star text-muted me-1"></i>';
            }
        }

        // Audio Playback Event Listener
        const audioBtn = clone.querySelector(".audio-play-btn");
        audioBtn.addEventListener("click", () => {
            if (card.audioUrl) {
                new Audio(card.audioUrl).play().catch(err => console.log("Audio file missing:", err));
            }
        });

        // Selection Toggle Event Listener
        const selectBtn = clone.querySelector(".card-select-btn");
        const iconOff = selectBtn.querySelector(".select-icon-off");
        const iconOn = selectBtn.querySelector(".select-icon-on");

        selectBtn.addEventListener("click", () => {
            iconOff.classList.toggle("d-none");
            iconOn.classList.toggle("d-none");
            cardElement.classList.toggle("border-cyan");
        });


        starsContainer.innerHTML = starsHTML;



        // Append cloned card to grid
        container.appendChild(clone);
    });

}

