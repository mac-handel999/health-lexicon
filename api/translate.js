/**
 * Local Heuristic Map to match Pidgin phrases with English words,
 * bypassing Google's lack of native Pidgin translation.
 */
const pidginHeuristics = {
    "fever": ["fiva", "body dey hot", "hot body"],
    "cough": ["kof", "dey kof", "chest cough"],
    "diarrhea": ["run stomach", "watery stool", "sha-sha"],
    "vomiting": ["throw up", "puke", "vomit"],
    "hospital": ["doctor house", "clinic"],
    "malaria": ["mala", "mosquito fever"],
    "typhoid": ["stomach typhoid"],
    "headache": ["head pain", "head dey pain", "heavy head"]
};

// Vercel Serverless Function Handler Lifecycle
export default async function handler(req, res) {
    // Enable Cross-Origin Resource Sharing (CORS) handles
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight OPTIONS requests cleanly
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(451).json({ error: "Method Not Allowed. Use POST execution paths." });
    }

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: "Text parameter is required" });
    }

    const cleanText = encodeURIComponent(text.trim().toLowerCase());

    try {
        // Query free Lingva API mirror (English 'en' to Igbo 'ig')
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
        const lowerText = text.toLowerCase().trim();
        const pidginTranslation = pidginHeuristics[lowerText] || ["Manual verification required"];

        // Return a clean unified payload structure
        return res.status(200).json({
            term: text.toLowerCase(),
            igbo: igboTranslation,
            pidgin: pidginTranslation
        });

    } catch (error) {
        console.error("Serverless API Error:", error.message);
        return res.status(500).json({ 
            error: "Translation pipeline error.",
            details: error.message
        });
    }
}