
const fs = require('fs');
const content = fs.readFileSync('c:/Users/juani/OneDrive/Desktop/ndvi/riverterrace-main/riverterrace-main/index.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
    try {
        new Function(scriptMatch[1]);
        console.log("Syntax check PASSED");
    } catch (e) {
        console.error("Syntax check FAILED:", e.message);
        // Try to find the approximate line number
        const lines = scriptMatch[1].split('\n');
        console.error("Error at script line (approx):", e.stack);
    }
} else {
    console.log("No <script> tag found");
}
