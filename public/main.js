
const BASE_URL = (window.location.port === "5500" || window.location.port === "5000") 
    ? "http://localhost:5500" 
    : "";


// Hardcoded core vocabulary database
const lexiconData = {
    "entries": [
        { "term": "fever", "language": "en", "category": "symptom", "translations": {}, "synonyms": [] },
        { "term": "fiva", "language": "pidgin", "category": "symptom", "translations": {"en": ["fever"]}, "synonyms": ["fever"] },
        { "term": "hot body", "language": "pidgin", "category": "symptom", "translations": {"en": ["fever"]}, "synonyms": ["fever"] },
        { "term": "body dey hot", "language": "pidgin", "category": "symptom", "translations": {"en": ["fever"]}, "synonyms": ["fever"] },
        { "term": "ahụ ọkụ", "language": "igbo", "category": "symptom", "translations": {"en": ["fever"]}, "synonyms": ["fever"] },
        { "term": "cough", "language": "en", "category": "respiratory", "translations": {}, "synonyms": [] },
        { "term": "kof", "language": "pidgin", "category": "respiratory", "translations": {"en": ["cough"]}, "synonyms": ["cough"] },
        { "term": "ụkwara", "language": "igbo", "category": "respiratory", "translations": {"en": ["cough"]}, "synonyms": ["cough"] },
        { "term": "diarrhea", "language": "en", "category": "gastrointestinal", "translations": {}, "synonyms": [] },
        { "term": "run stomach", "language": "pidgin", "category": "gastrointestinal", "translations": {"en": ["diarrhea"]}, "synonyms": ["diarrhea"] },
        { "term": "afọ ọsịsa", "language": "igbo", "category": "gastrointestinal", "translations": {"en": ["diarrhea"]}, "synonyms": ["diarrhea"] }
    ]
};

// DOM Node Selectors
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const langFilter = document.getElementById('langFilter');
const catFilter = document.getElementById('catFilter');
const lexiconGrid = document.getElementById('lexiconGrid');
const metaInfo = document.getElementById('metaInfo');
const cloudIndicator = document.getElementById('cloudIndicator');

// Array to store dynamically fetched phrases at runtime
let dynamicallyGeneratedEntries = [];

document.addEventListener('DOMContentLoaded', () => {
    filterAndRenderLayout();
    
    // Process search button actions
    searchBtn.addEventListener('click', executeTranslationPipeline);
    searchInput.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter') executeTranslationPipeline(); 
    });
    
    // Dynamic Dropdown Filtering listeners
    langFilter.addEventListener('change', filterAndRenderLayout);
    catFilter.addEventListener('change', filterAndRenderLayout);
});

/**
 * Filter and sort dictionary entries alphabetically
 */
function filterAndRenderLayout() {
    const query = searchInput.value.toLowerCase().trim();
    const languageValue = langFilter.value;
    const categoryValue = catFilter.value;

    // Combine verified entries with dynamically fetched ones
    const completeDataset = [...lexiconData.entries, ...dynamicallyGeneratedEntries];

    const filtered = completeDataset.filter(entry => {
        const matchesSearch = query === "" || 
            entry.term.toLowerCase().includes(query) || 
            entry.synonyms.some(syn => syn.toLowerCase().includes(query));
        const matchesLang = languageValue === 'all' || entry.language === languageValue;
        const matchesCat = categoryValue === 'all' || entry.category === categoryValue;

        return matchesSearch && matchesLang && matchesCat;
    });

    displayLexiconGrid(filtered);
}

/**
 * Handles backend API requests when a search term isn't found in the local cache
 */
async function executeTranslationPipeline() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) return filterAndRenderLayout();

    // Check if the term exists locally
    const existsLocally = lexiconData.entries.some(entry => 
        entry.term.toLowerCase().includes(query) || 
        entry.synonyms.some(syn => syn.toLowerCase().includes(query))
    );

    if (existsLocally) {
        if (cloudIndicator) cloudIndicator.classList.add('hidden');
        return filterAndRenderLayout();
    }

    // Trigger fallback engine
    if (cloudIndicator) cloudIndicator.classList.remove('hidden');
    metaInfo.textContent = "Querying automated open-source translation workers...";

    try {
            const response = await fetch(`${BASE_URL}/api/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: query })
        });

        const data = await response.json();

        if (data && !data.error) {
            const batchInjections = [
                { term: data.term, language: 'en', category: 'symptom', translations: {}, synonyms: [], isCloud: true },
                { term: data.igbo, language: 'igbo', category: 'symptom', translations: { en: [data.term] }, synonyms: [data.term], isCloud: true }
            ];

            // Map out array collection elements for Pidgin variants
            data.pidgin.forEach(pidginPhrase => {
                batchInjections.push({ 
                    term: pidginPhrase, 
                    language: 'pidgin', 
                    category: 'symptom', 
                    translations: { en: [data.term] }, 
                    synonyms: [data.term], 
                    isCloud: true 
                });
            });

            // Prevent UI duplications
            batchInjections.forEach(newItem => {
                if (!dynamicallyGeneratedEntries.some(item => item.term === newItem.term)) {
                    dynamicallyGeneratedEntries.push(newItem);
                }
            });

            filterAndRenderLayout();
        } else {
            metaInfo.textContent = "Error returning data from translation worker.";
        }
    } catch (err) {
        console.error("Pipeline Failure Connection Exception:", err);
        metaInfo.textContent = "Translation server unreachable or rate-limited.";
    }
}

/**
 * Renders the filtered dataset onto the HTML grid layout
 */
function displayLexiconGrid(entriesList) {
    // Sort items alphabetically, preserving regional accents
    const sortedEntries = [...entriesList].sort((a, b) => 
        a.term.localeCompare(b.term, 'en', { sensitivity: 'base' })
    );
    
    lexiconGrid.innerHTML = '';
    metaInfo.textContent = `Displaying ${sortedEntries.length} items within selected parameters.`;

    if (sortedEntries.length === 0) {
        lexiconGrid.innerHTML = `<div class="no-results">No local or cloud records found matching that query.</div>`;
        return;
    }

    sortedEntries.forEach(entry => {
        const card = document.createElement('div');
        card.className = `card ${entry.isCloud ? 'cloud-derived' : ''}`;
        
        const translationText = entry.translations.en ? entry.translations.en.join(', ') : 'Base Reference Term';

        card.innerHTML = `
            <div>
                <div class="card-header">
                    <h3 class="card-term">${entry.term}</h3>
                    <span class="badge ${entry.language}">${entry.language}</span>
                </div>
                <div class="card-category">📁 ${entry.category.replace('_', ' ')} ${entry.isCloud ? '(Cloud Predicted)' : ''}</div>
            </div>
            <div class="card-details">
                <p><span class="label">EN Translation:</span> <span>${translationText}</span></p>
                ${entry.synonyms.length > 0 ? `<p><span class="label">Mapped Concept:</span> <span>${entry.synonyms.join(', ')}</span></p>` : ''}
            </div>
        `;
        lexiconGrid.appendChild(card);
    });
}