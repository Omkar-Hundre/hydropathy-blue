const xlsx = require("xlsx");
const fs = require("fs");

// Load the Excel file
const filePath = "../data/Data.xlsx";
const workbook = xlsx.readFile(filePath, { cellFormula: true }); // Load formulas
const columnFile = "../data/column.json";
const dataFile = "../data/data.json";

// Load existing column mapping
let columnMappings = {};
if (fs.existsSync(columnFile)) {
    columnMappings = JSON.parse(fs.readFileSync(columnFile, "utf-8"));
}

// Load existing data
let existingData = {};
if (fs.existsSync(dataFile)) {
    existingData = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
}

// Function to replace cell references with column keys
function replaceCellRefs(formula, columnKeys) {
    return formula.replace(/[A-Z]+\d+/g, (match) => {
        const colLetter = match.match(/[A-Z]+/)[0];
        const colNumber = xlsx.utils.decode_col(colLetter);
        return columnKeys[colNumber] ? columnKeys[colNumber] : match;
    });
}

// Extract data from sheets
const result = {};
workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const range = xlsx.utils.decode_range(sheet["!ref"]);
    const startRow = 1; // Fetching from the first row for all sheets
    const columnKeys = Object.values(columnMappings[sheetName] || {}); // Get column keys

    const sheetData = [];
    for (let row = startRow; row <= range.e.r; row++) {
        const firstCellAddress = xlsx.utils.encode_cell({ r: row, c: 0 });
        if (!sheet[firstCellAddress] || !sheet[firstCellAddress].v) continue; // Skip row if first cell is empty

        let rowData = {};
        columnKeys.forEach((colKey, colIndex) => {
            const cellAddress = xlsx.utils.encode_cell({ r: row, c: colIndex });
            if (sheet[cellAddress]) {
                let cellValue = sheet[cellAddress].f ? replaceCellRefs(sheet[cellAddress].f, columnKeys) : sheet[cellAddress].v;
                rowData[colKey] = cellValue;
            } else {
                rowData[colKey] = ""; // Ensure the key exists even if the cell is empty
            }
        });
        sheetData.push(rowData);
    }
    result[sheetName] = sheetData;
});

// Replace SUM functions after extraction
Object.keys(result).forEach(sheetName => {
    result[sheetName] = result[sheetName].map(row => {
        Object.keys(row).forEach(key => {
            if (typeof row[key] === "string") {
                row[key] = row[key]
                    .replace(/SUM\(rate:oth\)/g, "rate+m_c+drill+gr_ho+hc_pl+oth")
                    .replace(/SUM\(rate:tr\)/g, "rate+m_c+drill+tr");
            }
        });
        return row;
    });
});

// Merge with existing data
const updatedData = { ...existingData, ...result };

// Write to JSON file
fs.writeFileSync(dataFile, JSON.stringify(updatedData, null, 4));

console.log("Data extracted and saved to data.json");