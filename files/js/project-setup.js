class ProjectSetup {
    constructor() {
        this.projectId = new URLSearchParams(window.location.search).get('id');
        console.log('Initializing ProjectSetup with ID:', this.projectId);
        this.projectData = null;
        this.currentTable = null;
        this.columnMappings = null;
        this.searchResults = null;
        this.activeDescriptionInput = null;
        this.autoSaveTimeout = null;
        
        this.initializeElements();
        this.loadColumnMappings();
        this.loadProjectData();
        this.loadDataJson();
        this.setupEventListeners();
    }

    initializeElements() {
        console.log('Initializing elements...');
        // Project info elements
        this.projectInfoElements = {
            projectId: document.getElementById('projectId'),
            projectName: document.getElementById('projectName'),
            clientName: document.getElementById('clientName'),
            clientContact: document.getElementById('clientContact'),
            startDate: document.getElementById('startDate'),
            endDate: document.getElementById('endDate'),
            projectType: document.getElementById('projectType'),
            priorityLevel: document.getElementById('priorityLevel'),
            projectDescription: document.getElementById('projectDescription'),
            technicalRequirements: document.getElementById('technicalRequirements'),
            projectStatus: document.getElementById('projectStatus')
        };

        // Verify all elements are found
        Object.entries(this.projectInfoElements).forEach(([key, element]) => {
            if (!element) {
                console.error(`Element not found: ${key}`);
            }
        });

        // Table elements
        this.tableType = document.getElementById('tableType');
        this.createNewTable = document.getElementById('createNewTable');
        this.tableContainer = document.getElementById('tableContainer');
        this.tableHeaders = document.getElementById('tableHeaders');
        this.tableBody = document.getElementById('tableBody');
        this.addRow = document.getElementById('addRow');
        this.saveTable = document.getElementById('saveTable');
        this.manageColumns = document.getElementById('manageColumns');
        this.sectionName = document.getElementById('sectionName');
        this.sectionQuantity = document.getElementById('sectionQuantity');

        // Modal elements
        this.createTableModal = document.getElementById('createTableModal');
        this.closeTableModal = document.getElementById('closeTableModal');
        this.createTableForm = document.getElementById('createTableForm');
        this.cancelTableCreate = document.getElementById('cancelTableCreate');
        this.columnSelection = document.getElementById('columnSelection');

        // Column Management Modal
        this.columnModal = document.getElementById('columnModal');
        this.closeColumnModal = document.getElementById('closeColumnModal');
        this.availableColumns = document.getElementById('availableColumns');
        this.newColumnName = document.getElementById('newColumnName');
        this.newColumnKey = document.getElementById('newColumnKey');
        this.addCustomColumn = document.getElementById('addCustomColumn');
        this.cancelColumnManage = document.getElementById('cancelColumnManage');
        this.saveColumnChanges = document.getElementById('saveColumnChanges');

        // Create Table Modal elements
        this.columnSearch = document.getElementById('columnSearch');
        this.customColumnHeader = document.getElementById('customColumnHeader');
        this.customColumnKey = document.getElementById('customColumnKey');
        this.addCustomColumnBtn = document.getElementById('addCustomColumn');

        // Search Modal elements
        this.searchModal = document.getElementById('searchModal');
        this.modalSearchInput = document.getElementById('modalSearchInput');
        this.searchResults = document.getElementById('searchResults');
        this.closeSearchModal = document.getElementById('closeSearchModal');
    }

    setupEventListeners() {
        this.tableType.addEventListener('change', () => this.handleTableTypeChange());
        this.createNewTable.addEventListener('click', () => this.showCreateTableModal());
        this.closeTableModal.addEventListener('click', () => this.hideCreateTableModal());
        this.cancelTableCreate.addEventListener('click', () => this.hideCreateTableModal());
        this.createTableForm.addEventListener('submit', (e) => this.handleCreateTable(e));
        this.addRow.addEventListener('click', () => this.addNewRow());
        this.saveTable.addEventListener('click', () => this.saveTableChanges());

        // Column Management
        this.manageColumns.addEventListener('click', () => this.showColumnModal());
        this.closeColumnModal.addEventListener('click', () => this.hideColumnModal());
        this.cancelColumnManage.addEventListener('click', () => this.hideColumnModal());
        this.addCustomColumn.addEventListener('click', () => this.handleAddCustomColumn());
        this.saveColumnChanges.addEventListener('click', () => this.handleSaveColumnChanges());
        document.getElementById('columnSearchInput').addEventListener('input', (e) => this.handleColumnSearch(e));

        // Column search
        this.columnSearch.addEventListener('input', (e) => this.handleColumnSearch(e));
        this.addCustomColumnBtn.addEventListener('click', () => this.handleAddCustomTableColumn());

        // Search Modal
        this.closeSearchModal.addEventListener('click', () => this.hideSearchModal());
        this.modalSearchInput.addEventListener('input', () => this.handleModalSearch());
        
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.searchModal.contains(e.target) && 
                !e.target.matches('input[data-column="DESCRIPTION"]')) {
                this.hideSearchModal();
            }
        });
    }

    populateTableTypes() {
        // Clear existing options except the default one
        while (this.tableType.options.length > 1) {
            this.tableType.remove(1);
        }

        // Add options from column mappings
        Object.keys(this.columnMappings || {}).forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.replace(/-/g, ' ');
            this.tableType.appendChild(option);
        });
    }

    async loadColumnMappings() {
        try {
            const response = await fetch('/files/data/column.json');
            if (!response.ok) throw new Error('Failed to load column mappings');
            this.columnMappings = await response.json();
            this.populateTableTypes();
        } catch (error) {
            console.error('Error loading column mappings:', error);
            alert('Failed to load column mappings: ' + error.message);
        }
    }

    async loadProjectData() {
        try {
            const response = await fetch(`/api/projects/${this.projectId}`);
            if (!response.ok) throw new Error('Failed to load project');
            
            this.projectData = await response.json();
            
            // Initialize tables object if it doesn't exist
            if (!this.projectData.tables) {
                this.projectData.tables = {};
            }

            this.updateProjectInfo();
            
            // If there are tables with sections, load the first one
            const tables = this.projectData.tables;
            for (const [category, tableData] of Object.entries(tables)) {
                if (tableData.sections && tableData.sections.length > 0) {
                    // Select the category in dropdown
                    this.tableType.value = category;
                    
                    // Load the first section
                    const lastSection = tableData.sections[0];
                    this.sectionName.value = lastSection.name;
                    this.sectionQuantity.value = lastSection.quantity;
                    this.currentTable = [...lastSection.data];
                    
                    // Show and render the table
                    this.tableContainer.classList.remove('hidden');
                    this.renderTable(category);
                    break;
                }
            }
        } catch (error) {
            console.error('Error loading project:', error);
            alert('Failed to load project: ' + error.message);
        }
    }

    async loadDataJson() {
        try {
            const response = await fetch('/files/data/data.json');
            if (!response.ok) throw new Error('Failed to load data.json');
            this.searchResults = await response.json();
        } catch (error) {
            console.error('Error loading data.json:', error);
            alert('Failed to load item catalog. Please refresh the page.');
        }
    }

    updateProjectInfo() {
        console.log('Updating project info with data:', this.projectData);
        if (!this.projectData) return;
        
        // Map data keys to element IDs
        const dataMapping = {
            projectId: 'id',
            projectName: 'name',
            clientName: 'clientName',
            clientContact: 'clientContact',
            startDate: 'startDate',
            endDate: 'endDate',
            projectType: 'projectType',
            priorityLevel: 'priorityLevel',
            projectDescription: 'description',
            technicalRequirements: 'technicalRequirements',
            projectStatus: 'status'
        };
        
        Object.entries(this.projectInfoElements).forEach(([key, element]) => {
            if (!element) {
                console.error(`Element not found for ${key}`);
                return;
            }

            const value = this.projectData[dataMapping[key]];
            console.log(`Setting ${key}:`, value);

            if (key === 'startDate' || key === 'endDate') {
                const date = new Date(this.projectData[dataMapping[key]]);
                element.textContent = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } else if (key === 'projectType') {
                const type = this.projectData[dataMapping[key]] || 'Not Specified';
                element.textContent = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            } else {
                element.textContent = value || 'Not Specified';
            }
        });

        // Update status badge
        const statusElement = this.projectInfoElements.projectStatus;
        if (statusElement) {
            const status = this.projectData[dataMapping.projectStatus];
            statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            
            // Update status badge color
            const colors = {
                draft: 'bg-yellow-100 text-yellow-800',
                active: 'bg-green-100 text-green-800',
                completed: 'bg-blue-100 text-blue-800'
            };
            
            statusElement.className = `px-3 py-1 text-sm font-semibold rounded-full ${
                colors[status] || colors.draft
            }`;
        }
    }

    async handleTableTypeChange() {
        const category = this.tableType.value;
        if (!category) {
            this.tableContainer.classList.add('hidden');
            return;
        }

        try {
            // Initialize or update category columns if empty
            if (!this.projectData.tables) {
                this.projectData.tables = {};
            }
            
            if (!this.projectData.tables[category]) {
                this.projectData.tables[category] = {
                    columns: { ...this.columnMappings[category] },
                    sections: []
                };
            }

            // Check if there are existing sections for this category
            if (this.projectData.tables[category].sections.length > 0) {
                const lastSection = this.projectData.tables[category].sections[0];
                this.sectionName.value = lastSection.name;
                this.sectionQuantity.value = lastSection.quantity;
                this.currentTable = [...lastSection.data];
            } else {
                // Initialize empty table with first row
                const firstRow = {
                    'SL.NO.': '01',
                    ...Object.fromEntries(
                        Object.keys(this.projectData.tables[category].columns)
                        .filter(col => col !== 'SL.NO.')
                        .map(col => [col, ''])
                    )
                };
                this.currentTable = [firstRow];
            }

            this.renderTable(category);
            this.tableContainer.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading table data:', error);
            alert('Failed to initialize table: ' + error.message);
        }
    }

    renderTable(category) {
        if (!this.currentTable || !this.projectData.tables[category]) {
            console.error('No table data or category found');
            return;
        }

        const columns = Object.entries(this.projectData.tables[category].columns);
        
        // Render headers
        this.tableHeaders.innerHTML = `
            ${columns.map(([header, key]) => `
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ${header}
                </th>
            `).join('')}
            <th class="relative px-6 py-3">
                <span class="sr-only">Actions</span>
            </th>
        `;

        // Render body
        this.tableBody.innerHTML = this.currentTable.map((row, index) => `
            <tr>
                ${columns.map(([header, key]) => `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="table-cell-container">
                            <input type="text" 
                                   value="${row[header] || ''}"
                                   data-column="${header}"
                                   class="w-full px-2 py-1 border rounded"
                                   ${header === 'SL.NO.' ? 'readonly' : ''}
                                   onchange="projectSetup.handleCellChange(${index}, '${header}', this.value)">
                        </div>
                    </td>
                `).join('')}
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="projectSetup.deleteRow(${index})" 
                            class="text-red-600 hover:text-red-900">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');

        // Setup search suggestions for description fields
        const descrCells = this.tableBody.querySelectorAll('input[data-column="DESCRIPTION"]');
        descrCells.forEach(input => {
            this.setupSearchSuggestions(input, category);
        });
    }

    handleCellChange(rowIndex, column, value) {
        if (column === 'SL.NO.') return;
        
        if (!this.currentTable[rowIndex]) {
            this.currentTable[rowIndex] = {};
        }
        this.currentTable[rowIndex][column] = value;
        this.triggerAutoSave();
    }

    addNewRow() {
        const category = this.tableType.value;
        const nextSlNo = (this.currentTable.length + 1).toString().padStart(2, '0');

        const newRow = {
            'SL.NO.': nextSlNo,
            ...Object.fromEntries(
                Object.keys(this.projectData.tables[category].columns)
                .filter(col => col !== 'SL.NO.')
                .map(col => [col, ''])
            )
        };
        this.currentTable.push(newRow);
        this.renderTable(category);
        this.triggerAutoSave();
    }

    deleteRow(index) {
        if (confirm('Are you sure you want to delete this row?')) {
            this.currentTable.splice(index, 1);
            // Reorder SL.NO. after deletion
            this.currentTable.forEach((row, idx) => {
                row['SL.NO.'] = (idx + 1).toString().padStart(2, '0'); // Start from 01
            });
            this.renderTable(this.tableType.value);
            this.triggerAutoSave();
        }
    }

    triggerAutoSave() {
        // Clear existing timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Set new timeout for auto-save
        this.autoSaveTimeout = setTimeout(() => {
            this.saveTableChanges(true);
        }, 1000); // Auto-save after 1 second of inactivity
    }

    async saveTableChanges(isAutoSave = false) {
        try {
            const category = this.tableType.value;
            const sectionName = this.sectionName.value.trim();
            
            if (!category) {
                if (!isAutoSave) alert('Please select a table type');
                return;
            }
            if (!sectionName) {
                if (!isAutoSave) alert('Please enter a section name');
                return;
            }

            // Save current table data
            const section = {
                name: sectionName,
                quantity: parseInt(this.sectionQuantity.value) || 1,
                data: this.currentTable
            };

            // Update project data
            if (!this.projectData.tables[category]) {
                this.projectData.tables[category] = {
                    columns: {},
                    sections: []
                };
            }

            const sectionIndex = this.projectData.tables[category].sections
                .findIndex(s => s.name === sectionName);

            if (sectionIndex >= 0) {
                this.projectData.tables[category].sections[sectionIndex] = section;
            } else {
                this.projectData.tables[category].sections.push(section);
            }

            // Save to server
            const response = await fetch(`/api/projects/${this.projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.projectData)
            });

            if (!response.ok) {
                throw new Error('Failed to save table');
            }

            if (!isAutoSave) {
                alert('Table saved successfully!');
            }
        } catch (error) {
            console.error('Error saving table:', error);
            if (!isAutoSave) {
                alert('Error saving table: ' + error.message);
            }
        }
    }

    showCreateTableModal() {
        this.createTableModal.classList.remove('hidden');
        this.loadColumnSelection();
    }

    hideCreateTableModal() {
        this.createTableModal.classList.add('hidden');
        this.createTableForm.reset();
    }

    async handleCreateTable(event) {
        event.preventDefault();
        const tableName = document.getElementById('newTableName').value.trim();
        
        if (!tableName) {
            alert('Please enter a table name');
            return;
        }

        try {
            // Get selected columns
            const selectedColumns = {};
            const checkboxes = document.querySelectorAll('#columnSelection input[type="checkbox"]:checked');
            checkboxes.forEach(cb => {
                const columnName = cb.dataset.header;
                const columnKey = cb.dataset.key;
                selectedColumns[columnName] = columnKey;
            });

            if (Object.keys(selectedColumns).length === 0) {
                alert('Please select at least one column');
                return;
            }

            // Create new category
            const response = await fetch('/api/create-category', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: tableName,
                    columns: selectedColumns
                })
            });

            if (!response.ok) throw new Error('Failed to create table');

            // Update local data
            this.columnMappings[tableName] = selectedColumns;
            this.updateTableTypeOptions();

            // Select the new table
            this.tableType.value = tableName;
            this.handleTableTypeChange();

            this.hideCreateTableModal();
            alert('Table created successfully');
        } catch (error) {
            console.error('Error creating table:', error);
            alert('Failed to create table: ' + error.message);
        }
    }

    loadColumnSelection() {
        // Get all unique columns from existing categories
        const allColumns = new Set();
        Object.values(this.columnMappings).forEach(mapping => {
            Object.entries(mapping).forEach(([header, key]) => {
                allColumns.add({ header, key });
            });
        });

        // Render column selection
        this.columnSelection.innerHTML = Array.from(allColumns).map(({ header, key }) => `
            <div class="flex items-center space-x-2 p-2">
                <input type="checkbox" 
                       id="col_${key}"
                       data-header="${header}"
                       data-key="${key}"
                       class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                <label for="col_${key}" class="text-sm text-gray-700">
                    ${header}
                    <span class="text-xs text-gray-500">(${key})</span>
                </label>
            </div>
        `).join('');
    }

    showColumnModal() {
        const category = this.tableType.value;
        if (!category) {
            alert('Please select a table type first');
            return;
        }

        this.loadColumnManagement();
        this.columnModal.classList.remove('hidden');
    }

    hideColumnModal() {
        this.columnModal.classList.add('hidden');
        this.newColumnName.value = '';
        this.newColumnKey.value = '';
    }

    loadColumnManagement() {
        if (!this.columnMappings) {
            alert('Column mappings not loaded yet');
            return;
        }

        const category = this.tableType.value;
        const projectColumns = this.projectData.tables[category]?.columns || {};
        
        // Render columns
        this.availableColumns.innerHTML = Object.entries(projectColumns).map(([header, key]) => {
            return `
                <div class="column-item flex items-center justify-between p-2 border rounded-md">
                    <div class="flex items-center space-x-2">
                        <input type="checkbox" 
                               id="col_${key}"
                               data-header="${header}"
                               data-key="${key}"
                               checked
                               class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                        <label for="col_${key}" class="text-sm text-gray-700">
                            ${header}
                            <span class="text-xs text-gray-500">(${key})</span>
                        </label>
                    </div>
                    <button onclick="projectSetup.removeColumn(this)" 
                            data-header="${header}"
                            class="text-red-500 hover:text-red-700 text-sm px-2">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    removeColumn(button) {
        const header = button.dataset.header;
        const category = this.tableType.value;

        if (confirm(`Are you sure you want to remove the column "${header}"?`)) {
            // Remove from project data
            delete this.projectData.tables[category].columns[header];

            // Save project data
            fetch(`/api/projects/${this.projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.projectData)
            }).then(response => {
                if (!response.ok) throw new Error('Failed to save changes');
                
                // Update table display
                this.currentTable = [{
                    ...Object.fromEntries(Object.keys(this.projectData.tables[category].columns)
                        .map(col => [col, '']))
                }];
                this.renderTable(category);
                
                // Remove from modal
                button.closest('.column-item').remove();
            }).catch(error => {
                console.error('Error removing column:', error);
                alert('Failed to remove column: ' + error.message);
            });
        }
    }

    handleColumnSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const columnItems = this.availableColumns.querySelectorAll('.column-item');
        
        columnItems.forEach(item => {
            const header = item.querySelector('label').textContent.toLowerCase();
            if (header.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    handleAddCustomColumn() {
        const name = this.newColumnName.value.trim();
        const key = this.newColumnKey.value.trim();

        if (!name || !key) {
            alert('Please provide both column name and key');
            return;
        }

        // Validate key format
        if (!/^[a-z][a-z0-9_]*$/.test(key)) {
            alert('Key must start with lowercase letter and contain only lowercase letters, numbers, and underscores');
            return;
        }

        const category = this.tableType.value;
        if (!category) {
            alert('Please select a table type first');
            return;
        }

        // Check if column already exists
        if (this.projectData.tables[category].columns[name]) {
            alert('A column with this name already exists');
            return;
        }

        // Add to project data
        this.projectData.tables[category].columns[name] = key;

        // Save project data
        fetch(`/api/projects/${this.projectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.projectData)
        }).then(response => {
            if (!response.ok) throw new Error('Failed to save column');
            
            // Update table display
            this.currentTable = [{
                ...Object.fromEntries(Object.keys(this.projectData.tables[category].columns)
                    .map(col => [col, '']))
            }];
            this.renderTable(category);
            
            // Clear inputs
            this.newColumnName.value = '';
            this.newColumnKey.value = '';
            
            // Refresh column management modal
            this.loadColumnManagement();
        }).catch(error => {
            console.error('Error saving column:', error);
            alert('Failed to add column: ' + error.message);
        });
    }

    async handleSaveColumnChanges() {
        const category = this.tableType.value;
        const selectedColumns = {};
        const checkboxes = this.availableColumns.querySelectorAll('input[type="checkbox"]:checked');
        
        checkboxes.forEach(cb => {
            const header = cb.dataset.header;
            const key = cb.dataset.key;
            selectedColumns[header] = key;
        });

        try {
            // Initialize category in project tables if not exists
            if (!this.projectData.tables[category]) {
                this.projectData.tables[category] = {
                    columns: {},
                    sections: []
                };
            }
            
            // Update project's table columns
            this.projectData.tables[category].columns = selectedColumns;

            // Save project data
            const response = await fetch(`/api/projects/${this.projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.projectData)
            });

            if (!response.ok) throw new Error('Failed to save column changes');

            this.renderTable(category);
            this.hideColumnModal();
            alert('Column changes saved successfully');
        } catch (error) {
            console.error('Error saving column changes:', error);
            alert('Failed to save column changes');
        }
    }

    handleAddCustomTableColumn() {
        const header = this.customColumnHeader.value.trim();
        const key = this.customColumnKey.value.trim();

        if (!header || !key) {
            alert('Please provide both column name and key');
            return;
        }

        // Add to column selection
        const columnDiv = document.createElement('div');
        columnDiv.className = 'flex items-center space-x-2 p-2';
        columnDiv.innerHTML = `
            <input type="checkbox" 
                   id="col_${key}"
                   data-header="${header}"
                   data-key="${key}"
                   checked
                   class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
            <label for="col_${key}" class="text-sm text-gray-700">
                ${header}
                <span class="text-xs text-gray-500">(${key})</span>
            </label>
        `;
        this.columnSelection.appendChild(columnDiv);

        // Clear inputs
        this.customColumnHeader.value = '';
        this.customColumnKey.value = '';
    }

    setupSearchSuggestions(input, category) {
        // Create a container for the input cell
        const cellContainer = document.createElement('div');
        cellContainer.className = 'table-cell-container';
        input.parentNode.appendChild(cellContainer);
        cellContainer.appendChild(input);

        const searchContainer = document.createElement('div');
        searchContainer.className = 'quick-search-suggestions hidden';
        cellContainer.appendChild(searchContainer);

        // Show catalog when focusing on input
        input.addEventListener('focus', () => {
            this.activeDescriptionInput = input;
            this.showSearchModal();
        });

        input.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.activeDescriptionInput = input;

            // Show quick suggestions
            if (searchTerm.length < 2) {
                searchContainer.classList.add('hidden');
                this.renderSearchResults(searchTerm);
                return;
            }

            const suggestions = this.getSearchSuggestions(searchTerm);
            if (suggestions.length > 0) {
                searchContainer.innerHTML = suggestions.map(item => `
                    <div class="suggestion-item p-2 hover:bg-gray-100 cursor-pointer text-sm">
                        <div class="font-medium">${item.descr}</div>
                        <div class="text-xs text-gray-500">Category: ${item.category}</div>
                    </div>
                `).join('');
                searchContainer.classList.remove('hidden');

                // Add click handlers for suggestions
                searchContainer.querySelectorAll('.suggestion-item').forEach((item, index) => {
                    item.addEventListener('click', () => {
                        const suggestion = suggestions[index];
                        this.applySuggestion(input, suggestion, category);
                        searchContainer.classList.add('hidden');
                    });
                });
            } else {
                searchContainer.classList.add('hidden');
            }

            // Update catalog modal
            this.renderSearchResults(searchTerm);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!cellContainer.contains(e.target)) {
                searchContainer.classList.add('hidden');
            }
        });
    }

    getSearchSuggestions(searchTerm) {
        if (!this.searchResults) return [];
        
        const suggestions = [];
        Object.entries(this.searchResults).forEach(([category, items]) => {
            items.filter(item => item.descr).forEach(item => {
                if (item.descr && item.descr.toLowerCase().includes(searchTerm)) {
                    suggestions.push({
                        ...item,
                        category
                    });
                }
            });
        });
        return suggestions.slice(0, 5); // Limit to 5 suggestions
    }

    showSearchModal() {
        this.searchModal.classList.remove('hidden');
        // Get current search term from active input
        const searchTerm = this.activeDescriptionInput ? this.activeDescriptionInput.value : '';
        this.renderSearchResults(searchTerm);
    }

    hideSearchModal() {
        this.searchModal.classList.add('hidden');
    }

    handleModalSearch() {
        const searchTerm = this.modalSearchInput.value.toLowerCase();
        this.renderSearchResults(searchTerm);
    }

    renderSearchResults(searchTerm = '') {
        if (!this.searchResults) return;
        
        let html = '';
        
        Object.entries(this.searchResults).forEach(([category, items]) => {
            const filteredItems = items.filter(item => 
                item.descr && (!searchTerm || item.descr.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            
            if (filteredItems.length > 0) {
                html += `
                    <div class="category-section">
                        <div class="category-header">
                            <i class="fas fa-folder-open mr-2"></i>
                            ${category}
                        </div>
                        <div class="item-list">
                            ${filteredItems.map(item => `
                                <div class="item-entry" onclick="projectSetup.applyItemFromModal('${category}', ${JSON.stringify(item).replace(/"/g, '&quot;')})">
                                    <i class="fas fa-file-alt mr-2 text-gray-400"></i>
                                    ${item.descr}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        });
        
        const searchResultsDiv = document.getElementById('searchResults');
        searchResultsDiv.innerHTML = html || '<div class="p-4 text-gray-500 text-center">No items found</div>';
    }

    applyItemFromModal(category, item) {
        if (this.activeDescriptionInput) {
            const tableCategory = this.tableType.value;
            this.applySuggestion(this.activeDescriptionInput, item, tableCategory);
        }
        this.hideSearchModal();
    }

    applySuggestion(input, suggestion, category) {
        const row = input.closest('tr');
        const rowIndex = Array.from(row.parentNode.children).indexOf(row);

        // Map suggestion data to current table columns
        Object.entries(this.projectData.tables[category].columns).forEach(([header, key]) => {
            if (header !== 'SL.NO.' && suggestion[key]) {
                const cell = row.querySelector(`input[data-column="${header}"]`);
                if (cell) {
                    cell.value = suggestion[key];
                    this.handleCellChange(rowIndex, header, suggestion[key]);
                }
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.projectSetup = new ProjectSetup();
}); 