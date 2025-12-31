const { GoogleGenerativeAI } = require("@google/generative-ai");

async function check() {
    const key = "AIzaSyCLk6bEGJmj2Ta9hOepG_n1zlUWM3wPYGw";
    console.log("Testing Old Key:", key);
    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("Success! Response:", result.response.text());
    } catch (error) {
        console.error("Error:", error.message);
    }
}

check();
