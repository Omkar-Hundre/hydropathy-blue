class ProjectManager {
    constructor() {
        this.projects = [];
        this.initializeElements();
        this.setupEventListeners();
        this.loadProjects();
    }

    initializeElements() {
        // Modal elements
        this.newProjectModal = document.getElementById('newProjectModal');
        this.newProjectBtn = document.getElementById('newProjectBtn');
        this.closeProjectModal = document.getElementById('closeProjectModal');
        this.cancelProject = document.getElementById('cancelProject');
        this.newProjectForm = document.getElementById('newProjectForm');
        this.projectFiles = document.getElementById('projectFiles');
        this.fileList = document.getElementById('fileList');
        
        // Project display elements
        this.emptyState = document.getElementById('emptyState');
        this.projectsGrid = document.getElementById('projectsGrid');
    }

    setupEventListeners() {
        // Modal controls
        this.newProjectBtn.addEventListener('click', () => this.showModal());
        this.closeProjectModal.addEventListener('click', () => this.hideModal());
        this.cancelProject.addEventListener('click', () => this.hideModal());
        
        // Form submission
        this.newProjectForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // File upload
        this.projectFiles.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        const dropZone = this.projectFiles.parentElement.parentElement.parentElement;
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-indigo-500');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-indigo-500');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-indigo-500');
            this.handleFileDrop(e);
        });
    }

    generateProjectId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        for (let i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    showModal() {
        this.newProjectModal.classList.remove('hidden');
        document.getElementById('projectId').value = this.generateProjectId();
        document.getElementById('startDate').valueAsDate = new Date();
    }

    hideModal() {
        this.newProjectModal.classList.add('hidden');
        this.newProjectForm.reset();
        this.fileList.innerHTML = '';
    }

    handleFileSelect(event) {
        this.updateFileList(event.target.files);
    }

    handleFileDrop(event) {
        this.updateFileList(event.dataTransfer.files);
        this.projectFiles.files = event.dataTransfer.files;
    }

    updateFileList(files) {
        this.fileList.innerHTML = '';
        Array.from(files).forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md';
            fileItem.innerHTML = `
                <span class="flex items-center">
                    <i class="fas fa-file-alt text-gray-400 mr-2"></i>
                    ${file.name}
                </span>
                <span class="text-sm text-gray-500">${(file.size / 1024).toFixed(1)} KB</span>
            `;
            this.fileList.appendChild(fileItem);
        });
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        try {
            // Validate form data
            if (!this.validateForm()) {
                return;
            }
        
            const formData = new FormData();
            const projectData = {
                id: document.getElementById('projectId').value,
                name: document.getElementById('projectName').value,
                clientName: document.getElementById('clientName').value,
                clientContact: document.getElementById('clientContact').value,
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                projectType: document.getElementById('projectType').value,
                priorityLevel: document.getElementById('priorityLevel').value,
                description: document.getElementById('projectDescription').value,
                technicalRequirements: document.getElementById('technicalRequirements').value,
                status: 'draft',
                createdAt: new Date().toISOString(),
                files: Array.from(this.projectFiles.files).map(f => f.name)
            };

            // Save project data
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            });

            if (!response.ok) throw new Error('Failed to save project');

            // Upload files if any
            if (this.projectFiles.files.length > 0) {
                formData.append('projectId', projectData.id);
                Array.from(this.projectFiles.files).forEach(file => {
                    formData.append('files', file);
                });

                const uploadResponse = await fetch('/api/upload-project-files', {
                    method: 'POST',
                    body: formData
                });

                if (!uploadResponse.ok) throw new Error('Failed to upload files');
            }

            // Add to local projects and update display
            this.projects.push(projectData);
            this.renderProjects();
            this.hideModal();

            // Redirect to project setup
            window.location.href = `project-setup.html?id=${projectData.id}`;

        } catch (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project. Please try again.');
        }
    }

    async loadProjects() {
        try {
            const response = await fetch('/api/projects');
            this.projects = await response.json();
            this.renderProjects();
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    renderProjects() {
        if (this.projects.length === 0) {
            this.emptyState.classList.remove('hidden');
            this.projectsGrid.classList.add('hidden');
            return;
        }

        this.emptyState.classList.add('hidden');
        this.projectsGrid.classList.remove('hidden');
        
        this.projectsGrid.innerHTML = this.projects.map(project => `
            <div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">${project.name}</h3>
                        <p class="text-sm text-gray-500">ID: ${project.id}</p>
                    </div>
                    <span class="px-2 py-1 text-xs font-semibold rounded-full 
                        ${project.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
                        ${project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                </div>
                <div class="mb-4">
                    <p class="text-sm text-gray-600"><span class="font-medium">Client:</span> ${project.clientName}</p>
                    <p class="text-sm text-gray-600"><span class="font-medium">Start Date:</span> ${new Date(project.startDate).toLocaleDateString()}</p>
                </div>
                <div class="flex justify-end space-x-2">
                    <button onclick="window.location.href='project-setup.html?id=${project.id}'" 
                            class="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800">
                        <i class="fas fa-edit mr-1"></i> Edit
                    </button>
                    <button onclick="window.location.href='project-view.html?id=${project.id}'" 
                            class="px-3 py-1 text-sm text-blue-600 hover:text-blue-800">
                        <i class="fas fa-eye mr-1"></i> View
                    </button>
                    <button onclick="projectManager.deleteProject('${project.id}')" 
                            class="px-3 py-1 text-sm text-red-600 hover:text-red-800">
                        <i class="fas fa-trash-alt mr-1"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    async deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project?')) return;

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete project');

            this.projects = this.projects.filter(p => p.id !== projectId);
            this.renderProjects();
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Failed to delete project. Please try again.');
        }
    }

    validateForm() {
        const requiredFields = ['projectName', 'clientName', 'startDate', 'endDate'];
        for (const field of requiredFields) {
            const element = document.getElementById(field);
            if (!element.value.trim()) {
                alert(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
                element.focus();
                return false;
            }
        }

        // Validate end date is after start date
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        if (endDate < startDate) {
            alert('End date must be after start date');
            document.getElementById('endDate').focus();
            return false;
        }

        return true;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.projectManager = new ProjectManager();
}); 