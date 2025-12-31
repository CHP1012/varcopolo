const { GoogleGenerativeAI } = require("@google/generative-ai");

async function check() {
    const key = "AIzaSyAMHRku5Sg0hQZs1K-W5jzo4D3MUUYcC5U";
    console.log("Checking gemini-2.0-flash with key...");
    const genAI = new GoogleGenerativeAI(key);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Hello 2.0");
        console.log("Success! Response:", result.response.text());
    } catch (error) {
        console.error("Error:", error.message);
    }
}

check();
