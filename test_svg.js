const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testSvgGen() {
    const key = "AIzaSyAMHRku5Sg0hQZs1K-W5jzo4D3MUUYcC5U";
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    You are an AI artist specializing in Retro/Sci-Fi aesthetics.
    Generate a SCALABLE VECTOR GRAPHIC (SVG) code representing: "A futuristic city skyline at night with neon lights".
    
    Constraints:
    - Use a dark background (#0f0f0f).
    - Use neon colors (cyan, magenta, yellow).
    - Minimalist, wireframe or flat style.
    - Return ONLY the raw SVG string, starting with <svg> and ending with </svg>. No markdown block.
  `;

    try {
        const result = await model.generateContent(prompt);
        console.log(result.response.text());
    } catch (error) {
        console.error("Error:", error);
    }
}

testSvgGen();
