document.addEventListener('DOMContentLoaded', function() {
    const grid = document.getElementById('grid');
    const linkLayer = document.getElementById('linkLayer');
    const linkForm = document.getElementById('linkForm');
    const fromElementIdInput = document.getElementById('fromElementId');
    const toElementIdInput = document.getElementById('toElementId');
    const topologySidebar = document.getElementById('topologySidebar');
    const closeSidebarBtn = document.querySelector('.close-sidebar');
    const confirmTopologyBtn = document.getElementById('confirmTopologyBtn');
    const importTopologyBtn = document.getElementById('importTopologyBtn');
    const topologyFileInput = document.getElementById('topologyFileInput');
    const importForm = document.getElementById('importForm');
    
    let selectedElement = null;
    let tempLine = null;
    
    // Initialize tooltips for all elements
    initTooltips();
    
    // Handle element selection and linking
    grid.addEventListener('click', function(e) {
        const element = findClosestElement(e.target);
        if (!element) return;
        
        // If no element is currently selected, select this one
        if (!selectedElement) {
            selectedElement = element;
            element.classList.add('selected');
            
            // Create a temporary line that follows the cursor
            createTempLine(element);
            
            // Track mouse movement to update the temp line
            document.addEventListener('mousemove', updateTempLine);
        } 
        // If an element is already selected and we clicked a different one, create a link
        else if (selectedElement !== element) {
            // Get the IDs of the elements to link
            const fromId = selectedElement.dataset.id;
            const toId = element.dataset.id;
            
            // Set form values and submit
            fromElementIdInput.value = fromId;
            toElementIdInput.value = toId;
            linkForm.submit();
            
            // Clean up
            selectedElement.classList.remove('selected');
            selectedElement = null;
            removeTempLine();
        }
        // If we click the same element again, deselect it
        else {
            element.classList.remove('selected');
            selectedElement = null;
            removeTempLine();
        }
    });
    
    // Allow clicking anywhere on the grid to cancel selection
    document.addEventListener('click', function(e) {
        // If we have a selected element and clicked outside any element
        if (selectedElement && !findClosestElement(e.target)) {
            selectedElement.classList.remove('selected');
            selectedElement = null;
            removeTempLine();
        }
    });
    
    // Sidebar handling
    closeSidebarBtn.addEventListener('click', function() {
        topologySidebar.classList.remove('open');
    });
    
    // Confirm button handling
    confirmTopologyBtn.addEventListener('click', function() {
        topologySidebar.classList.remove('open');
    });
    
    // Import topology button handling
    importTopologyBtn.addEventListener('click', function() {
        topologyFileInput.click();
    });
    
    // File input change event
    topologyFileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            importForm.submit();
        }
    });
    
    // Helper function to initialize tooltips for elements
    function initTooltips() {
        const elements = document.querySelectorAll('.element');
        
        elements.forEach(element => {
            tippy(element, {
                content: createTooltipContent(element),
                allowHTML: true,
                placement: 'top',
                theme: 'light',
                animation: 'scale'
            });
        });
    }
    
    // Helper function to create tooltip content
    function createTooltipContent(element) {
        const type = element.dataset.type;
        const x = element.dataset.x;
        const y = element.dataset.y;
        const ip = element.dataset.ip;
        
        return `
            <div class="element-tooltip">
                <div><strong>${type}</strong></div>
                <div>Position: (${x}, ${y})</div>
                <div class="ip">${ip}</div>
            </div>
        `;
    }
    
    // Helper function to find the closest element div
    function findClosestElement(target) {
        if (target.classList.contains('element')) {
            return target;
        }
        
        const parent = target.closest('.element');
        if (parent) {
            return parent;
        }
        
        return null;
    }
    
    // Create temporary line for the link being created
    function createTempLine(element) {
        // Get the element's position
        const x = parseInt(element.dataset.x);
        const y = parseInt(element.dataset.y);
        
        // Calculate SVG coordinates (center of the cell)
        const svgX = x * 60 + 32; // 60 is cell width, 32 is center offset
        const svgY = (9 - y) * 60 + 32; // Invert Y because SVG and grid have different origin points
        
        // Create the line element
        tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tempLine.setAttribute('x1', svgX);
        tempLine.setAttribute('y1', svgY);
        tempLine.setAttribute('x2', svgX);
        tempLine.setAttribute('y2', svgY);
        tempLine.setAttribute('class', 'temp-line');
        tempLine.setAttribute('marker-end', 'url(#arrowhead)');
        tempLine.setAttribute('style', 'z-index: 15;');
        
        // Add to SVG
        linkLayer.appendChild(tempLine);
    }
    
    // Update the temporary line to follow the cursor
    function updateTempLine(e) {
        if (!tempLine) return;
        
        // Calculate cursor position relative to the SVG
        const rect = linkLayer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Constrain to grid bounds
        const boundedX = Math.max(0, Math.min(x, rect.width));
        const boundedY = Math.max(0, Math.min(y, rect.height));
        
        // Update the line end point
        tempLine.setAttribute('x2', boundedX);
        tempLine.setAttribute('y2', boundedY);
    }
    
    // Remove the temporary line
    function removeTempLine() {
        if (tempLine) {
            linkLayer.removeChild(tempLine);
            tempLine = null;
        }
        
        // Remove mousemove listener
        document.removeEventListener('mousemove', updateTempLine);
    }
    
    // Call topology button functionality
    document.getElementById('callTopologyBtn').addEventListener('click', function() {
        fetch('/calculate_topology')
            .then(response => response.json())
            .then(data => {
                // Display results in the sidebar
                const resultsContainer = document.getElementById('topologyResults');
                
                let resultsHTML = `
                    <table class="topology-table">
                        <thead>
                            <tr>
                                <th>Link ID</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Distance (km)</th>
                                <th>Delay (ms)</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                data.forEach(item => {
                    resultsHTML += `
                        <tr>
                            <td>${item.link_id}</td>
                            <td>${item.from_type} (${item.from_ip})</td>
                            <td>${item.to_type} (${item.to_ip})</td>
                            <td>${item.distance.toFixed(2)}</td>
                            <td>${item.delay.toFixed(2)}</td>
                        </tr>
                    `;
                });
                
                resultsHTML += `
                        </tbody>
                    </table>
                `;
                
                resultsContainer.innerHTML = resultsHTML;
                topologySidebar.classList.add('open');
            })
            .catch(error => {
                console.error('Error fetching topology data:', error);
            });
    });
    
    // Function to close the sidebar when clicking outside
    document.addEventListener('click', function(e) {
        return;
        if (topologySidebar.classList.contains('open') && 
            !topologySidebar.contains(e.target) && 
            e.target.id !== 'callTopologyBtn' &&
            !e.target.closest('#callTopologyBtn')) {
            topologySidebar.classList.remove('open');
        }
    });
});