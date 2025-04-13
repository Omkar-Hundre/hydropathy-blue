const xlsx = require("xlsx");
const fs = require("fs");

// Function to generate key-value pairs from column names
function generateKeys(columns) {
    return columns.reduce((acc, col) => {
        if (col) {
            // Remove .substring(0,5) to keep full sanitized names
            const key = String(col)
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "_");
            acc[col] = key;
        }
        return acc;
    }, {});
}

// Load the Excel file
const filePath = "../data/Data.xlsx";
const workbook = xlsx.readFile(filePath);
const outputFile = "../data/column.json";

// Load existing JSON data if available
let existingData = {};
if (fs.existsSync(outputFile)) {
    existingData = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
}

// Extract column names from the first row for every sheet
const result = {};
workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const range = xlsx.utils.decode_range(sheet["!ref"]);
    const rowNumber = 0; // Fetching from the first row (index 0) for all sheets

    if (range.e.r >= rowNumber) {
        const columns = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = xlsx.utils.encode_cell({ r: rowNumber, c: col });
            if (sheet[cellAddress] && sheet[cellAddress].v) {
                columns.push(sheet[cellAddress].v);
            }
        }
        
        result[sheetName] = generateKeys(columns);
    }
});

// Merge with existing data
const updatedData = { ...existingData, ...result };

// Write to JSON file
fs.writeFileSync(outputFile, JSON.stringify(updatedData, null, 4));

console.log("Column names extracted and saved to column.json");
