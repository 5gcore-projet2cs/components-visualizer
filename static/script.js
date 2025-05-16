document.addEventListener('DOMContentLoaded', function() {
    const grid = document.getElementById('grid');
    const linkLayer = document.getElementById('linkLayer');
    const topologySidebar = document.getElementById('topologySidebar');
    const closeSidebarBtn = document.querySelector('.close-sidebar');
    const confirmTopologyBtn = document.getElementById('confirmTopologyBtn');
    const importTopologyBtn = document.getElementById('importTopologyBtn');
    const topologyFileInput = document.getElementById('topologyFileInput');
    const importForm = document.getElementById('importForm');
    const addElementForm = document.getElementById('addElementForm');
    
    let selectedElement = null;
    let tempLine = null;
    
    // Configure toastr options
    toastr.options = {
        closeButton: true,
        progressBar: true,
        positionClass: "toast-top-right",
        timeOut: 3000
    };
    
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
            
            // Instead of form submit, use fetch API
            createLink(fromId, toId);
            
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
    
    // Add element form submission with fetch
    addElementForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        
        fetch('/add', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text);
                });
            }
            return response.text();
        })
        .then(() => {
            toastr.success('Element added successfully');
            // Refresh the page to show new element
            e.target.reset();
            location.reload();
        })
        .catch(error => {
            toastr.error(error.message || 'Failed to add element');
            e.target.reset();
        });
    });
    
    // Function to create a link using fetch API
    function createLink(fromId, toId) {
        const formData = new FormData();
        formData.append('from_id', fromId);
        formData.append('to_id', toId);
        
        fetch('/add_link', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text);
                });
            }
            return response.text();
        })
        .then(() => {
            toastr.success('Link created successfully');
            // Refresh the page to show new link
            location.reload();
        })
        .catch(error => {
            toastr.error(error.message || 'Failed to create link');
        });
    }
    
    // Reset topology button with fetch
    document.getElementById('resetTopologyBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to reset the topology? This will remove all elements and links.')) {
            fetch('/reset', {
                method: 'POST'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to reset topology');
                }
                return response.text();
            })
            .then(() => {
                toastr.success('Topology reset successfully');
                // Refresh the page
                location.reload();
            })
            .catch(error => {
                toastr.error(error.message);
            });
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
        // Get topology data to send to the server
        const tableRows = document.querySelectorAll('.topology-table tbody tr');
        const linksData = [];
        
        tableRows.forEach(row => {
            const linkId = row.dataset.linkId;
            linksData.push({
                linkId: linkId
            });
        });
        
        // Display loading message through toast
        toastr.info('Processing packets...', 'Please wait', {timeOut: 0, extendedTimeOut: 0});
        
        // Send request to generate and send Scapy packets
        fetch('/generate_packets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ links: linksData })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Clear any existing toasts
            toastr.clear();
            
            // Show success message
            toastr.success(`Successfully generated and sent ${data.packetCount} packets with appropriate delays!`);
            topologySidebar.classList.remove('open');
        })
        .catch(error => {
            // Clear any existing toasts
            toastr.clear();
            
            console.error('Error generating packets:', error);
            toastr.error('Error generating packets. See console for details.');
        });
    });
    
    // Import topology button handling
    importTopologyBtn.addEventListener('click', function() {
        topologyFileInput.click();
    });
    
    // File input change event
    topologyFileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const formData = new FormData(importForm);
            
            toastr.info('Importing topology...', 'Please wait', {timeOut: 0, extendedTimeOut: 0});
            
            fetch('/import_topology', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text);
                    });
                }
                return response.text();
            })
            .then(() => {
                toastr.clear();
                toastr.success('Topology imported successfully');
                // Refresh the page
                location.reload();
            })
            .catch(error => {
                toastr.clear();
                toastr.error(error.message || 'Failed to import topology');
            });
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
        toastr.info('Calculating topology...', 'Please wait', {timeOut: 2000});
        
        fetch('/calculate_topology')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
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
                        <tr data-link-id="${item.link_id}">
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
                
                // Add event listeners for row hover after populating the table
                addTableRowHoverEffects();
            })
            .catch(error => {
                console.error('Error fetching topology data:', error);
                toastr.error('Error fetching topology data. See console for details.');
            });
    });
    
    // Function to add hover effects to table rows
    function addTableRowHoverEffects() {
        const tableRows = document.querySelectorAll('.topology-table tbody tr');
        
        tableRows.forEach(row => {
            row.addEventListener('mouseenter', function() {
                const linkId = this.dataset.linkId;
                highlightLink(linkId);
            });
            
            row.addEventListener('mouseleave', function() {
                const linkId = this.dataset.linkId;
                unhighlightLink(linkId);
            });
        });
    }
    
    // Function to highlight a specific link
    function highlightLink(linkId) {
        const link = document.querySelector(`.linker[data-link-id="${linkId}"]`);
        if (link) {
            // Store the original styles to restore later
            link.dataset.originalStroke = link.getAttribute('stroke') || '';
            link.dataset.originalStrokeWidth = link.getAttribute('stroke-width') || '';
            
            // Apply highlight styles
            link.classList.add('highlighted');
            
            // Create a custom marker for the highlighted arrow
            const markerId = `highlighted-arrowhead-${linkId}`;
            let marker = document.querySelector(`#${markerId}`);
            
            if (!marker) {
                // Create a highlighted marker if it doesn't exist
                const defs = document.querySelector('defs');
                marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
                marker.setAttribute('id', markerId);
                marker.setAttribute('markerWidth', '12');
                marker.setAttribute('markerHeight', '9');
                marker.setAttribute('refX', '10');
                marker.setAttribute('refY', '4.5');
                marker.setAttribute('orient', 'auto');
                
                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                polygon.setAttribute('points', '0 0, 12 4.5, 0 9');
                polygon.setAttribute('fill', '#ffd700'); // Gold color to match the line
                
                marker.appendChild(polygon);
                defs.appendChild(marker);
            }
            
            // Save the original marker and update to the highlighted one
            link.dataset.originalMarker = link.getAttribute('marker-end') || '';
            link.setAttribute('marker-end', `url(#${markerId})`);
            
            // Bring to front by removing and re-appending
            const parent = link.parentNode;
            parent.removeChild(link);
            parent.appendChild(link);
        }
    }
    
    // Function to unhighlight a specific link
    function unhighlightLink(linkId) {
        const link = document.querySelector(`.linker[data-link-id="${linkId}"]`);
        if (link) {
            // Restore original styles
            link.classList.remove('highlighted');
            link.setAttribute('marker-end', link.dataset.originalMarker || 'url(#arrowhead)');
        }
    }
    
    // Function to close the sidebar when clicking outside
    document.addEventListener('click', function(e) {
        if (topologySidebar.classList.contains('open') && 
            !topologySidebar.contains(e.target) && 
            e.target.id !== 'callTopologyBtn' &&
            !e.target.closest('#callTopologyBtn')) {
            topologySidebar.classList.remove('open');
        }
    });
});