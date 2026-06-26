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

/**
 * Local Heuristic Map to match Pidgin phrases with English words,
 * since the translation mirror only handles formal Igbo.
 */
const pidginHeuristics = {
    "fever": ["fiva", "body dey hot", "hot body"],
    "cough": ["kof", "dey kof", "chest kof"],
    "diarrhea": ["run stomach", "watery stool", "sha-sha"],
    "vomiting": ["throw up", "puke", "vomit"],
    "hospital": ["doctor house", "clinic"],
    "malaria": ["mala", "mosquito fever"],
    "typhoid": ["stomach typhoid"],
    "headache": ["head pain", "head dey pain", "heavy head"],
    "fatigue": ["body weakness", "body strength low"],
    "flu": ["catarrh", "cold-cold"]
};

// DOM Selectors
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const langFilter = document.getElementById('langFilter');
const catFilter = document.getElementById('catFilter');
const lexiconGrid = document.getElementById('lexiconGrid');
const metaInfo = document.getElementById('metaInfo');
const cloudIndicator = document.getElementById('cloudIndicator');

// Array to cache dynamically fetched runtime dictionary items
let dynamicallyGeneratedEntries = [];

document.addEventListener('DOMContentLoaded', () => {
    filterAndRenderLayout();
    
    searchBtn.addEventListener('click', executePureClientPipeline);
    searchInput.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter') executePureClientPipeline(); 
    });
    
    langFilter.addEventListener('change', filterAndRenderLayout);
    catFilter.addEventListener('change', filterAndRenderLayout);
});

function filterAndRenderLayout() {
    const query = searchInput.value.toLowerCase().trim();
    const languageValue = langFilter.value;
    const categoryValue = catFilter.value;

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
 * Pure client-side pipeline directly hitting the Lingva API from the user browser.
 */
async function executePureClientPipeline() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) return filterAndRenderLayout();

    const existsLocally = lexiconData.entries.some(entry => 
        entry.term.toLowerCase().includes(query) || 
        entry.synonyms.some(syn => syn.toLowerCase().includes(query))
    );

    if (existsLocally) {
        if (cloudIndicator) cloudIndicator.classList.add('hidden');
        return filterAndRenderLayout();
    }

    if (cloudIndicator) cloudIndicator.classList.remove('hidden');
    metaInfo.textContent = "Querying live automated open-source translation workers directly...";

    const cleanText = encodeURIComponent(query);

    try {
        // Direct browser-to-API fetch (No backend server step needed)
        const lingvaUrl = `https://lingva.ml/api/v1/en/ig/${cleanText}`;
        const response = await fetch(lingvaUrl);
        
        if (!response.ok) {
            throw new Error(`Public translation worker mirror error: Status ${response.status}`);
        }

        const data = await response.json();

        if (data && data.translation) {
            const igboTranslation = data.translation;
            const pidginPhrases = pidginHeuristics[query] || ["Manual verification required"];

            // Sythesize standard structured cards on the fly
            const batchInjections = [
                { term: query, language: 'en', category: 'symptom', translations: {}, synonyms: [], isCloud: true },
                { term: igboTranslation, language: 'igbo', category: 'symptom', translations: { en: [query] }, synonyms: [query], isCloud: true }
            ];

            pidginPhrases.forEach(phrase => {
                batchInjections.push({ 
                    term: phrase, 
                    language: 'pidgin', 
                    category: 'symptom', 
                    translations: { en: [query] }, 
                    synonyms: [query], 
                    isCloud: true 
                });
            });

            batchInjections.forEach(newItem => {
                if (!dynamicallyGeneratedEntries.some(item => item.term === newItem.term)) {
                    dynamicallyGeneratedEntries.push(newItem);
                }
            });

            filterAndRenderLayout();
        } else {
            metaInfo.textContent = "Could not parse response structure from translation node.";
        }
    } catch (err) {
        console.error("Browser Fetch Failure Exception:", err);
        metaInfo.textContent = "Translation server down or rate-limited. Try standard local keywords.";
    }
}

function displayLexiconGrid(entriesList) {
    const sortedEntries = [...entriesList].sort((a, b) => 
        a.term.localeCompare(b.term, 'en', { sensitivity: 'base' })
    );
    
    lexiconGrid.innerHTML = '';
    metaInfo.textContent = `Displaying ${sortedEntries.length} items within selected parameters.`;

    if (sortedEntries.length === 0) {
        lexiconGrid.innerHTML = `<div class="no-results">No records found matching that query.</div>`;
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
                <div class="card-category">📁 ${entry.category.replace('_', ' ')} ${entry.isCloud ? '(Cloud Generated)' : ''}</div>
            </div>
            <div class="card-details">
                <p><span class="label">EN Translation:</span> <span>${translationText}</span></p>
                ${entry.synonyms.length > 0 ? `<p><span class="label">Mapped Concept:</span> <span>${entry.synonyms.join(', ')}</span></p>` : ''}
            </div>
        `;
        lexiconGrid.appendChild(card);
    });
}