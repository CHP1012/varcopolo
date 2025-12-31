const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkImageGen() {
    const key = "AIzaSyAMHRku5Sg0hQZs1K-W5jzo4D3MUUYcC5U";
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp-image-generation",
        generationConfig: {
            responseMimeType: "image/jpeg"
        }
    });

    const prompt = "A futuristic city skyline, neon lights, night time, graphic novel style.";

    console.log("Requesting image with responseMimeType: 'image/jpeg'...");
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log("Response Keys:", Object.keys(response));
        // console.log("Candidates:", JSON.stringify(response.candidates, null, 2));

        if (response.candidates && response.candidates[0].content.parts) {
            const part = response.candidates[0].content.parts[0];
            if (part.inlineData) {
                console.log("SUCCESS: Received Inline Image!");
                console.log("Mime:", part.inlineData.mimeType);
                console.log("Data Length:", part.inlineData.data.length);
            } else {
                console.log("Still received text:", part.text);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkImageGen();
