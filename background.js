// Smart Form Filler - Background Script
// Manages form data storage and coordinates ML functionality

console.log("Smart Form Filler background script loaded");

// Initialize when the extension is installed or updated
chrome.runtime.onInstalled.addListener(function (details) {
  console.log("Extension installed or updated:", details.reason);

  // Initialize storage with default values
  chrome.storage.local.set(
    {
      formData: {},
      isEnabled: true,
      settings: {
        autoFillDelay: 1000,
        minimumConfidence: 0.7,
        enablePasswordFill: false,
        collectStatistics: true,
      },
      statistics: {
        formsDetected: 0,
        formsFilled: 0,
        fieldsLearned: 0,
        lastUsed: null,
      },
    },
    function () {
      console.log("Smart Form Filler initialized with default settings");
    }
  );
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // Handle saving form data from content script
  if (request.action === "saveFormData") {
    saveFormData(request.url, request.formId, request.fields);
    updateStatistics("formsDetected", 1);
    sendResponse({ success: true });
  }

  // Handle single field update
  else if (request.action === "updateField") {
    updateField(request.url, request.formId, request.field);
    sendResponse({ success: true });
  }

  // Handle settings retrieval
  else if (request.action === "getSettings") {
    chrome.storage.local.get(
      ["settings", "isEnabled", "statistics"],
      function (data) {
        sendResponse({
          settings: data.settings,
          isEnabled: data.isEnabled,
          statistics: data.statistics,
        });
      }
    );
    return true; // Keep the message channel open for async response
  }

  // Handle settings update
  else if (request.action === "updateSettings") {
    chrome.storage.local.set(
      {
        settings: request.settings,
        isEnabled: request.isEnabled,
      },
      function () {
        sendResponse({ success: true });
      }
    );
    return true; // Keep the message channel open for async response
  }

  // Handle form data retrieval
  else if (request.action === "getFormData") {
    chrome.storage.local.get("formData", function (data) {
      sendResponse({ formData: data.formData });
    });
    return true; // Keep the message channel open for async response
  }

  // Handle form data deletion
  else if (request.action === "deleteFormData") {
    deleteFormData(request.url, request.formId);
    sendResponse({ success: true });
  }

  // Handle statistics reset
  else if (request.action === "resetStatistics") {
    resetStatistics();
    sendResponse({ success: true });
  }

  // Return true to indicate async response (if needed)
  return true;
});

// Save form data to storage
function saveFormData(url, formId, fields) {
  chrome.storage.local.get("formData", function (data) {
    const formData = data.formData || {};

    // Initialize URL entry if it doesn't exist
    if (!formData[url]) {
      formData[url] = {};
    }

    // Save form fields
    formData[url][formId] = fields;

    // Update storage
    chrome.storage.local.set({ formData: formData }, function () {
      console.log(`Saved form data for ${url} / ${formId}`);
      updateStatistics("fieldsLearned", fields.length);
    });
  });
}

// Update a single field in storage
function updateField(url, formId, field) {
  chrome.storage.local.get("formData", function (data) {
    const formData = data.formData || {};

    // Initialize URL and form entries if they don't exist
    if (!formData[url]) formData[url] = {};
    if (!formData[url][formId]) formData[url][formId] = [];

    // Find if the field already exists
    const existingIndex = formData[url][formId].findIndex(
      (f) => f.id === field.id || f.name === field.name
    );

    if (existingIndex >= 0) {
      // Update existing field
      formData[url][formId][existingIndex] = field;
    } else {
      // Add new field
      formData[url][formId].push(field);
      updateStatistics("fieldsLearned", 1);
    }

    // Update storage
    chrome.storage.local.set({ formData: formData }, function () {
      console.log(
        `Updated field ${field.id || field.name} for ${url} / ${formId}`
      );
    });
  });
}

// Delete form data
function deleteFormData(url, formId) {
  chrome.storage.local.get("formData", function (data) {
    const formData = data.formData || {};

    if (formData[url]) {
      if (formId) {
        // Delete specific form
        delete formData[url][formId];

        // Clean up empty URL entry
        if (Object.keys(formData[url]).length === 0) {
          delete formData[url];
        }
      } else {
        // Delete all forms for this URL
        delete formData[url];
      }

      // Update storage
      chrome.storage.local.set({ formData: formData }, function () {
        console.log(
          `Deleted form data for ${url}${formId ? " / " + formId : ""}`
        );
      });
    }
  });
}

// Update statistics
function updateStatistics(key, increment) {
  chrome.storage.local.get("statistics", function (data) {
    const statistics = data.statistics || {
      formsDetected: 0,
      formsFilled: 0,
      fieldsLearned: 0,
      lastUsed: null,
    };

    // Update the specific statistic
    if (statistics[key] !== undefined) {
      statistics[key] += increment;
    }

    // Update last used timestamp
    statistics.lastUsed = new Date().toISOString();

    // Save updated statistics
    chrome.storage.local.set({ statistics: statistics }, function () {
      console.log(`Updated statistics: ${key} += ${increment}`);
    });
  });
}

// Reset statistics
function resetStatistics() {
  const resetStats = {
    formsDetected: 0,
    formsFilled: 0,
    fieldsLearned: 0,
    lastUsed: new Date().toISOString(),
  };

  chrome.storage.local.set({ statistics: resetStats }, function () {
    console.log("Statistics reset");
  });
}

// Set badge to indicate active status
function updateBadge(isEnabled) {
  const badgeText = isEnabled ? "ON" : "OFF";
  const badgeColor = isEnabled ? "#4CAF50" : "#F44336";

  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

// Listen for changes to storage
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (namespace === "local") {
    // Update badge when enabled status changes
    if (changes.isEnabled) {
      updateBadge(changes.isEnabled.newValue);
    }
  }
});

// Initialize badge
chrome.storage.local.get("isEnabled", function (data) {
  updateBadge(data.isEnabled !== false);
});
