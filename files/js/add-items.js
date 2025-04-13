class ItemManager {
    constructor() {
        this.data = null;
        this.columns = null;
        this.currentCategory = '';
        this.isEditing = false;
        this.categories = [];
        this.allUniqueColumns = [];
        this.customColumns = new Set(); // To store custom columns
        this.selectedColumns = new Set(); // Add this to track selected columns
        this.itemSearch = document.getElementById('itemSearch');
        this.filteredItems = null;
        
        // Initialize elements first
        this.initializeElements();
        
        // Then set up event listeners
        this.setupEventListeners();
        
        // Finally load data
        this.loadData();
    }

    initializeElements() {
        // Form elements
        this.categorySelect = document.getElementById('categorySelect');
        this.dynamicFields = document.getElementById('dynamicFields');
        this.addItemForm = document.getElementById('addItemForm');
        
        // Edit section elements
        this.editCategorySelect = document.getElementById('editCategorySelect');
        this.itemsTable = document.getElementById('itemsTable');
        this.editToggle = document.getElementById('editToggle');
        this.saveChanges = document.getElementById('saveChanges');
        
        // Formula help elements
        this.formulaHelpModal = document.getElementById('formulaHelpModal');
        this.showFormulaHelp = document.getElementById('showFormulaHelp');
        this.closeFormulaHelp = document.getElementById('closeFormulaHelp');
        this.formulaHelpContent = document.getElementById('formulaHelpContent');

        // Category creation elements
        this.createCategoryModal = document.getElementById('createCategoryModal');
        this.createCategoryBtn = document.getElementById('createCategory');
        this.closeCategoryModal = document.getElementById('closeCategoryModal');
        this.cancelCategory = document.getElementById('cancelCategory');
        this.createCategoryForm = document.getElementById('createCategoryForm');
        this.columnSelectionBody = document.getElementById('columnSelectionBody');
        this.headerSearch = document.getElementById('headerSearch');

        // Custom column elements
        this.customColumnHeader = document.getElementById('customColumnHeader');
        this.customColumnKey = document.getElementById('customColumnKey');
        this.addCustomColumnBtn = document.getElementById('addCustomColumn');

        // Verify all elements are found
        if (!this.createCategoryModal || !this.createCategoryBtn) {
            console.error('Category creation elements not found');
        }

        this.itemSearch = document.getElementById('itemSearch');

        // Export elements
        this.exportCategory = document.getElementById('exportCategory');
        this.exportCategoryExcel = document.getElementById('exportCategoryExcel');
        this.exportCategoryPdf = document.getElementById('exportCategoryPdf');
        this.exportAllExcel = document.getElementById('exportAllExcel');
        this.exportAllPdf = document.getElementById('exportAllPdf');
    }

    setupEventListeners() {
        // Existing listeners
        this.categorySelect.addEventListener('change', () => this.handleCategoryChange());
        this.editCategorySelect.addEventListener('change', () => this.handleEditCategoryChange());
        this.addItemForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.editToggle.addEventListener('click', () => this.toggleEditMode());
        this.saveChanges.addEventListener('click', () => this.saveTableChanges());
        this.showFormulaHelp.addEventListener('click', () => this.toggleFormulaHelp(true));
        this.closeFormulaHelp.addEventListener('click', () => this.toggleFormulaHelp(false));

        // Category creation listeners
        this.createCategoryBtn.addEventListener('click', () => {
            console.log('Create category button clicked');
            this.showCreateCategoryModal();
        });
        this.closeCategoryModal.addEventListener('click', () => this.toggleCreateCategoryModal(false));
        this.cancelCategory.addEventListener('click', () => this.toggleCreateCategoryModal(false));
        this.createCategoryForm.addEventListener('submit', (e) => this.handleCreateCategory(e));
        this.headerSearch.addEventListener('input', () => this.filterHeaders());

        // Custom column listener
        this.addCustomColumnBtn.addEventListener('click', () => this.addCustomColumn());

        this.itemSearch.addEventListener('input', () => this.handleItemSearch());

        // Export listeners
        this.exportCategoryExcel.addEventListener('click', () => this.handleExportCategory('excel'));
        this.exportCategoryPdf.addEventListener('click', () => this.handleExportCategory('pdf'));
        this.exportAllExcel.addEventListener('click', () => this.handleExportAll('excel'));
        this.exportAllPdf.addEventListener('click', () => this.handleExportAll('pdf'));
    }

    async loadData() {
        try {
            const [dataResponse, columnsResponse, categoriesResponse] = await Promise.all([
                fetch('/files/data/data.json'),
                fetch('/files/data/column.json'),
                fetch('/api/categories')
            ]);
            
            this.data = await dataResponse.json();
            this.columns = await columnsResponse.json();
            const { categories } = await categoriesResponse.json();

            // Merge categories from both Excel and JSON
            this.categories = Array.from(new Set([
                ...Object.keys(this.data),
                ...categories
            ]));
            
            // Update category select options
            this.updateCategorySelects();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    updateCategorySelects() {
        // Update both category select elements
        [this.categorySelect, this.editCategorySelect].forEach(select => {
            // Keep the default option
            select.innerHTML = '<option value="">Select a category</option>';
            
            // Add all categories from data
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category.replace(/-/g, ' '); // Format display text
                select.appendChild(option);
            });
        });

        // Update export category select
        this.exportCategory.innerHTML = `
            <option value="">Export Category...</option>
            ${this.categories.map(category => `
                <option value="${category}">${category}</option>
            `).join('')}
        `;
    }

    handleCategoryChange() {
        const category = this.categorySelect.value;
        if (!category) return;

        const columnData = this.columns[category];
        this.dynamicFields.innerHTML = '';

        Object.entries(columnData).forEach(([label, key]) => {
            const field = this.createInputField(label, key);
            if (field) {
                this.dynamicFields.appendChild(field);
            }
        });

        this.updateFormulaHelp(category);
    }

    createInputField(label, key) {
        if (key === 'sl_no') return null;

        const div = document.createElement('div');
        div.innerHTML = `
            <label class="block text-sm font-medium text-gray-700 mb-2">
                ${label}
            </label>
            <input type="text" name="${key}" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
        `;
        return div;
    }

    updateFormulaHelp(category) {
        const columnData = this.columns[category];
        this.formulaHelpContent.innerHTML = '';

        Object.entries(columnData).forEach(([label, key]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">${label}</td>
                <td class="px-6 py-4 whitespace-nowrap font-mono">${key}</td>
            `;
            this.formulaHelpContent.appendChild(row);
        });
    }

    toggleFormulaHelp(show) {
        this.formulaHelpModal.classList.toggle('hidden', !show);
    }

    handleEditCategoryChange() {
        const category = this.editCategorySelect.value;
        if (!category) return;

        this.currentCategory = category;
        this.renderTable();
    }

    renderTable() {
        if (!this.currentCategory) return;

        const items = this.filteredItems || this.data[this.currentCategory];
        const columns = this.columns[this.currentCategory];

        // Render headers
        const headerRow = Object.keys(columns).map(label => {
            const isSlNo = columns[label] === 'sl_no';
            return `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${isSlNo ? 'fixed-column' : 'min-w-column'} ${isSlNo ? 'bg-gray-50' : ''}">
                ${label}
            </th>`;
        }).join('');
        
        this.itemsTable.querySelector('thead').innerHTML = `<tr>${headerRow}</tr>`;

        // Render body
        const tbody = this.itemsTable.querySelector('tbody');
        tbody.innerHTML = items.map(item => {
            const cells = Object.entries(columns).map(([label, key]) => {
                const value = item[key] || '';
                const isSlNo = key === 'sl_no';
                const cellClass = isSlNo ? 'fixed-column' : 'min-w-column';
                const bgClass = isSlNo ? 'bg-white' : '';
                
                return this.isEditing 
                    ? `<td class="px-6 py-4 ${cellClass} ${bgClass}">
                        <input type="text" value="${value}" 
                        class="w-full px-2 py-1 border border-gray-300 rounded"
                        data-key="${key}"
                        ${isSlNo ? 'readonly' : ''}>
                       </td>`
                    : `<td class="px-6 py-4 ${cellClass} ${bgClass}">${value}</td>`;
            }).join('');
            return `<tr data-id="${item.sl_no}">${cells}</tr>`;
        }).join('');

        // If no items found after search
        if (this.filteredItems && this.filteredItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${Object.keys(columns).length}" class="px-6 py-4 text-center text-gray-500">
                        No items found matching your search
                    </td>
                </tr>
            `;
        }
    }

    toggleEditMode() {
        this.isEditing = !this.isEditing;
        this.editToggle.classList.toggle('hidden');
        this.saveChanges.classList.toggle('hidden');
        this.renderTable();
    }

    async saveTableChanges() {
        const rows = this.itemsTable.querySelectorAll('tbody tr');
        const changes = [];

        rows.forEach(row => {
            const itemId = row.dataset.id;
            const inputs = row.querySelectorAll('input');

            inputs.forEach(input => {
                const key = input.dataset.key;
                const newValue = input.value.trim();
                const originalItem = this.data[this.currentCategory]
                    .find(i => String(i.sl_no) === String(itemId)); // Ensure string comparison
                const originalValue = String(originalItem?.[key] || ''); // Convert to string for comparison

                // Only add to changes if the value is actually different
                if (newValue !== originalValue) {
                    console.log('Change detected:', {
                        category: this.currentCategory,
                        id: itemId,
                        key: key,
                        value: newValue,
                        originalValue: originalValue
                    });

                    changes.push({
                        category: this.currentCategory,
                        id: itemId,
                        key: key,
                        value: newValue
                    });

                    // Update the data in memory immediately
                    if (originalItem) {
                        originalItem[key] = newValue;
                    }
                }
            });
        });

        if (changes.length === 0) {
            alert('No changes detected');
            this.toggleEditMode();
            return;
        }

        try {
            const response = await fetch('/api/save-partial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    changes: changes,
                    data: this.data // Send the entire updated data object
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save changes');
            }

            const responseData = await response.json();
            console.log('Server response:', responseData);
            
            this.toggleEditMode();
            alert('Changes saved successfully!');
        } catch (error) {
            console.error('Error saving changes:', error);
            alert('Error saving changes. Please try again.');
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(this.addItemForm);
        let newItem = Object.fromEntries(formData);
        
        try {
            // Get the current category's items
            const categoryItems = this.data[this.categorySelect.value];
            
            // Find the highest sl_no and increment by 1
            const maxSlNo = categoryItems.reduce((max, item) => {
                const currentSlNo = parseInt(item.sl_no) || 0;
                return currentSlNo > max ? currentSlNo : max;
            }, 0);
            
            // Create new item with sl_no first
            newItem = {
                sl_no: String(maxSlNo + 1).padStart(2, '0'),
                ...newItem
            };
            
            // Save using the partial changes method
            const changes = [{
                category: this.categorySelect.value,
                id: newItem.sl_no,
                isNewItem: true,
                fullItem: newItem
            }];

            const response = await this.savePartialChanges(changes);
            const responseData = await response.json();

            if (responseData.success) {
                // Only add to local data after successful server save
                categoryItems.push(newItem);
                
                alert('Item added successfully!');
                this.addItemForm.reset();
                
                // Refresh the table if we're on the same category
                if (this.editCategorySelect.value === this.categorySelect.value) {
                    this.renderTable();
                }
            } else {
                throw new Error(responseData.error || 'Failed to save item');
            }
        } catch (error) {
            console.error('Error adding item:', error);
            alert('Error adding item. Please try again.');
        }
    }

    toggleCreateCategoryModal(show) {
        console.log('Toggling modal:', show);
        if (this.createCategoryModal) {
            this.createCategoryModal.classList.toggle('hidden', !show);
        } else {
            console.error('Create category modal not found');
        }
    }

    getAllUniqueColumns() {
        const uniqueColumns = new Map();
        
        // Get columns from all categories
        Object.entries(this.columns).forEach(([category, columns]) => {
            Object.entries(columns).forEach(([header, key]) => {
                // If this key doesn't exist or the header is different, add it
                if (!uniqueColumns.has(key)) {
                    uniqueColumns.set(key, { header, key, categories: new Set() });
                }
                uniqueColumns.get(key).categories.add(category);
            });
        });

        return Array.from(uniqueColumns.values());
    }

    showCreateCategoryModal() {
        console.log('Showing create category modal');
        const uniqueColumns = this.getAllUniqueColumns();
        this.allUniqueColumns = uniqueColumns;
        this.selectedColumns.clear(); // Clear previous selections
        this.renderColumnSelectionTable(uniqueColumns);
        this.toggleCreateCategoryModal(true);
    }

    renderColumnSelectionTable(columns) {
        // Store currently selected columns before re-rendering
        const checkedBoxes = this.columnSelectionBody.querySelectorAll('input[type="checkbox"]:checked');
        this.selectedColumns.clear();
        checkedBoxes.forEach(checkbox => {
            this.selectedColumns.add(checkbox.value);
        });

        this.columnSelectionBody.innerHTML = columns.map(col => {
            const categoriesUsedIn = Array.from(col.categories).join(', ');
            const isCustom = this.customColumns.has(col.key);
            const isChecked = isCustom || this.selectedColumns.has(`${col.header}|${col.key}`);
            
            return `
                <tr class="header-row ${isCustom ? 'bg-green-50' : ''}">
                    <td class="px-4 py-2 text-center">
                        <input type="checkbox" name="columns" value="${col.header}|${col.key}" 
                               class="rounded border-gray-300"
                               ${isChecked ? 'checked' : ''}>
                    </td>
                    <td class="px-4 py-2">${col.header}</td>
                    <td class="px-4 py-2">${col.key}</td>
                    <td class="px-4 py-2 text-sm text-gray-500">
                        ${isCustom ? 'Custom Column' : `Used in: ${categoriesUsedIn}`}
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterHeaders() {
        const searchTerm = this.headerSearch.value.toLowerCase();
        
        const filteredColumns = this.allUniqueColumns.filter(col => 
            col.header.toLowerCase().includes(searchTerm) || 
            col.key.toLowerCase().includes(searchTerm)
        );

        this.renderColumnSelectionTable(filteredColumns);
    }

    addCustomColumn() {
        const header = this.customColumnHeader.value.trim();
        const key = this.customColumnKey.value.trim().toLowerCase();

        if (!header || !key) {
            alert('Please enter both column name and key');
            return;
        }

        // Check if key already exists
        if (this.allUniqueColumns.some(col => col.key === key)) {
            alert('This key already exists. Please use a different key.');
            return;
        }

        // Add to unique columns
        const newColumn = {
            header,
            key,
            categories: new Set(),
            isCustom: true
        };

        this.allUniqueColumns.push(newColumn);
        this.customColumns.add(key);
        this.selectedColumns.add(`${header}|${key}`); // Add new column to selected set

        // Clear inputs
        this.customColumnHeader.value = '';
        this.customColumnKey.value = '';

        // Refresh table
        this.renderColumnSelectionTable(this.allUniqueColumns);
    }

    async handleCreateCategory(e) {
        e.preventDefault();
        
        const categoryName = document.getElementById('newCategoryName').value.trim();
        if (!categoryName) {
            alert('Please enter a category name');
            return;
        }

        // Get selected columns
        const selectedColumns = {};
        const checkboxes = this.columnSelectionBody.querySelectorAll('input[type="checkbox"]:checked');
        
        checkboxes.forEach(checkbox => {
            const [header, key] = checkbox.value.split('|');
            selectedColumns[header] = key;
        });

        if (Object.keys(selectedColumns).length === 0) {
            alert('Please select at least one column');
            return;
        }

        try {
            // Create new category structure
            const newCategory = {
                category: categoryName,
                columns: selectedColumns
            };

            // Send to server
            const response = await fetch('/api/create-category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCategory)
            });

            if (!response.ok) {
                throw new Error('Failed to create category');
            }

            // Update local data
            this.columns[categoryName] = selectedColumns;
            this.data[categoryName] = [];
            this.categories.push(categoryName);
            
            // Update UI
            this.updateCategorySelects();
            this.toggleCreateCategoryModal(false);
            alert('Category created successfully!');
            
            // Select the new category
            this.categorySelect.value = categoryName;
            this.handleCategoryChange();
        } catch (error) {
            console.error('Error creating category:', error);
            alert('Failed to create category. Please try again.');
        }
    }

    handleItemSearch() {
        const searchTerm = this.itemSearch.value.toLowerCase();
        if (!this.currentCategory) return;

        const items = this.data[this.currentCategory];
        
        if (!searchTerm) {
            this.filteredItems = null;
            this.renderTable();
            return;
        }

        this.filteredItems = items.filter(item => 
            Object.entries(item).some(([key, value]) => 
                String(value).toLowerCase().includes(searchTerm)
            )
        );

        this.renderTable();
    }

    handleExportCategory(type) {
        const category = this.exportCategory.value;
        if (!category) {
            alert('Please select a category to export');
            return;
        }

        if (type === 'excel') {
            this.exportCategoryToExcel(category);
        } else {
            this.exportCategoryToPdf(category);
        }
    }

    handleExportAll(type) {
        if (type === 'excel') {
            this.exportAllToExcel();
        } else {
            this.exportAllToPdf();
        }
    }

    exportCategoryToExcel(category) {
        const items = this.data[category];
        const columns = this.columns[category];
        
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(items.map(item => {
            const row = {};
            Object.entries(columns).forEach(([header, key]) => {
                row[header] = item[key];
            });
            return row;
        }));
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, category);
        
        // Save file
        XLSX.writeFile(wb, `${category}_data.xlsx`);
    }

    exportAllToExcel() {
        const wb = XLSX.utils.book_new();
        
        Object.entries(this.data).forEach(([category, items]) => {
            const columns = this.columns[category];
            
            // Create worksheet for each category
            const ws = XLSX.utils.json_to_sheet(items.map(item => {
                const row = {};
                Object.entries(columns).forEach(([header, key]) => {
                    row[header] = item[key];
                });
                return row;
            }));
            
            XLSX.utils.book_append_sheet(wb, ws, category);
        });
        
        // Save file
        XLSX.writeFile(wb, 'complete_database.xlsx');
    }

    exportCategoryToPdf(category) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape mode for more columns
        
        // Add header
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 139);
        doc.text('COSEM', doc.internal.pageSize.width / 2, 20, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setTextColor(100);
        doc.text(category, doc.internal.pageSize.width / 2, 30, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width / 2, 37, { align: 'center' });
        
        // Prepare table data
        const columns = this.columns[category];
        const items = this.data[category];
        
        // Create table
        doc.autoTable({
            startY: 45,
            head: [Object.keys(columns)],
            body: items.map(item => Object.values(columns).map(key => item[key])),
            theme: 'grid',
            headStyles: {
                fillColor: [0, 0, 139],
                textColor: 255,
                fontSize: 8
            },
            styles: {
                fontSize: 7,
                cellPadding: 2
            },
            columnStyles: Object.fromEntries(
                Object.keys(columns).map((_, i) => [i, { cellWidth: 'auto' }])
            )
        });
        
        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height;
            
            doc.text('COSEM', pageSize.width / 2, pageHeight - 15, { align: 'center' });
            doc.text('Contact: +91-8625807046 | Email: hundreomkar7@gmail.com', pageSize.width / 2, pageHeight - 10, { align: 'center' });
            doc.text(`Page ${i} of ${pageCount}`, pageSize.width / 2, pageHeight - 5, { align: 'center' });
        }
        
        // Save file
        doc.save(`${category}_data.pdf`);
    }

    exportAllToPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        // Add header
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 139);
        doc.text('COSEM', doc.internal.pageSize.width / 2, 20, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setTextColor(100);
        doc.text('Complete Database', doc.internal.pageSize.width / 2, 30, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width / 2, 37, { align: 'center' });
        
        let startY = 45;
        
        Object.entries(this.data).forEach(([category, items]) => {
            // Add category header
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(category, 14, startY);
            startY += 7;
            
            const columns = this.columns[category];
            
            // Create table
            doc.autoTable({
                startY: startY,
                head: [Object.keys(columns)],
                body: items.map(item => Object.values(columns).map(key => item[key])),
                theme: 'grid',
                headStyles: {
                    fillColor: [0, 0, 139],
                    textColor: 255,
                    fontSize: 8
                },
                styles: {
                    fontSize: 7,
                    cellPadding: 2
                },
                columnStyles: Object.fromEntries(
                    Object.keys(columns).map((_, i) => [i, { cellWidth: 'auto' }])
                )
            });
            
            startY = doc.lastAutoTable.finalY + 15;
            
            // Add new page if needed
            if (startY >= doc.internal.pageSize.height - 20) {
                doc.addPage();
                startY = 20;
            }
        });
        
        // Add footer to all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height;
            
            doc.text('COSEM', pageSize.width / 2, pageHeight - 15, { align: 'center' });
            doc.text('Contact: +91-8625807046 | Email: hundreomkar7@gmail.com', pageSize.width / 2, pageHeight - 10, { align: 'center' });
            doc.text(`Page ${i} of ${pageCount}`, pageSize.width / 2, pageHeight - 5, { align: 'center' });
        }
        
        // Save file
        doc.save('complete_database.pdf');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.itemManager = new ItemManager();
}); 