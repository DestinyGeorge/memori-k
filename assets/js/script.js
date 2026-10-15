// LocalStorage Key Constant
const STORAGE_KEY = 'memorik_cards_data';
const selectedCardIds = new Set(); // Set prevents duplicates automatically

// Master cards array
let cards = [];

let createTile = null;

let filteredCards = []; // Active dataset after filters applied

/**
 Page Initialization
 */
document.addEventListener('DOMContentLoaded', async () => {

    // Cache the Create Tile element ONCE before doing anything else
    const createTileEl = document.getElementById("create-flashcard");
    if (createTileEl) {
        createTile = createTileEl.parentElement; // Stores the column wrapper in memory
    }
    
    cards = await loadFlashcardData();
    updateLibraryOverviewStats(cards);


    // DASHBOARD

    // Attach reset event listener safely
    const resetButton = document.getElementById("reset-app-data");
    if (resetButton) {
        resetButton.addEventListener("click", resetAppData);
    }

    // Library

    renderFlashcards(cards);

    populateTagFilters(cards);

    // Attach Filter Toggles
    setupSectionToggle("ratings-toggle", "ratings-options");
    setupSectionToggle("tags-toggle", "dynamic-tags-container");

    // ATTACH FILTER CHANGE EVENT LISTENER
    const filterPanel = document.getElementById("collapseFilters");
    if (filterPanel) {
        filterPanel.addEventListener("change", (e) => {
            applyFilters(e);
        });
    }

    // Run initial filter check (sets results count correctly)
    applyFilters();


    // Sort dropdown changes trigger handleSortChange
    const sortSelectEl = document.getElementById("sort-select");
    if (sortSelectEl) {
        sortSelectEl.addEventListener("change", handleSortChange);
    }

    // Selection Dropdown

    let cardSelectionDropDownEl = document.getElementById("select-card-count");
    cardSelectionDropDownEl.addEventListener("change", handleCardSelectionDropdown);

    let toolbarSelectionBtn = document.getElementById("toolbar-select-toggle-btn");
    toolbarSelectionBtn.addEventListener("click", handleToolBarSelectionButton);
    

    
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
    
    container.innerHTML = "";

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


        // Check if card ID is in selectedCardIds on initial load
        const isSelected = selectedCardIds.has(card.id);

        if (isSelected) {
            iconOff.classList.add("d-none");
            iconOn.classList.remove("d-none");
        } else {
            iconOff.classList.remove("d-none");
            iconOn.classList.add("d-none");
        }
        updateSelectionToolBarUI();

        // Click event toggles the state & updates selectedCardIds
        selectBtn.addEventListener("click", () => {
            if (selectedCardIds.has(card.id)) {
                // Currently selected -> Unselect it
                selectedCardIds.delete(card.id);
                iconOff.classList.remove("d-none");
                iconOn.classList.add("d-none");
            } else {
                // Currently unselected -> Select it
                selectedCardIds.add(card.id);
                iconOff.classList.add("d-none");
                iconOn.classList.remove("d-none");
            }
            console.log("Selected Card IDs:", Array.from(selectedCardIds));
            updateSelectionToolBarUI();

            // set selection dropdown value to manual selection when a card is selected manually
            let cardSelectionDropdownEl = document.getElementById("select-card-count");
            cardSelectionDropdownEl.value = "manual";
        });


        starsContainer.innerHTML = starsHTML;

        // Append cloned card to grid
        container.appendChild(clone);
    });

}

// SELECTION 

function updateSelectionToolBarUI(){

    //set selected count text to reflect number of cards in selectedCardIds
    selectionCountTextEl = document.getElementById("selected-count-text");
    selectionCountTextEl.textContent = selectedCardIds.size;

    // Toggle toolbar icon on or boff based on selected card count
    let iconOff = document.getElementById("toolbar-icon-off");
    let iconOn = document.getElementById("toolbar-icon-on");

    if(selectedCardIds.size === 0){
        iconOff.classList.remove("d-none");
        iconOn.classList.add("d-none");
    } else {
        iconOff.classList.add("d-none");
        iconOn.classList.remove("d-none");
    }


}

function handleCardSelectionDropdown(e){
    let selectedValue = e.target.value;
    // console.log(selectedValue);
    let filteredCardIds = filteredCards.map(card => card.id);
    let filteredCardCount = filteredCardIds.length;

    console.log(filteredCardIds);

    if (selectedValue === "all") {
        filteredCardIds.forEach(id => {
            selectedCardIds.add(id); // Sets automatically ignore duplicates
        });
    } else if (selectedValue !== "manual"){ // not all or manual = unparsed number (5,10,20)
        const targetCount = parseInt(selectedValue, 10);

        // If total available filtered cards is less than or equal to target, select them all
        if (filteredCardCount <= targetCount) {
            filteredCardIds.forEach(id => selectedCardIds.add(id));
        } else {
    
            // add random cards from filteredCardIds until target limit is reached
            while (selectedCardIds.size < targetCount) {
                let randIndex = Math.floor(Math.random() * filteredCardCount);
                let randFilteredCardId = filteredCardIds[randIndex];
                
                if (!selectedCardIds.has(randFilteredCardId)) {
                    selectedCardIds.add(randFilteredCardId);
                }
            }
        }

        if (selectedCardIds.size > targetCount) {
            while (selectedCardIds.size > targetCount) {
                // Convert Set to a temporary Array to allow index lookup
                const currentSelectedArray = Array.from(selectedCardIds);
                
                // Pick a random index based on current array length
                const randIndex = Math.floor(Math.random() * currentSelectedArray.length);
                const cardIdToRemove = currentSelectedArray[randIndex];

                // Delete from Set using the actual ID
                selectedCardIds.delete(cardIdToRemove);
            }
        }
    }
    // Update UI & Re-render cards to show updated checkmarks
    updateSelectionToolBarUI();
    renderFlashcards(filteredCards);


    console.log(selectedCardIds);

}

function handleToolBarSelectionButton(){
    const hasSelections = selectedCardIds.size > 0;
    let cardSelectionDropDownEl = document.getElementById("select-card-count");
    let filteredCardIds = filteredCards.map(card => card.id);
    
    if (hasSelections){
        selectedCardIds.clear()
        cardSelectionDropDownEl.value = "all";
    } else{ // if there are no selected cards
        filteredCards.forEach(element => {
            selectedCardIds.add(element.id)
        });
        cardSelectionDropDownEl.value = "all";
    }

    updateSelectionToolBarUI();
    renderFlashcards(filteredCards);
}


// FILTERS

function populateTagFilters(cards) {
    const tagsContainer = document.getElementById("dynamic-tags-container");
    if (!tagsContainer) return;

    // Collect unique tags
    const allTags = new Set();
    cards.forEach(card => card.tags?.forEach(tag => allTags.add(tag))); // Optional chaining (?.) safely reads nested properties without throwing a TypeError if 'e' or 'target' is null/undefined

    let tagsHTML = `
        <div class="form-check">
            <input class="form-check-input tag-checkbox" type="checkbox" value="all" id="checkTagAll" checked>
            <label class="form-check-label fw-semibold" for="checkTagAll">All Tags</label>
        </div>
    `;

    allTags.forEach(tag => {
        tagsHTML += `
            <div class="form-check">
                <input class="form-check-input tag-checkbox" type="checkbox" value="${tag}" id="tag-${tag}">
                <label class="form-check-label" for="tag-${tag}">#${tag}</label>
            </div>
        `;
    });

    tagsContainer.innerHTML = tagsHTML;
}

function setupSectionToggle(toggleBtnId, contentContainerId) {
    const toggleBtn = document.getElementById(toggleBtnId);
    const contentContainer = document.getElementById(contentContainerId);

    if (!toggleBtn || !contentContainer) return;

    toggleBtn.addEventListener("click", () => {
        // Hide or show the checkbox list
        contentContainer.classList.toggle("d-none");

        // Swap down/up arrows
        const angleDown = toggleBtn.querySelector(".angle-down");
        const angleUp = toggleBtn.querySelector(".angle-up");

        if (angleDown && angleUp) {
            angleDown.classList.toggle("d-none");
            angleUp.classList.toggle("d-none");
        }
    });
}

function handleAllCheckboxSync(groupSelector, allCheckboxId, changedElement) {
    const allCheckbox = document.getElementById(allCheckboxId);
    if (!allCheckbox) return;

    // List of all individual options (excluding "All")
    const filterOptions = Array.from(document.querySelectorAll(groupSelector))
                               .filter(cb => cb.value !== "all");

    // Boolean check: returns true if AT LEAST ONE individual option is ticked
    const isAnyFilterSelected = filterOptions.some(cb => cb.checked);

    if (changedElement === allCheckbox) {
        if (allCheckbox.checked) {
            // User checked "All" -> clear individual options
            filterOptions.forEach(cb => cb.checked = false);
        } else if (!isAnyFilterSelected) {
            // User unchecked "All" directly -> force "All" back on if nothing else is selected
            allCheckbox.checked = true;
        }
    } else {
        if (isAnyFilterSelected) {
            // An individual option is selected -> uncheck "All"
            allCheckbox.checked = false;
        } else {
            // Last individual option was unchecked -> revert back to "All"
            allCheckbox.checked = true;
        }
    }
}

function applyFilters(e) {

    // Run mutual exclusion sync if triggered by a checkbox change
    if (e?.target?.classList.contains("rating-checkbox")) { // Optional chaining (?.)
        handleAllCheckboxSync(".rating-checkbox", "checkRatingAll", e.target);
    }
    if (e?.target?.classList.contains("tag-checkbox")) { // Optional chaining (?.)
        handleAllCheckboxSync(".tag-checkbox", "checkTagAll", e.target);
    }

    // Collect checked rating numbers (ensure integer conversion with radix 10)
    const checkedRatings = Array.from(document.querySelectorAll('.rating-checkbox:checked'))
                                 .map(cb => cb.value)
                                 .filter(val => val !== "all") //exclude all
                                 .map(val => parseInt(val, 10)); //must convert string to int as ratings are numbers

    // Collect checked tag strings
    const checkedTags = Array.from(document.querySelectorAll('.tag-checkbox:checked'))
                             .map(cb => cb.value)
                             .filter(val => val !== "all"); //exclude all

    // Filter global 'cards' array
    filteredCards = cards.filter(card => {
        //If "All Ratings" is active (or no other filter options are checked), checkedRatings is [] so Length is 0 -> remember all is excluded from options
        // Rating check: matches if "All" selected OR card rating matches any checked integer
        const ratingMatch = checkedRatings.length === 0 || checkedRatings.includes(Number(card.rating));
        //If "All Tags" is active (or no other filter options are checked), checkedTags is [] so Length is 0 -> remember all is excluded from options
        // Tag check: matches if "All" selected OR card contains at least one checked tag (.some)
        const tagMatch = checkedTags.length === 0 || checkedTags.some(tag => card.tags?.includes(tag));

        // A card must satisfy both active rating rules AND active tag rules to be included in filteredCards
        return ratingMatch && tagMatch;
    });

    // Apply current sort option to filtered set
    const sortSelectEl = document.getElementById("sort-select");
    const activeSort = sortSelectEl ? sortSelectEl.value : "default";
    filteredCards = sortCards(filteredCards, activeSort);

    // Update DOM counter and re-render card grid
    const resultsCountEl = document.getElementById("results-count");
    if (resultsCountEl) {
        resultsCountEl.textContent = filteredCards.length;
    }

    renderFlashcards(filteredCards);
}

// SORTING

function sortCards(cardsArray, sortCriterion) {
    // Create a shallow copy to prevent mutating the input array directly
    const sorted = [...cardsArray];

    switch (sortCriterion) {
        case "korean-asc":
            // Korean alphabetical order (가 - 하) using localeCompare
            return sorted.sort((a, b) => a.korean.localeCompare(b.korean, "ko"));

        case "english-asc":
            // English alphabetical order (A - Z)
            return sorted.sort((a, b) => a.english.localeCompare(b.english, "en"));

        case "rating-asc":
            // Weakest first (0, 1, 2, 3)
            return sorted.sort((a, b) => a.rating - b.rating);

        case "rating-desc":
            // Strongest first (3, 2, 1, 0)
            return sorted.sort((a, b) => b.rating - a.rating);

        default:
            return sorted;
    }
}

/**
 * Event handler triggered when the user changes the sort dropdown.
 */
function handleSortChange(e) {
    const sortCriterion = e.target.value;

    // Sort active filtered cards in place
    filteredCards = sortCards(filteredCards, sortCriterion);

    // Re-render grid with new order
    renderFlashcards(filteredCards);
}