// Smart Form Filler - Popup Script
document.addEventListener("DOMContentLoaded", function () {
  // Tab navigation
  setupTabs();

  // Get references to UI elements
  const enabledToggle = document.getElementById("enabledToggle");
  const fillFormsButton = document.getElementById("fillFormsButton");
  const scanPageButton = document.getElementById("scanPageButton");
  const resetStatsButton = document.getElementById("resetStatsButton");
  const exportDataButton = document.getElementById("exportDataButton");
  const clearDataButton = document.getElementById("clearDataButton");
  const confidenceSlider = document.getElementById("minimumConfidence");
  const confidenceValue = document.getElementById("confidenceValue");
  const searchInput = document.getElementById("searchForms");

  // Initialize UI with current settings
  loadSettings();
  loadStatistics();
  loadFormsData();
  checkCurrentPageForms();

  // Setup event listeners
  enabledToggle.addEventListener("change", toggleExtension);
  fillFormsButton.addEventListener("click", triggerAutoFill);
  scanPageButton.addEventListener("click", scanCurrentPage);
  resetStatsButton.addEventListener("click", resetStatistics);
  exportDataButton.addEventListener("click", exportData);
  clearDataButton.addEventListener("click", confirmClearData);
  searchInput.addEventListener("input", filterFormsList);

  // Settings sliders and inputs
  confidenceSlider.addEventListener("input", function () {
    confidenceValue.textContent = confidenceSlider.value + "%";
  });

  confidenceSlider.addEventListener("change", saveSettings);
  document
    .getElementById("autoFillDelay")
    .addEventListener("change", saveSettings);
  document
    .getElementById("enablePasswordFill")
    .addEventListener("change", saveSettings);
  document
    .getElementById("collectStatistics")
    .addEventListener("change", saveSettings);
});

// Setup tab navigation
function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Remove active class from all buttons and panes
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanes.forEach((pane) => pane.classList.remove("active"));

      // Add active class to clicked button and corresponding pane
      button.classList.add("active");
      const tabId = button.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });
}

// Load extension settings
function loadSettings() {
  chrome.storage.local.get(["settings", "isEnabled"], function (data) {
    const settings = data.settings || {
      autoFillDelay: 1000,
      minimumConfidence: 70,
      enablePasswordFill: false,
      collectStatistics: true,
    };

    // Update UI elements with settings values
    document.getElementById("autoFillDelay").value = settings.autoFillDelay;
    document.getElementById("minimumConfidence").value =
      settings.minimumConfidence;
    document.getElementById("confidenceValue").textContent =
      settings.minimumConfidence + "%";
    document.getElementById("enablePasswordFill").checked =
      settings.enablePasswordFill;
    document.getElementById("collectStatistics").checked =
      settings.collectStatistics;

    // Set enabled state
    document.getElementById("enabledToggle").checked = data.isEnabled !== false;
  });
}

// Load usage statistics
function loadStatistics() {
  chrome.storage.local.get("statistics", function (data) {
    const stats = data.statistics || {
      formsDetected: 0,
      formsFilled: 0,
      fieldsLearned: 0,
      lastUsed: null,
    };

    // Update UI with statistics
    document.getElementById("formsDetected").textContent = stats.formsDetected;
    document.getElementById("formsFilled").textContent = stats.formsFilled;
    document.getElementById("fieldsLearned").textContent = stats.fieldsLearned;
  });
}

// Load saved forms data
function loadFormsData() {
  chrome.storage.local.get("formData", function (data) {
    const formData = data.formData || {};
    const formsList = document.getElementById("savedFormsList");

    // Clear current list
    formsList.innerHTML = "";

    // Check if there are any forms saved
    const websites = Object.keys(formData);

    if (websites.length === 0) {
      formsList.innerHTML = '<div class="empty-state">No saved forms yet</div>';
      return;
    }

    // Create list items for each website
    websites.forEach((website) => {
      const forms = Object.keys(formData[website]);
      const numForms = forms.length;

      const listItem = document.createElement("div");
      listItem.className = "website-item";
      listItem.dataset.website = website;

      listItem.innerHTML = `
          <div class="website-name">${website}</div>
          <div class="website-count">${numForms} form${
        numForms !== 1 ? "s" : ""
      }</div>
          <div class="website-actions">
            <button class="icon-button view-btn" title="View forms">👁️</button>
            <button class="icon-button delete-btn" title="Delete all forms for this website">🗑️</button>
          </div>
        `;

      // Add event listeners
      listItem
        .querySelector(".view-btn")
        .addEventListener("click", function () {
          showWebsiteForms(website, formData[website]);
        });

      listItem
        .querySelector(".delete-btn")
        .addEventListener("click", function () {
          confirmDeleteWebsiteForms(website);
        });

      formsList.appendChild(listItem);
    });
  });
}

// Show forms for a specific website
function showWebsiteForms(website, websiteForms) {
  const formDetails = document.getElementById("formDetails");
  formDetails.innerHTML = "";

  // Create header
  const header = document.createElement("div");
  header.className = "form-details-header";
  header.innerHTML = `<h3>Forms on ${website}</h3>`;
  formDetails.appendChild(header);

  // Create form list
  const formsList = document.createElement("div");
  formsList.className = "website-forms-list";

  Object.keys(websiteForms).forEach((formId) => {
    const formFields = websiteForms[formId];
    const listItem = document.createElement("div");
    listItem.className = "form-item";

    // Truncate form ID if too long
    const displayFormId =
      formId.length > 30 ? formId.substring(0, 27) + "..." : formId;

    listItem.innerHTML = `
        <div class="form-id" title="${formId}">${displayFormId}</div>
        <div class="form-count">${formFields.length} field${
      formFields.length !== 1 ? "s" : ""
    }</div>
        <div class="form-actions">
          <button class="icon-button view-fields-btn" title="View fields">👁️</button>
          <button class="icon-button delete-form-btn" title="Delete this form">🗑️</button>
        </div>
      `;

    // Add event listeners
    listItem
      .querySelector(".view-fields-btn")
      .addEventListener("click", function () {
        showFormFields(website, formId, formFields);
      });

    listItem
      .querySelector(".delete-form-btn")
      .addEventListener("click", function () {
        confirmDeleteForm(website, formId);
      });

    formsList.appendChild(listItem);
  });

  formDetails.appendChild(formsList);
}

// Show fields for a specific form
function showFormFields(website, formId, fields) {
  const formDetails = document.getElementById("formDetails");
  formDetails.innerHTML = "";

  // Create header with back button
  const header = document.createElement("div");
  header.className = "form-details-header";
  header.innerHTML = `
      <button class="back-button">← Back</button>
      <h3>Form Fields</h3>
    `;

  header.querySelector(".back-button").addEventListener("click", function () {
    chrome.storage.local.get("formData", function (data) {
      if (data.formData && data.formData[website]) {
        showWebsiteForms(website, data.formData[website]);
      }
    });
  });

  formDetails.appendChild(header);

  // Create fields list
  const fieldsList = document.createElement("div");
  fieldsList.className = "form-fields-list";

  fields.forEach((field) => {
    const listItem = document.createElement("div");
    listItem.className = "field-item";

    // Determine field label display
    const fieldLabel = field.label || field.name || field.id || "Unnamed field";

    listItem.innerHTML = `
        <div class="field-info">
          <div class="field-label">${fieldLabel}</div>
          <div class="field-type">${field.type}</div>
        </div>
        <div class="field-value">${field.value}</div>
      `;

    fieldsList.appendChild(listItem);
  });

  formDetails.appendChild(fieldsList);
}

// Toggle extension enabled state
function toggleExtension() {
  const isEnabled = document.getElementById("enabledToggle").checked;

  chrome.storage.local.set({ isEnabled: isEnabled }, function () {
    // Send message to all tabs to update their state
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, {
            action: "toggleExtension",
            isEnabled: isEnabled,
          })
          .catch((error) => {
            // Ignore errors for tabs where content script isn't loaded
            console.log("Could not send message to tab", tab.id);
          });
      });
    });
  });
}

// Save settings
function saveSettings() {
  const settings = {
    autoFillDelay: parseInt(document.getElementById("autoFillDelay").value),
    minimumConfidence: parseInt(
      document.getElementById("minimumConfidence").value
    ),
    enablePasswordFill: document.getElementById("enablePasswordFill").checked,
    collectStatistics: document.getElementById("collectStatistics").checked,
  };

  chrome.storage.local.set({ settings: settings }, function () {
    // Provide visual feedback that settings were saved
    showStatusMessage("Settings saved");
  });
}

// Reset statistics
function resetStatistics() {
  chrome.runtime.sendMessage(
    { action: "resetStatistics" },
    function (response) {
      if (response && response.success) {
        loadStatistics();
        showStatusMessage("Statistics reset");
      }
    }
  );
}

// Export saved data
function exportData() {
  chrome.storage.local.get(
    ["formData", "statistics", "settings"],
    function (data) {
      // Prepare data for export
      const exportData = {
        formData: data.formData || {},
        statistics: data.statistics || {},
        settings: data.settings || {},
        exportDate: new Date().toISOString(),
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);

      // Create download link
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Create and click download link
      const a = document.createElement("a");
      a.href = url;
      a.download = "smart-form-filler-data.json";
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    }
  );
}

// Confirm before clearing all data
function confirmClearData() {
  if (
    confirm(
      "Are you sure you want to clear all saved form data? This cannot be undone."
    )
  ) {
    chrome.storage.local.set({ formData: {} }, function () {
      loadFormsData();
      showStatusMessage("All form data cleared");
    });
  }
}

// Confirm before deleting website forms
function confirmDeleteWebsiteForms(website) {
  if (confirm(`Are you sure you want to delete all forms for ${website}?`)) {
    chrome.runtime.sendMessage(
      {
        action: "deleteFormData",
        url: website,
      },
      function (response) {
        if (response && response.success) {
          loadFormsData();
          // Clear form details panel
          document.getElementById("formDetails").innerHTML =
            '<div class="empty-state">Select a form to view details</div>';

          showStatusMessage(`Deleted all forms for ${website}`);
        }
      }
    );
  }
}

// Confirm before deleting a specific form
function confirmDeleteForm(website, formId) {
  if (confirm("Are you sure you want to delete this form?")) {
    chrome.runtime.sendMessage(
      {
        action: "deleteFormData",
        url: website,
        formId: formId,
      },
      function (response) {
        if (response && response.success) {
          // Refresh the forms list for this website
          chrome.storage.local.get("formData", function (data) {
            if (data.formData && data.formData[website]) {
              showWebsiteForms(website, data.formData[website]);
            } else {
              // If last form was deleted, reload the full list
              loadFormsData();
              document.getElementById("formDetails").innerHTML =
                '<div class="empty-state">Select a form to view details</div>';
            }
          });

          showStatusMessage("Form deleted");
        }
      }
    );
  }
}

// Filter forms list by search term
function filterFormsList() {
  const searchTerm = document.getElementById("searchForms").value.toLowerCase();
  const websiteItems = document.querySelectorAll(".website-item");

  websiteItems.forEach((item) => {
    const websiteName = item.dataset.website.toLowerCase();
    if (websiteName.includes(searchTerm)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
}

// Check for forms on the current page
function checkCurrentPageForms() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];

    // Try to send a message to the content script
    chrome.tabs
      .sendMessage(currentTab.id, { action: "getPageForms" })
      .then((response) => {
        if (response && response.forms) {
          updateCurrentPageInfo(response.forms);
        }
      })
      .catch((error) => {
        console.log("Error querying page forms:", error);
        document.getElementById("currentPageInfo").textContent =
          'Unable to detect forms. Try refreshing the page and clicking "Scan Page for Forms"';
        document.getElementById("scanPageButton").style.backgroundColor =
          "#f44336";
      });
  });
}

// Update the current page info section
function updateCurrentPageInfo(forms) {
  const infoElement = document.getElementById("currentPageInfo");

  if (forms.length === 0) {
    infoElement.textContent = "No forms detected on this page";
    document.getElementById("fillFormsButton").disabled = true;
    return;
  }

  const totalFields = forms.reduce((sum, form) => sum + form.fields.length, 0);

  infoElement.innerHTML = `
      <div class="page-forms-info">
        <div><strong>${forms.length}</strong> form${
    forms.length !== 1 ? "s" : ""
  } detected</div>
        <div><strong>${totalFields}</strong> total field${
    totalFields !== 1 ? "s" : ""
  }</div>
      </div>
    `;

  document.getElementById("fillFormsButton").disabled = false;
}

// Trigger auto-fill on the current page
function triggerAutoFill() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // First try to use the message approach
    chrome.tabs
      .sendMessage(tabs[0].id, { action: "manualFill" })
      .then((response) => {
        if (response && response.success) {
          showStatusMessage("Auto-fill triggered");

          // Update statistics
          chrome.runtime.sendMessage({
            action: "updateStatistics",
            key: "formsFilled",
            increment: 1,
          });
        }
      })
      .catch((error) => {
        console.log(
          "Error using message approach, trying direct script injection:",
          error
        );

        // Try direct script injection instead
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            function: function () {
              if (
                window.smartFormFiller &&
                window.smartFormFiller.attemptAutoFill
              ) {
                console.log("Directly triggering auto-fill");
                window.smartFormFiller.attemptAutoFill();
                return true;
              } else {
                console.error("Unable to find auto-fill function");
                return false;
              }
            },
          },
          (results) => {
            if (results && results[0] && results[0].result) {
              showStatusMessage("Auto-fill triggered");
            } else {
              showStatusMessage("Failed to auto-fill forms", true);
            }
          }
        );
      });
  });
}

// Scan current page for forms
function scanCurrentPage() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // Instead of reloading, inject the content script again
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: function () {
          // Re-initialize the form detection
          if (window.smartFormFiller && window.smartFormFiller.initialize) {
            console.log("Re-initializing form detection");
            window.smartFormFiller.initialize();
          } else {
            console.error("Unable to find initialize function");
          }
        },
      },
      () => {
        // After injection, check for forms
        setTimeout(() => {
          checkCurrentPageForms();
          showStatusMessage("Page scanned for forms");
        }, 500);
      }
    );
  });
}

// Show status message
function showStatusMessage(message, isError = false) {
  // Create status element if it doesn't exist
  let statusElement = document.getElementById("statusMessage");

  if (!statusElement) {
    statusElement = document.createElement("div");
    statusElement.id = "statusMessage";
    document.body.appendChild(statusElement);
  }

  // Set message and class
  statusElement.textContent = message;
  statusElement.className =
    "status-message" + (isError ? " error" : " success");

  // Show message
  statusElement.classList.add("visible");

  // Hide after 3 seconds
  setTimeout(function () {
    statusElement.classList.remove("visible");
  }, 3000);
}
