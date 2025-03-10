// Smart Form Filler - Content Script
// This script monitors form interactions and handles auto-filling

console.log("Smart Form Filler loaded");

// Global variables
let formData = {};
let isExtensionEnabled = true;
const pageUrl = window.location.hostname;

// Enhanced error handling and debugging
function logDebug(message, data = null) {
  const debug = true; // Set to false in production
  if (debug) {
    console.log(`[Smart Form Filler] ${message}`, data || "");
  }
}

function handleError(error, context) {
  console.error(`[Smart Form Filler] Error in ${context}:`, error);
  // You can implement error reporting here if needed
}

// Define all helper functions first

// Collect all data from a form
function collectFormData(form) {
  try {
    const formFields = [];
    const inputs = form.querySelectorAll("input, select, textarea");

    logDebug(`Found ${inputs.length} input fields in form`);

    inputs.forEach((input) => {
      try {
        const fieldInfo = getFieldInfo(input);
        if (fieldInfo.value) {
          // Only collect non-empty fields
          formFields.push(fieldInfo);
        }
      } catch (error) {
        handleError(
          error,
          `collectFormData - processing input ${input.name || input.id}`
        );
      }
    });

    return formFields;
  } catch (error) {
    handleError(error, "collectFormData");
    return [];
  }
}

// Get detailed information about a field
function getFieldInfo(input) {
  // Get field label
  let label = "";
  let fieldId = input.id || input.name;

  // Try different methods to find a label
  if (input.id) {
    const labelElement = document.querySelector(`label[for="${input.id}"]`);
    if (labelElement) {
      label = labelElement.textContent.trim();
    }
  }

  // If no label found, try to use placeholder or name
  if (!label) {
    label = input.placeholder || input.name || "";
  }

  // Get field value based on type
  let value = "";

  if (input.type === "checkbox" || input.type === "radio") {
    value = input.checked ? input.value || "true" : "";
  } else if (input.tagName === "SELECT") {
    value = input.value;
  } else {
    value = input.value;
  }

  return {
    id: fieldId,
    type: input.type || input.tagName.toLowerCase(),
    label: label,
    name: input.name || "",
    placeholder: input.placeholder || "",
    class: input.className || "",
    value: value,
  };
}

// Generate a unique identifier for a form
function getFormIdentifier(form) {
  // Use form ID, action, or create a signature based on field names
  if (form.id) return form.id;
  if (form.action) return new URL(form.action).pathname;

  // Create a signature based on form fields
  let signature = "";
  const inputs = form.querySelectorAll(
    "input[name], select[name], textarea[name]"
  );
  inputs.forEach((input) => {
    signature += input.name + ";";
  });

  return signature || "unknown_form";
}

// Check if two forms are similar
function isSimilarForm(formId1, formId2) {
  // Use the ML engine's form similarity function
  return calculateFormSimilarity(formId1, formId2) > 0.8; // Threshold of 0.8
}

// Find the best matching field from saved data with improved matching
function findBestMatchingField(currentField, savedFields) {
  let bestMatch = null;
  let highestScore = 0;

  // Get the category of the current field
  const currentCategory = window.mlEngine.determineFieldCategory(currentField);

  savedFields.forEach((savedField) => {
    // Calculate similarity score with improved matching
    const score = window.mlEngine.calculateFieldSimilarity(
      currentField,
      savedField
    );

    // Get category of saved field
    const savedCategory = window.mlEngine.determineFieldCategory(savedField);

    logDebug(
      `Field similarity: ${
        currentField.name || currentField.id
      } (${currentCategory}) -> ${
        savedField.name || savedField.id
      } (${savedCategory}) = ${score}`
    );

    // Use a lower threshold (0.6) for fields of the same category
    const threshold =
      currentCategory === savedCategory && currentCategory !== "unknown"
        ? 0.6
        : 0.7;

    if (score > highestScore && score > threshold) {
      highestScore = score;
      bestMatch = savedField;
    }
  });

  return bestMatch;
}

// Fill a field with the given value
function fillField(input, value) {
  if (!value) return;

  if (input.type === "checkbox" || input.type === "radio") {
    input.checked = value === "true" || value === input.value;
  } else if (input.tagName === "SELECT") {
    input.value = value;
  } else {
    input.value = value;

    // Trigger change event
    const event = new Event("input", { bubbles: true });
    input.dispatchEvent(event);
  }

  console.log("Filled field:", input.name || input.id, "with value:", value);
}

// Setup monitoring for all forms on the page with improved error handling
function setupFormMonitoring() {
  try {
    // Find all forms on the page
    const forms = document.querySelectorAll("form");
    logDebug(`Found ${forms.length} forms on page`);

    // Also look for form-like containers that might be dynamic forms
    const possibleForms = document.querySelectorAll(
      'div[role="form"], div.form, .form-container'
    );
    logDebug(`Found ${possibleForms.length} possible dynamic forms`);

    const allForms = [...forms, ...possibleForms];

    allForms.forEach((form) => {
      try {
        // Track form submission - use capture to ensure we get the event
        form.addEventListener(
          "submit",
          function (event) {
            logDebug("Form submission detected");

            if (!isExtensionEnabled) return;

            try {
              // Collect data from this form
              const formFields = collectFormData(form);
              logDebug("Collected form data:", formFields);

              // Send to background script for processing and storage
              chrome.runtime.sendMessage(
                {
                  action: "saveFormData",
                  url: pageUrl,
                  formId: getFormIdentifier(form),
                  fields: formFields,
                },
                (response) => {
                  if (chrome.runtime.lastError) {
                    handleError(
                      chrome.runtime.lastError,
                      "saveFormData message"
                    );
                  } else {
                    logDebug("Form data saved:", response);
                  }
                }
              );
            } catch (error) {
              handleError(error, "form submission handler");
            }
          },
          true
        );

        // Add event listeners for all input fields
        const inputs = form.querySelectorAll("input, select, textarea");
        logDebug(`Found ${inputs.length} input fields in form`);

        inputs.forEach((input) => {
          try {
            // Use both change and blur events to capture more input changes
            ["change", "blur", "input"].forEach((eventType) => {
              input.addEventListener(eventType, function (event) {
                if (!isExtensionEnabled) return;

                logDebug(`Field update detected: ${input.name || input.id}`);

                try {
                  // Get field information
                  const fieldInfo = getFieldInfo(input);

                  // Send individual field update
                  chrome.runtime.sendMessage(
                    {
                      action: "updateField",
                      url: pageUrl,
                      formId: getFormIdentifier(form),
                      field: fieldInfo,
                    },
                    (response) => {
                      if (chrome.runtime.lastError) {
                        handleError(
                          chrome.runtime.lastError,
                          "updateField message"
                        );
                      } else {
                        logDebug("Field update saved:", response);
                      }
                    }
                  );
                } catch (error) {
                  handleError(error, "field update handler");
                }
              });
            });
          } catch (error) {
            handleError(
              error,
              `setting up listeners for input ${input.name || input.id}`
            );
          }
        });
      } catch (error) {
        handleError(
          error,
          `setting up form monitoring for form ${getFormIdentifier(form)}`
        );
      }
    });
  } catch (error) {
    handleError(error, "setupFormMonitoring");
  }
}

// Attempt to auto-fill forms on the page with improved matching
function attemptAutoFill() {
  logDebug("Attempting auto-fill");

  if (!isExtensionEnabled) {
    logDebug("Extension disabled, not filling forms");
    return;
  }

  chrome.storage.local.get(["formData", "settings"], function (data) {
    formData = data.formData || {};
    const settings = data.settings || {};

    // Get all forms including form-like containers
    const forms = document.querySelectorAll(
      "form, div[role='form'], div.form, .form-container"
    );

    forms.forEach((form) => {
      const formId = getFormIdentifier(form);
      logDebug(`Checking form ${formId}`);

      // Find relevant form data across all domains
      const relevantData = findRelevantFormData(form, formData);

      if (Object.keys(relevantData).length === 0) {
        logDebug("No matching forms found");
        return;
      }

      logDebug(
        `Found ${Object.keys(relevantData).length} potential matching forms`
      );

      // Collect all fields from relevant forms
      const allSavedFields = [];
      Object.values(relevantData).forEach((fields) => {
        allSavedFields.push(...fields);
      });

      // Get all input elements
      const inputs = form.querySelectorAll("input, select, textarea");

      inputs.forEach((input) => {
        try {
          // Skip password fields for security
          if (input.type === "password") {
            logDebug("Skipping password field for security");
            return;
          }

          const fieldInfo = getFieldInfo(input);
          logDebug(`Processing field: ${fieldInfo.name || fieldInfo.id}`);

          // Find the best matching saved field
          const matchingField = findBestMatchingField(
            fieldInfo,
            allSavedFields
          );

          if (matchingField) {
            logDebug(
              `Found matching field: ${matchingField.name || matchingField.id}`
            );
            fillField(input, matchingField.value);
          } else {
            logDebug("No matching field found");
          }
        } catch (error) {
          handleError(error, `processing input ${input.name || input.id}`);
        }
      });

      // Update statistics
      chrome.runtime.sendMessage({
        action: "updateStatistics",
        key: "formsFilled",
        increment: 1,
      });
    });
  });
}

// Find relevant form data across all domains
function findRelevantFormData(currentForm, allFormData) {
  const relevantData = {};

  // Get current form structure
  const currentFormStructure = {
    id: getFormIdentifier(currentForm),
    fields: Array.from(currentForm.elements).map(getFieldInfo),
  };

  // Check forms from all domains
  Object.entries(allFormData).forEach(([domain, domainForms]) => {
    Object.entries(domainForms).forEach(([formId, fields]) => {
      const savedFormStructure = {
        id: formId,
        fields: fields,
      };

      // Calculate form similarity
      const similarity = calculateFormSimilarity(
        currentFormStructure,
        savedFormStructure
      );

      logDebug(`Form similarity with ${domain}/${formId}: ${similarity}`);

      // Use a lower threshold (0.5) to be more inclusive
      if (similarity > 0.5) {
        relevantData[`${domain}/${formId}`] = fields;
      }
    });
  });

  return relevantData;
}

// Calculate similarity between two forms
function calculateFormSimilarity(form1, form2) {
  // Get field categories for both forms
  const categories1 = form1.fields.map((f) =>
    window.mlEngine.determineFieldCategory(f)
  );
  const categories2 = form2.fields.map((f) =>
    window.mlEngine.determineFieldCategory(f)
  );

  // Calculate category distribution similarity
  const catSet = new Set([...categories1, ...categories2]);
  let categorySimilarity = 0;

  catSet.forEach((category) => {
    const count1 = categories1.filter((c) => c === category).length;
    const count2 = categories2.filter((c) => c === category).length;
    categorySimilarity += Math.min(count1, count2) / Math.max(count1, count2);
  });

  categorySimilarity = catSet.size > 0 ? categorySimilarity / catSet.size : 0;

  // Calculate field type similarity
  const types1 = form1.fields.map((f) => f.type);
  const types2 = form2.fields.map((f) => f.type);
  const typeSet = new Set([...types1, ...types2]);
  let typeSimilarity = 0;

  typeSet.forEach((type) => {
    const count1 = types1.filter((t) => t === type).length;
    const count2 = types2.filter((t) => t === type).length;
    typeSimilarity += Math.min(count1, count2) / Math.max(count1, count2);
  });

  typeSimilarity = typeSet.size > 0 ? typeSimilarity / typeSet.size : 0;

  // Calculate size similarity
  const sizeSimilarity =
    Math.min(form1.fields.length, form2.fields.length) /
    Math.max(form1.fields.length, form2.fields.length);

  // Return weighted average
  return categorySimilarity * 0.5 + typeSimilarity * 0.3 + sizeSimilarity * 0.2;
}

// Handle messages from popup/background
function handleMessages(request, sender, sendResponse) {
  console.log("Message received:", request.action);

  if (request.action === "getPageForms") {
    // Collect all forms on the page and their fields
    const pageForms = [];
    const forms = document.querySelectorAll("form");

    forms.forEach((form) => {
      const formId = getFormIdentifier(form);
      const fields = collectFormData(form);

      pageForms.push({
        id: formId,
        fields: fields,
      });
    });

    console.log("Sending form data to popup:", pageForms);
    sendResponse({ forms: pageForms });
  } else if (request.action === "toggleExtension") {
    isExtensionEnabled = request.isEnabled;
    console.log("Extension " + (isExtensionEnabled ? "enabled" : "disabled"));
    sendResponse({ success: true });
  } else if (request.action === "manualFill") {
    console.log("Manual fill requested");
    attemptAutoFill();
    sendResponse({ success: true });
  }

  return true; // Keep the message channel open for async response
}

// Initialize with retry mechanism
function initialize() {
  try {
    // Check if the ML engine is available
    if (!window.mlEngine) {
      logDebug("ML Engine not loaded yet, retrying in 1 second...");
      setTimeout(initialize, 1000);
      return;
    }

    // Setup form monitoring
    setupFormMonitoring();

    // Setup mutation observer to detect dynamically added forms
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          const addedForms = [];
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === "FORM") {
              addedForms.push(node);
            } else if (node.querySelectorAll) {
              const forms = node.querySelectorAll(
                'form, div[role="form"], div.form, .form-container'
              );
              addedForms.push(...forms);
            }
          });

          if (addedForms.length > 0) {
            logDebug(`Detected ${addedForms.length} new forms`);
            addedForms.forEach((form) => {
              try {
                setupFormMonitoring();
              } catch (error) {
                handleError(error, "handling dynamically added form");
              }
            });
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    logDebug("Initialization complete");
  } catch (error) {
    handleError(error, "initialize");
    // Retry initialization after a delay
    setTimeout(initialize, 2000);
  }
}

// Start initialization when the document is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}

// Make the initialize function available globally
window.smartFormFiller = {
  initialize: initialize,
  attemptAutoFill: attemptAutoFill,
};
