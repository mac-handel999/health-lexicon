import express from 'express'; 
import cors from 'cors';
const app = express();
const PORT = 5500;

app.use(cors());
app.use(express.json());
// Serve static assets out of the public directory automatically
app.use(express.static('public'));

/**
 * Local Heuristic Map to match Pidgin phrases with English words,
 * bypassing Google's lack of native Pidgin translation.
 */
const pidginHeuristics = {
    "fever": ["fiva", "my body dey hot", "hot body"],
    "cough": ["kof", "dey kof", "chest cough"],
    "diarrhea": ["running stomach", "watery stool", "sha-sha"],
    "vomiting": ["throw up", "puke", "vomit"],
    "hospital": ["doctor house", "clinic"],
    "malaria": ["mala", "mosquito fever"],
    "typhoid": ["stomach typhoid"],
    "headache": ["head pain", "head dey pain me", "heavy head"]
};

//

// Main translation proxy endpoint using free Lingva worker routing
app.post('/api/translate', async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: "Text parameter is required" });
    }

    const cleanText = encodeURIComponent(text.trim().toLowerCase());

    try {
        // Query Lingva API mirror (English 'en' to Igbo 'ig')
        const lingvaUrl = `https://lingva.ml/api/v1/en/ig/${cleanText}`;
        const response = await fetch(lingvaUrl);
        
        if (!response.ok) {
            throw new Error(`Lingva mirror returned status code ${response.status}`);
        }

        const data = await response.json();
        
        if (!data || !data.translation) {
            throw new Error("Invalid response format received from translation mirror.");
        }

        const igboTranslation = data.translation;

        // Apply fallback dictionary lookup to extract Pidgin variants
        const lowerText = text.toLowerCase().trim();
        const pidginTranslation = pidginHeuristics[lowerText] || ["Manual verification required"];

        // Return a clean unified object back to your application UI
        res.json({
            term: text.toLowerCase(),
            igbo: igboTranslation,
            pidgin: pidginTranslation
        });

    } catch (error) {
        console.error("Backend Proxy Routing Error:", error.message);
        res.status(500).json({ 
            error: "Translation failed.",
            details: "The public translation worker instance might be down or rate-limited."
        });
    }
});

app.listen(PORT, () => {
    console.log(`\x1b[32m%s\x1b[0m`, `📡 Surveillance Lexicon running on http://localhost:${PORT}`);
    console.log(`Using Free, Keyless Lingva Engine for Igbo translations.`);
});