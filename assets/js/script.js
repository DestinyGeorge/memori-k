// LocalStorage Key Constant
const STORAGE_KEY = 'memorik_cards_data';
const selectedCardIds = new Set(); // Set prevents duplicates automatically

// Master cards array
let cards = [];
let decks = [];

let createTile = null;
let createDeckTile = null;

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

    createDeckTile = document.getElementById("create-deck").parentElement;
    
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

    renderDecks(decks); // decks array is populated in populateTagFilters(cards)

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
/**
 * Resets the application data stored in LocalStorage back to defaults
 * and reloads the current browser tab to re-trigger initial deck fetching.
 */
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
 * Update Stats Panel: Calculates counts & updates DOM spans
 * 
 *  @param {Array<Object>} cards - Array of flashcard objects used to retrieve rating counts.
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

/**
 * Updates breadcrumb navigation elements depending on the active tab view.
 */
function updateBreadCrumbs(){
        
}

// RENDER TAB CONTENT

/**
 * Renders the grid of flashcard elements inside the cards container using HTML templates.
 * Attaches audio playback and card selection event listeners to each rendered card.
 * 
 * @param {Array<Object>} cardsArray - Array of flashcard objects to display in the grid.
 */
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

        starsContainer.innerHTML = starsHTML;

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


        // Populate Tags Row
        const tagsContainer = clone.querySelector(".card-tags");
        if (tagsContainer) {
            tagsContainer.innerHTML = ""; // Clear hardcoded placeholder badges from template

            if (card.tags && card.tags.length > 0) {
                card.tags.forEach(tag => {
                    const tagBadge = document.createElement("span");
                    tagBadge.className = "badge border me-1";
                    tagBadge.textContent = `#${tag}`;
                    tagsContainer.appendChild(tagBadge);
                });
            }
        }

        // Append cloned card to grid
        container.appendChild(clone);
    });

}


/**
 * Renders deck items directly into #decks-container as grid columns.
 * 
 * @param {Array<string>} decksArray - Array of deck tag strings.
 */
function renderDecks(decksArray) {
    const container = document.getElementById("decks-container");
    const template = document.getElementById("deck-template");
    
    container.innerHTML = "";
    container.appendChild(createDeckTile);

    decksArray.forEach(deck => {
        let deckCount = 0;
        const clone = template.content.cloneNode(true);

        clone.querySelector(".deck-title").textContent = deck;

        cards.forEach(element => {
            if (element.tags.includes(deck)){
                deckCount ++;
            }
        });

        clone.querySelector(".deck-card-count").textContent = `${deckCount} Cards`;
        // clone.querySelector(".deck-card-count").textContent = `${deck.cardIds?.length || 0} Cards`;

        // Append the column element directly to the row container
        container.appendChild(clone);
    });
}

// SELECTION 

/**
 * Updates the selection toolbar counters and toggle icons based on current "selectedCardIds" size.
 * Enables and Disables the Study and Quiz buttons based on minumum required selected cards.
 */
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

    // Toggle Study & Quiz buttons and swap lock/play icons
    const studyBtn = document.getElementById("study-btn");
    const quizBtn = document.getElementById("quiz-btn");
    const minRequiredCards = 1;

    const isEnabled = selectedCardIds.size >= minRequiredCards;

    [studyBtn, quizBtn].forEach(btn => {
        if (!btn) return;

        const iconEl = btn.querySelector(".action-icon");

        if (isEnabled) {
            btn.classList.remove("disabled");
            btn.removeAttribute("aria-disabled");
            
            // Swap Lock icon to Play icon
            if (iconEl) {
                iconEl.classList.remove("fa-lock");
                iconEl.classList.add("fa-play");
            }
        } else {
            btn.classList.add("disabled");
            btn.setAttribute("aria-disabled", "true");

            // Swap Play icon back to Lock icon
            if (iconEl) {
                iconEl.classList.remove("fa-play");
                iconEl.classList.add("fa-lock");
            }
        }
    });


}

/**
 * Handles batch card selection logic when the user selects an option from the card count dropdown.
 * Supports "all", numerical limits (5, 10, 20), and randomized selection/removal.
 * 
 * @param {Event} e - The dropdown change event object.
 */
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

/**
 * Handles master batch selection toggle button clicks.
 * Clears selection if cards are currently selected; otherwise selects all visible filtered cards.
 */
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

/**
 * Dynamically builds and inserts tag checkbox controls into the filter sidebar panel.
 * 
 * @param {Array<Object>} cards - Master list of cards used to extract unique tags.
 */
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

    // Create deck array from tags
    decks = Array.from(allTags);
}

/**
 * Toggles visibility of filter's collapse container sections and swaps directional indicator icons.
 * 
 * @param {string} toggleBtnId - The DOM ID of the toggle trigger element.
 * @param {string} contentContainerId - The DOM ID of the collapsible content wrapper.
 */
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

/**
 * Synchronizes 'All' checkbox mutual exclusion behavior across filter checkbox groups.
 * Checking 'All' clears individual options, while checking an individual option unchecks 'All'.
 * 
 * @param {string} groupSelector - CSS query selector for the group of checkboxes.
 * @param {string} allCheckboxId - DOM ID of the group's "All" checkbox.
 * @param {HTMLElement} changedElement - The specific checkbox target that triggered the change event.
 */
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

/**
 * Evaluates active rating and tag filter checkboxes, filters the master cards dataset,
 * applies active sorting rules, updates the results counter, and re-renders the grid.
 * 
 * @param {Event} [e] - trigger event from a filter checkbox input.
 */
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

/**
 * Sorts an array of flashcard objects based on a specified criterion without mutating the input array.
 * 
 * @param {Array<Object>} cardsArray - Array of flashcards to be sorted.
 * @param {string} sortCriterion - Sort rule ('korean-asc', 'english-asc', 'rating-asc', 'rating-desc').
 * @returns {Array<Object>} A new sorted array of flashcard objects.
 */
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
 * 
 * @param {Event} e - The dropdown change event object.
 */
function handleSortChange(e) {
    const sortCriterion = e.target.value;

    // Sort active filtered cards in place
    filteredCards = sortCards(filteredCards, sortCriterion);

    // Re-render grid with new order
    renderFlashcards(filteredCards);
}