const express = require('express');
const fs = require('fs/promises');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const projectId = req.body.projectId;
        const dir = `./files/projects/${projectId}`;
        fs.mkdir(dir, { recursive: true })
            .then(() => cb(null, dir))
            .catch(err => cb(err));
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/add-items', (req, res) => {
    res.sendFile(path.join(__dirname, 'add-items.html'));
});

app.get('/project-setup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'project-setup.html'));
});

// API endpoints
app.post('/api/save-json', async (req, res) => {
    try {
        await fs.writeFile('files/data/data.json', JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving JSON:', error);
        res.status(500).json({ error: 'Failed to save JSON' });
    }
});

app.post('/api/save-excel', async (req, res) => {
    try {
        const workbook = xlsx.utils.book_new();
        
        // Convert each category to worksheet
        Object.entries(req.body).forEach(([category, items]) => {
            const worksheet = xlsx.utils.json_to_sheet(items);
            xlsx.utils.book_append_sheet(workbook, worksheet, category);
        });
        
        xlsx.writeFile(workbook, 'files/data/Data.xlsx');
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving Excel:', error);
        res.status(500).json({ error: 'Failed to save Excel' });
    }
});

app.post('/api/save-partial', async (req, res) => {
    try {
        const { changes, data } = req.body;
        const excelPath = 'files/data/Data.xlsx';

        // Check if Excel file exists
        try {
            await fs.access(excelPath);
        } catch (error) {
            throw new Error(`Excel file not found or not accessible: ${excelPath}`);
        }

        // Read existing Excel file and column mappings
        const workbook = xlsx.readFile(excelPath, {
            cellStyles: true,
            cellDates: true
        });
        const columnMappings = require('./files/data/column.json');
        
        console.log('Processing changes:', changes);
        
        // Process each change
        for (const change of changes) {
            console.log('\nProcessing change:', change);
            
            const worksheet = workbook.Sheets[change.category];
            if (!worksheet) {
                console.log(`Worksheet ${change.category} not found`);
                continue;
            }

            // Get the range of the worksheet
            const range = xlsx.utils.decode_range(worksheet['!ref']);
            
            // Get the Excel column header for this key using the mapping
            const excelHeader = Object.entries(columnMappings[change.category])
                .find(([_, key]) => key === change.key)?.[0];
            
            if (!excelHeader) {
                console.log(`No mapping found for key: ${change.key}`);
                continue;
            }
            
            // Find the column letter for the key we want to update
            let targetCol = null;
            let targetRow = null;

            // Find the header row to get column position
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const headerCell = worksheet[xlsx.utils.encode_cell({r: 0, c: C})];
                if (headerCell && headerCell.v === excelHeader) {
                    targetCol = C;
                    break;
                }
            }

            // Find the row with matching sl_no
            if (targetCol !== null) {
                for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                    const idCell = worksheet[xlsx.utils.encode_cell({r: R, c: 0})];
                    if (idCell && String(idCell.v) === String(change.id)) {
                        targetRow = R;
                        break;
                    }
                }
            }

            // If we found both column and row, update the cell
            if (targetCol !== null && targetRow !== null) {
                const cellRef = xlsx.utils.encode_cell({r: targetRow, c: targetCol});
                
                // Handle different types of values
                let cellValue = change.value;
                if (!isNaN(change.value) && change.value !== '') {
                    cellValue = Number(change.value);
                }

                worksheet[cellRef] = {
                    t: typeof cellValue === 'number' ? 'n' : 's',
                    v: cellValue,
                    w: String(cellValue)
                };
            }
        }

        // Save Excel file
        console.log('Saving Excel file...');
        await writeExcelWithRetry(workbook, excelPath, {
            bookType: 'xlsx',
            cellStyles: true,
            cellDates: true
        });

        // Save JSON file with updated data
        console.log('Saving JSON file...');
        await fs.writeFile('files/data/data.json', JSON.stringify(data, null, 2));

        res.json({ success: true, message: 'Changes saved successfully' });
    } catch (error) {
        console.error('Error in save-partial:', error);
        res.status(500).json({ 
            error: 'Failed to save changes',
            details: error.message
        });
    }
});

// Add this new endpoint
app.get('/api/categories', async (req, res) => {
    try {
        const excelPath = 'files/data/Data.xlsx';
        
        // Check if Excel file exists
        try {
            await fs.access(excelPath);
        } catch (error) {
            throw new Error(`Excel file not found or not accessible: ${excelPath}`);
        }

        // Read Excel file
        const workbook = xlsx.readFile(excelPath, {
            cellStyles: true,
            cellDates: true
        });

        // Get all sheet names
        const categories = workbook.SheetNames;

        res.json({ categories });
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({ 
            error: 'Failed to get categories',
            details: error.message
        });
    }
});

app.post('/api/create-category', async (req, res) => {
    try {
        const { category, columns } = req.body;
        const excelPath = 'files/data/Data.xlsx';
        
        // Update column.json
        const columnData = require('./files/data/column.json');
        columnData[category] = columns;
        await fs.writeFile('./files/data/column.json', JSON.stringify(columnData, null, 2));

        // Update data.json
        const data = require('./files/data/data.json');
        if (!data[category]) {
            data[category] = [];
        }
        await fs.writeFile('./files/data/data.json', JSON.stringify(data, null, 2));

        // Update Excel file
        const workbook = xlsx.readFile(excelPath, {
            cellStyles: true,
            cellDates: true
        });

        // Create new worksheet with headers
        const headers = Object.keys(columns);
        const worksheet = xlsx.utils.aoa_to_sheet([headers]);
        
        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, category);

        // Save the Excel file
        xlsx.writeFile(workbook, excelPath, {
            bookType: 'xlsx',
            cellStyles: true,
            cellDates: true
        });

        res.json({ 
            success: true, 
            message: 'Category created successfully'
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ 
            error: 'Failed to create category',
            details: error.message
        });
    }
});

// Add this helper function at the top of server.js
async function writeExcelWithRetry(workbook, filePath, options, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            xlsx.writeFile(workbook, filePath, options);
            return;
        } catch (error) {
            if (i === maxRetries - 1) throw error; // Throw on last attempt
            if (error.code === 'EBUSY') {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error; // Throw immediately for other errors
        }
    }
}

// Modify the update-price endpoint
app.post('/api/update-price', async (req, res) => {
    try {
        const { category, slNo, key, value } = req.body;
        const excelPath = 'files/data/Data.xlsx';
        const jsonPath = './files/data/data.json';

        // 1. Update JSON Data
        const jsonData = await fs.readFile(jsonPath, 'utf8');
        const data = JSON.parse(jsonData);
        
        const jsonCategory = data[category];
        if (!jsonCategory) {
            throw new Error(`Category "${category}" not found in JSON data`);
        }

        const jsonItem = jsonCategory.find(item => String(item.sl_no_) === String(slNo));
        if (!jsonItem) {
            throw new Error(`Item with SL.NO. "${slNo}" not found in category "${category}"`);
        }

        // Update the JSON item
        jsonItem[key] = parseFloat(value);
        await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));

        // 2. Update Excel File
        let workbook;
        try {
            workbook = xlsx.readFile(excelPath, {
                cellStyles: true,
                cellDates: true
            });
        } catch (error) {
            throw new Error(`Failed to read Excel file: ${error.message}`);
        }
        
        const worksheet = workbook.Sheets[category];
        if (!worksheet) {
            throw new Error(`Worksheet for category "${category}" not found in Excel file`);
        }

        // Get column mappings
        const columnMappings = require('./files/data/column.json')[category];
        const excelHeader = Object.entries(columnMappings)
            .find(([_, k]) => k === key)?.[0];

        if (!excelHeader) {
            throw new Error(`Column mapping not found for key "${key}"`);
        }

        // Convert worksheet to JSON to find the row
        const wsData = xlsx.utils.sheet_to_json(worksheet);
        const rowIndex = wsData.findIndex(row => String(row['SL.NO.']) === String(slNo));
        
        if (rowIndex === -1) {
            throw new Error(`Row with SL.NO. "${slNo}" not found`);
        }

        // Find the column index
        const range = xlsx.utils.decode_range(worksheet['!ref']);
        let colIndex = -1;
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cell = worksheet[xlsx.utils.encode_cell({ r: 0, c: C })];
            if (cell && cell.v === excelHeader) {
                colIndex = C;
                break;
            }
        }

        if (colIndex === -1) {
            throw new Error(`Column "${excelHeader}" not found`);
        }

        // Update the cell (add 1 to rowIndex to account for header row)
        const cellRef = xlsx.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
        worksheet[cellRef] = { 
            t: 'n', 
            v: parseFloat(value),
            w: String(value)
        };

        // Save the Excel file with retry mechanism
        await writeExcelWithRetry(workbook, excelPath, {
            bookType: 'xlsx',
            cellStyles: true,
            cellDates: true
        });

        res.json({ 
            success: true,
            message: 'Price updated successfully in both JSON and Excel'
        });
    } catch (error) {
        console.error('Error updating price:', error);
        res.status(500).json({ 
            error: 'Failed to update price',
            details: error.message
        });
    }
});

// Project endpoints
app.get('/api/projects', async (req, res) => {
    try {
        // Create projects.json if it doesn't exist
        try {
            await fs.access('./files/data/projects.json');
        } catch {
            await fs.writeFile('./files/data/projects.json', '[]');
        }

        const data = await fs.readFile('./files/data/projects.json', 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error loading projects:', error);
        res.status(500).json({ error: 'Failed to load projects' });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        // Ensure directories exist
        await fs.mkdir('./files/data', { recursive: true });
        await fs.mkdir('./files/projects', { recursive: true });

        let projects = [];
        try {
            const data = await fs.readFile('./files/data/projects.json', 'utf8');
            projects = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        
        projects.push(req.body);
        await fs.writeFile('./files/data/projects.json', JSON.stringify(projects, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving project:', error);
        res.status(500).json({ error: 'Failed to save project' });
    }
});

app.post('/api/upload-project-files', upload.array('files'), async (req, res) => {
    try {
        // Ensure project directory exists
        const projectId = req.body.projectId;
        await fs.mkdir(`./files/projects/${projectId}`, { recursive: true });
        res.json({ success: true });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        const data = await fs.readFile('./files/data/projects.json', 'utf8');
        let projects = JSON.parse(data);
        projects = projects.filter(p => p.id !== req.params.id);
        await fs.writeFile('./files/data/projects.json', JSON.stringify(projects, null, 2));
        
        // Delete project files
        await fs.rm(`./files/projects/${req.params.id}`, { recursive: true, force: true });
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

app.post('/api/save-table', async (req, res) => {
    try {
        const { projectId, category, sectionName, quantity, tableData } = req.body;
        
        // Read current projects
        const projectsData = await fs.readFile('./files/data/projects.json', 'utf8');
        const projects = JSON.parse(projectsData);
        
        // Find the project
        const projectIndex = projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Initialize tables if needed
        if (!projects[projectIndex].tables) {
            projects[projectIndex].tables = {};
        }
        if (!projects[projectIndex].tables[category]) {
            projects[projectIndex].tables[category] = {
                columns: {},
                sections: []
            };
        }
        
        // Add or update section
        const section = {
            name: sectionName,
            quantity: parseInt(quantity) || 1,
            data: tableData
        };
        
        const sectionIndex = projects[projectIndex].tables[category].sections
            .findIndex(s => s.name === sectionName);
        
        if (sectionIndex >= 0) {
            projects[projectIndex].tables[category].sections[sectionIndex] = section;
        } else {
            projects[projectIndex].tables[category].sections.push(section);
        }
        
        // Save updated projects
        await fs.writeFile(
            './files/data/projects.json', 
            JSON.stringify(projects, null, 2)
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving table:', error);
        res.status(500).json({ error: 'Failed to save table' });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        console.log('Fetching project with ID:', req.params.id);
        const data = await fs.readFile('./files/data/projects.json', 'utf8');
        const projects = JSON.parse(data);
        console.log('All projects:', projects);
        const project = projects.find(p => p.id === req.params.id);
        console.log('Found project:', project);
        
        if (!project) {
            console.log('Project not found');
            return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json(project);
    } catch (error) {
        console.error('Error loading project:', error);
        res.status(500).json({ error: 'Failed to load project' });
    }
});

app.post('/api/update-columns', async (req, res) => {
    try {
        const { category, columns } = req.body;
        
        // Update column.json
        const columnData = require('./files/data/column.json');
        columnData[category] = columns;
        await fs.writeFile('./files/data/column.json', JSON.stringify(columnData, null, 2));

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating columns:', error);
        res.status(500).json({ error: 'Failed to update columns' });
    }
});

app.put('/api/projects/:id', async (req, res) => {
    try {
        const data = await fs.readFile('./files/data/projects.json', 'utf8');
        let projects = JSON.parse(data);
        const index = projects.findIndex(p => p.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Preserve existing metadata
        const existingProject = projects[index];
        const updatedProject = {
            ...existingProject,
            ...req.body,
            lastModified: new Date().toISOString()
        };
        
        projects[index] = updatedProject;
        await fs.writeFile('./files/data/projects.json', JSON.stringify(projects, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});