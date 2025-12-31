const { GoogleGenerativeAI } = require("@google/generative-ai");

async function check() {
    const key = "AQ.Ab8RN6JiupgInHU_4P2tD55AiYfEdkfuVAxxbednIb3WJ1jong";
    console.log("Testing Key:", key);
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
