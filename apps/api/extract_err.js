const fs = require('fs');
const content = fs.readFileSync('final_api.txt', 'utf16le');
const match = content.match(/Join failed(?:.*?)\{([\s\S]*?)\}/);
console.log(match ? "{" + match[1] + "}" : "Not found");
