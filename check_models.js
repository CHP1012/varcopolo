const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    // Use the verified key
    const key = "AIzaSyAMHRku5Sg0hQZs1K-W5jzo4D3MUUYcC5U";
    console.log("Using Key:", key);
    // We can't list models easily with this SDK version directly on the instance, 
    // but we can try a basic model like 'gemini-pro'.

    const genAI = new GoogleGenerativeAI(key);
    try {
        // Try gemini-1.5-flash
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("test");
        console.log("gemini-1.5-flash works");
    } catch (e) { console.log("gemini-1.5-flash failed:", e.message); }

    try {
        // Try gemini-pro
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("test");
        console.log("gemini-pro works");
    } catch (e) { console.log("gemini-pro failed:", e.message); }

}

listModels();
