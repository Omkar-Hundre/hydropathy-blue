class PriceList {
    constructor() {
        this.data = null;
        this.searchInput = document.getElementById('searchInput');
        this.categoriesContainer = document.getElementById('categoriesContainer');
        this.editingCell = null;
        this.confirmationModal = document.getElementById('confirmationModal');
        this.confirmUpdate = document.getElementById('confirmUpdate');
        this.cancelUpdate = document.getElementById('cancelUpdate');
        this.pendingUpdate = null;
        this.exportExcel = document.getElementById('exportExcel');
        this.exportPdf = document.getElementById('exportPdf');

        this.loadData();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.searchInput.addEventListener('input', () => this.handleSearch());
        document.addEventListener('click', (e) => this.handleClickOutside(e));
        
        // Confirmation modal events
        this.confirmUpdate.addEventListener('click', () => this.processPriceUpdate());
        this.cancelUpdate.addEventListener('click', () => this.hideConfirmationModal());
        
        // Export events
        this.exportExcel.addEventListener('click', () => this.handleExportExcel());
        this.exportPdf.addEventListener('click', () => this.handleExportPdf());
    }

    async loadData() {
        try {
            // Load data and column mappings
            const dataResponse = await fetch('/files/data/data.json');
            this.data = await dataResponse.json();
            
            const columnResponse = await fetch('/files/data/column.json');
            this.columnMappings = await columnResponse.json();
    
            this.renderCategories();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    renderCategories() {
        this.categoriesContainer.innerHTML = '';
        
        Object.entries(this.data).forEach(([category, items]) => {
            const section = this.createCategorySection(category, items);
            this.categoriesContainer.appendChild(section);
        });
    }

    createCategorySection(category, items) {
        const section = document.createElement('div');
        section.className = 'category-section bg-white rounded-lg shadow-md p-6';
    
        // Determine price key for this category
        const columnMap = this.columnMappings[category] || {};
        let priceKey;
    
        // Check for 'RS/Kg' or 'Rate' in original column names
        for (const [origCol, key] of Object.entries(columnMap)) {
            const lowerOrigCol = origCol.toLowerCase();
            if (lowerOrigCol === 'rs/kg' || lowerOrigCol === 'rate') {
                priceKey = key;
                break;
            }
        }
    
        // Fallback to item's keys if not found in columnMap
        if (!priceKey && items.length > 0) {
            const firstItem = items[0];
            if (firstItem.rs_kg !== undefined) priceKey = 'rs_kg';
            else if (firstItem.rate !== undefined) priceKey = 'rate';
            else priceKey = Object.keys(firstItem).find(k => k.toLowerCase().includes('price')) || 'price';
        }
    
        section.innerHTML = `
            <h2 class="text-lg font-semibold text-gray-800 mb-4">${category}</h2>
            <div class="overflow-x-auto">
                <table class="price-table">
                    <thead>
                        <tr class="bg-gray-50">
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL.NO.</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => this.createItemRow(item, category, priceKey)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    
        return section;
    }

    createItemRow(item, category, priceKey) {
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">${item.sl_no_}</td>
                <td class="px-6 py-4">${item.description}</td> <!-- Changed from descr to description -->
                <td class="px-6 py-4 whitespace-nowrap editable" 
                    data-category="${category}"
                    data-sl-no="${item.sl_no_}"
                    data-key="${priceKey}"
                    data-original-value="${item[priceKey]}">${item[priceKey]}</td>
            </tr>
        `;
    }

    handleSearch() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('.price-table tbody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    showConfirmationModal(oldValue, newValue, item) {
        document.getElementById('confirmItemDesc').textContent = item.description;
        document.getElementById('confirmOldPrice').textContent = oldValue;
        document.getElementById('confirmNewPrice').textContent = newValue;
        this.confirmationModal.classList.remove('hidden');
    }

    hideConfirmationModal() {
        this.confirmationModal.classList.add('hidden');
        if (this.editingCell && this.pendingUpdate) {
            // Restore the original value if update was cancelled
            this.editingCell.textContent = this.pendingUpdate.oldValue;
        }
        this.pendingUpdate = null;
        this.editingCell = null;
    }

    async processPriceUpdate() {
        if (!this.pendingUpdate) return;
    
        const { category, slNo, key, value, oldValue } = this.pendingUpdate;
    
        try {
            const response = await fetch('/api/update-price', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category,
                    slNo,
                    key,
                    value
                })
            });
    
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.details || 'Failed to update price');
            }
    
            // Update the cell with the new value
            if (this.editingCell) {
                this.editingCell.textContent = value;
                this.editingCell.dataset.originalValue = value;
            }
    
            // Update local data structure
            const categoryData = this.data[category];
            if (categoryData) {
                const item = categoryData.find(item => String(item.sl_no_) === String(slNo));
                if (item) {
                    item[key] = parseFloat(value);
                }
            }
    
        } catch (error) {
            console.error('Error saving price:', error);
            // Show a more user-friendly error message
            alert('Unable to save the price update. Please make sure the Excel file is not open in another program and try again.');
            
            // Revert the cell to the old value
            if (this.editingCell) {
                this.editingCell.textContent = oldValue;
                this.editingCell.dataset.originalValue = oldValue;
            }
        }
    
        this.hideConfirmationModal();
    }

    startEditing(cell) {
        const currentValue = cell.textContent;
        // Store the original value in the cell's dataset
        cell.dataset.originalValue = currentValue;
        this.editingCell = cell;
        
        cell.innerHTML = `
            <input type="number" 
                   value="${currentValue}"
                   class="w-full px-2 py-1 border border-gray-300 rounded"
                   step="0.01"
                   min="0">
        `;
        
        const input = cell.querySelector('input');
        input.focus();
        input.select();

        input.addEventListener('blur', () => this.handlePriceChange(input));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
    }

    handlePriceChange(input) {
        const newValue = parseFloat(input.value);
        const oldValue = parseFloat(this.editingCell.dataset.originalValue);
        const category = this.editingCell.dataset.category;
        const slNo = parseInt(this.editingCell.dataset.slNo, 10);
        const key = this.editingCell.dataset.key;

        // Store the pending update
        this.pendingUpdate = {
            category,
            slNo,
            key,
            value: newValue,
            oldValue
        };

        // Find the item for displaying in confirmation
        const item = this.data[category].find(item => item.sl_no_ === slNo);

        if (!item) {
            console.error('Item not found:', { category, slNo });
            return;
        }

        // Show confirmation modal
        this.showConfirmationModal(oldValue, newValue, item);
    }

    handleClickOutside(event) {
        const cell = event.target.closest('.editable');
        if (cell && !cell.querySelector('input')) {
            this.startEditing(cell);
        }
    }

    handleExportExcel() { 
        const exportData = [];
        Object.entries(this.data).forEach(([category, items]) => {
            const columnMap = this.columnMappings[category] || {};
            let priceKey;

            for (const [origCol, key] of Object.entries(columnMap)) {
                const lowerOrigCol = origCol.toLowerCase();
                if (lowerOrigCol === 'rs/kg' || lowerOrigCol === 'rate') {
                    priceKey = key;
                    break;
                }
            }

            if (!priceKey && items.length > 0) {
                const firstItem = items[0];
                if (firstItem.rs_kg !== undefined) priceKey = 'rs_kg';
                else if (firstItem.rate !== undefined) priceKey = 'rate';
                else priceKey = Object.keys(firstItem).find(k => k.toLowerCase().includes('price')) || 'price';
            }

            exportData.push([{ v: category, s: { font: { bold: true }, fill: { fgColor: { rgb: 'E5E7EB' } } } }]);
            items.forEach(item => {
                exportData.push([
                    item.sl_no_,
                    item.description,
                    item[priceKey]
                ]);
            });
            exportData.push([]);
        });        
        
        // Create workbook
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Price List');
        
        // Save file
        XLSX.writeFile(wb, 'price_list.xlsx');
    }

    handleExportPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
    
        // Add header
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 139); // Dark blue
        doc.text('COSEM', 105, 20, { align: 'center' });
    
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text('Price List', 105, 30, { align: 'center' });
    
        // Add date
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 37, { align: 'center' });
    
        let startY = 45;
        let pageHeight = doc.internal.pageSize.height;
    
        Object.entries(this.data).forEach(([category, items]) => {
            const columnMap = this.columnMappings[category] || {};
            let priceKey;
    
            for (const [origCol, key] of Object.entries(columnMap)) {
                const lowerOrigCol = origCol.toLowerCase();
                if (lowerOrigCol === 'rs/kg' || lowerOrigCol === 'rate') {
                    priceKey = key;
                    break;
                }
            }
    
            if (!priceKey && items.length > 0) {
                const firstItem = items[0];
                if (firstItem.rs_kg !== undefined) priceKey = 'rs_kg';
                else if (firstItem.rate !== undefined) priceKey = 'rate';
                else priceKey = Object.keys(firstItem).find(k => k.toLowerCase().includes('price')) || 'price';
            }
    
            // Add category header
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(category, 14, startY);
            startY += 7;
    
            // Prepare table data
            const tableData = items.map(item => [
                item.sl_no_,
                item.description,
                item[priceKey]
            ]);
    
            // Add table
            doc.autoTable({
                startY: startY,
                head: [['SL.NO.', 'Description', 'Price (Rs/Kg)']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [0, 0, 139],
                    textColor: 255,
                    fontSize: 10
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 100 },
                    2: { cellWidth: 30 }
                }
            });
    
            startY = doc.lastAutoTable.finalY + 15;
    
            // Add new page if needed
            if (startY >= pageHeight - 20) {
                doc.addPage();
                startY = 20;
            }
        });
    
        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
    
            // Footer text
            doc.text('COSEM', 105, pageHeight - 15, { align: 'center' });
            doc.text('Contact: +91-8625807046 | Email: hundreomkar7@gmail.com', 105, pageHeight - 10, { align: 'center' });
    
            // Page number
            doc.text(`Page ${i} of ${pageCount}`, 105, pageHeight - 5, { align: 'center' });
        }
    
        // Save the PDF
        doc.save('price_list.pdf');
    }
    
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.priceList = new PriceList();
}); 