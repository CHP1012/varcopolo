const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

async function checkImageGen() {
    const key = "AIzaSyAMHRku5Sg0hQZs1K-W5jzo4D3MUUYcC5U";
    console.log("Checking gemini-2.0-flash-exp-image-generation...");
    const genAI = new GoogleGenerativeAI(key);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp-image-generation" });

        // According to docs, image generation might need specific prompt handling or methods.
        // However, for 'generateContent' it typically returns a blob or uri. 
        // Let's try a simple prompt.
        const result = await model.generateContent("A cyberpunk city with neon lights, graphic novel style, high contrast, black and white");
        const response = await result.response;

        console.log("Response structure keys:", Object.keys(response));
        console.log("Response text (if any):", response.text().substring(0, 100));

        // Check for inline data
        if (result.response.candidates && result.response.candidates[0].content.parts[0].inlineData) {
            console.log("Success! Received inline image data.");
        } else {
            console.log("Response part JSON:", JSON.stringify(result.response.candidates[0].content.parts[0]));
        }

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Full Error Response:", JSON.stringify(error.response));
        }
    }
}

checkImageGen();
