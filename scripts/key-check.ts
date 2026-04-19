import "dotenv/config";

const key = process.env.OPENAI_API_KEY || "";
console.log("length:", key.length);
console.log("first 8:", JSON.stringify(key.slice(0, 8)));
console.log("last 4:", JSON.stringify(key.slice(-4)));
console.log("has whitespace:", /\s/.test(key));
console.log("has quotes:", /["']/.test(key));
console.log("trailing CR:", key.endsWith("\r"));
