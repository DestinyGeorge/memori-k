// LocalStorage Key Constant
const STORAGE_KEY = 'memorik_cards_data';

/**
 Page Initialization
 */
document.addEventListener('DOMContentLoaded', async () => {
    
    const cards = await loadFlashcardData();
    updateLibraryOverviewStats(cards);


    //DASHBOARD

    // 2. Attach reset event listener safely
    const resetButton = document.getElementById("reset-app-data");
    if (resetButton) {
        resetButton.addEventListener("click", resetAppData);
    }

    
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



