import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyCLk6bEGJmj2Ta9hOepG_n1zlUWM3wPYGw";

async function run() {
    console.log("Testing Gemini API (gemini-1.5-flash)...");
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello.");
        const response = await result.response;
        console.log("SUCCESS:", response.text());
    } catch (e) {
        console.error("FAILED:");
        console.error(e);
    }
}

run();
