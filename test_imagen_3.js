const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkImagen() {
    const key = "AIzaSyAMHRku5Sg0hQZs1K-W5jzo4D3MUUYcC5U";
    const genAI = new GoogleGenerativeAI(key);
    // Trying the explicit imagen model if available
    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

    const prompt = "A cyberpunk city, noir style.";

    console.log("Requesting imagen...");
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log("Success?", Object.keys(response));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkImagen();
