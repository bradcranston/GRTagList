// Global variables
let allLocations = [];
let filteredLocations = [];
let activeTags = new Set();

// Function that FileMaker will call with data parameter
window.displayLocationData = function(data) {
  try {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    allLocations = parsedData.value || parsedData;
    filteredLocations = [...allLocations];
    
    renderTagFilters();
    renderLocationTable();
    updateLocationCount();
  } catch (error) {
    console.error('Error parsing data:', error);
    displayError('Error parsing location data');
  }
};

// Function to render tag filter buttons
function renderTagFilters() {
  const tagFiltersContainer = document.getElementById('tagFilters');
  
  // Get all unique tags
  const allTags = new Set();
  allLocations.forEach(location => {
    if (location.Tags) {
      const tags = location.Tags.split('\r').filter(tag => tag.trim() !== '');
      tags.forEach(tag => allTags.add(tag.trim()));
    }
  });
  
  // Create filter buttons
  const filterButtons = Array.from(allTags).sort().map(tag => {
    const isActive = activeTags.has(tag);
    return `
      <button class="btn btn-outline-primary btn-sm tag-filter ${isActive ? 'active' : ''}" 
              data-tag="${tag}" 
              onclick="toggleTagFilter('${tag}')">
        <i class="bi bi-tag"></i> ${tag}
        ${isActive ? '<i class="bi bi-x-circle ms-1"></i>' : ''}
      </button>
    `;
  }).join('');
  
  tagFiltersContainer.innerHTML = filterButtons;
}

// Function to toggle tag filter
window.toggleTagFilter = function(tag) {
  if (activeTags.has(tag)) {
    activeTags.delete(tag);
  } else {
    activeTags.add(tag);
  }
  
  filterLocations();
  renderTagFilters();
  renderLocationTable();
  updateLocationCount();
};

// Function to clear all filters
window.clearAllFilters = function() {
  activeTags.clear();
  filteredLocations = [...allLocations];
  renderTagFilters();
  renderLocationTable();
  updateLocationCount();
};

// Function to filter locations based on active tags
function filterLocations() {
  if (activeTags.size === 0) {
    filteredLocations = [...allLocations];
    return;
  }
  
  filteredLocations = allLocations.filter(location => {
    if (!location.Tags) return false;
    
    const locationTags = location.Tags.split('\r')
      .map(tag => tag.trim())
      .filter(tag => tag !== '');
    
    // Check if location has ALL active tags (AND logic)
    return Array.from(activeTags).every(activeTag => 
      locationTags.includes(activeTag)
    );
  });
}

// Function to render the location table
function renderLocationTable() {
  const tableBody = document.getElementById('locationTableBody');
  
  if (!filteredLocations || filteredLocations.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No locations found</td></tr>';
    return;
  }
  
  const tableHTML = filteredLocations.map((location, index) => createLocationRow(location, index)).join('');
  tableBody.innerHTML = tableHTML;
}

// Function to create individual table row
function createLocationRow(location, index) {
  const custNum = location._kf_Customer || 'N/A';
  const customerName = location.Customer_Name_calc || 'N/A';
  const locNum = location.__kp_Location || 'N/A';
  const locationName = location.Location_Name || 'N/A';
  const tags = formatTags(location.Tags);
  
  return `
    <tr class="location-row" data-location-index="${index}" onclick="handleRowClick(${index})">
      <td class="fw-bold">${custNum}</td>
      <td>${customerName}</td>
      <td class="fw-bold">${locNum}</td>
      <td class="location-name">${locationName}</td>
      <td class="tags-cell">${tags}</td>
    </tr>
  `;
}

// Function to format tags
function formatTags(tagsString) {
  if (!tagsString || tagsString.trim() === '') {
    return '<span class="text-muted fst-italic">No tags</span>';
  }
  
  // Split by carriage return and filter out empty strings
  const tags = tagsString.split('\r').filter(tag => tag.trim() !== '');
  
  if (tags.length === 0) {
    return '<span class="text-muted fst-italic">No tags</span>';
  }
  
  return tags.map(tag => {
    const isActive = activeTags.has(tag.trim());
    const badgeClass = isActive ? 'bg-primary' : 'bg-secondary';
    return `<span class="badge ${badgeClass} me-1">${tag.trim()}</span>`;
  }).join('');
}

// Function to handle export locations
window.exportLocations = function() {
  try {
    // Get array of location IDs from filtered locations
    const locationIds = filteredLocations.map(location => location.__kp_Location).filter(id => id != null);
    
    // Get filtered tag names as a string
    const filteredTags = Array.from(activeTags).sort().join(', ');
    
    // Create the parameter object
    const parameter = {
      mode: 'exportLocations',
      locationIds: locationIds,
      count: locationIds.length,
      filteredTags: filteredTags
    };
    
    // Convert to JSON string for FileMaker parameter
    const parameterJSON = JSON.stringify(parameter);
    
    // Call FileMaker script
    if (window.FileMaker) {
      window.FileMaker.PerformScript('Manage: Tag Report', parameterJSON);
    } else {
      // Fallback for testing/development
      console.log('Export Locations - FileMaker script would be called with:', parameter);
      console.log('JSON Parameter:', parameterJSON);
    }
    
  } catch (error) {
    console.error('Error exporting locations:', error);
  }
};

// Function to handle export contacts
window.exportContacts = function() {
  try {
    // Get array of location IDs from filtered locations
    const locationIds = filteredLocations.map(location => location.__kp_Location).filter(id => id != null);
    
    // Get filtered tag names as a string
    const filteredTags = Array.from(activeTags).sort().join(', ');
    
    // Create the parameter object
    const parameter = {
      mode: 'exportContacts',
      locationIds: locationIds,
      count: locationIds.length,
      filteredTags: filteredTags
    };
    
    // Convert to JSON string for FileMaker parameter
    const parameterJSON = JSON.stringify(parameter);
    
    // Call FileMaker script
    if (window.FileMaker) {
      window.FileMaker.PerformScript('Manage: Tag Report', parameterJSON);
    } else {
      // Fallback for testing/development
      console.log('Export Contacts - FileMaker script would be called with:', parameter);
      console.log('JSON Parameter:', parameterJSON);
    }
    
  } catch (error) {
    console.error('Error exporting contacts:', error);
  }
};

// Function to handle row click and call FileMaker script
window.handleRowClick = function(locationIndex) {
  try {
    const location = filteredLocations[locationIndex];
    
    if (!location) {
      console.error('Location not found at index:', locationIndex);
      return;
    }
    
    // Create the parameter object with row data and mode
    const parameter = {
      mode: 'goToLocation',
      locationData: {
        _kf_Customer: location._kf_Customer,
        Customer_Name_calc: location.Customer_Name_calc,
        __kp_Location: location.__kp_Location,
        Location_Name: location.Location_Name,
        Tags: location.Tags,
        // Include any additional odata fields that might be useful
        '@odata.editLink': location['@odata.editLink'],
        '@odata.id': location['@odata.id']
      }
    };
    
    // Convert to JSON string for FileMaker parameter
    const parameterJSON = JSON.stringify(parameter);
    
    // Call FileMaker script
    if (window.FileMaker) {
      window.FileMaker.PerformScript('Manage: Tag Report', parameterJSON);
    } else {
      // Fallback for testing/development
      console.log('FileMaker script would be called with:', parameter);
      console.log('JSON Parameter:', parameterJSON);
    }
    
  } catch (error) {
    console.error('Error handling row click:', error);
  }
};

// Function to update location count
function updateLocationCount() {
  const countElement = document.getElementById('locationCount');
  countElement.textContent = filteredLocations.length;
}

// Function to display error messages
function displayError(message) {
  const tableBody = document.getElementById('locationTableBody');
  tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${message}</td></tr>`;
}

// For testing purposes - load data from data.json file
async function loadTestData() {
  try {
    const response = await fetch('./data.json');
    const data = await response.json();
    displayLocationData(data);
  } catch (error) {
    console.error('Error loading test data:', error);
    // Don't show error to user - just keep the "Waiting for data..." message
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Clear filters button
  document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
  
  // Export buttons
  document.getElementById('exportLocations').addEventListener('click', exportLocations);
  document.getElementById('exportContacts').addEventListener('click', exportContacts);
  
  // Load test data when page loads (remove this in production)
  loadTestData();
});