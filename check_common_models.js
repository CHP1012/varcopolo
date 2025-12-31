const { GoogleGenerativeAI } = require("@google/generative-ai");

async function check() {
    const key = "AIzaSyAMHRku5Sg0hQZs1K-W5jzo4D3MUUYcC5U";
    const genAI = new GoogleGenerativeAI(key);

    // Try a few common models
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];

    for (const m of models) {
        console.log(`Checking ${m}...`);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Test");
            console.log(`[SUCCESS] ${m}`);
        } catch (e) {
            console.log(`[FAILED] ${m}: ${e.message.split('\n')[0]}`);
        }
    }
}

check();
