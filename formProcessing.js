// Smart Form Filler - Form Processing Helper
// Provides utility functions for form detection and analysis

// Find all forms on the current page
function detectForms() {
  const forms = document.querySelectorAll("form");
  return Array.from(forms).map((form) => {
    return {
      element: form,
      id: getFormIdentifier(form),
      fields: detectFormFields(form),
    };
  });
}

// Detect all fields within a form
function detectFormFields(form) {
  const inputSelectors = [
    'input:not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="hidden"])',
    "select",
    "textarea",
  ];

  const inputs = form.querySelectorAll(inputSelectors.join(","));
  return Array.from(inputs).map((input) => extractFieldInfo(input, form));
}

// Extract detailed information about a form field
function extractFieldInfo(input, form) {
  // Get basic properties
  const info = {
    element: input,
    id: input.id || "",
    name: input.name || "",
    type: input.type || input.tagName.toLowerCase(),
    value: "",
    required: input.required || false,
    disabled: input.disabled || false,
    readonly: input.readOnly || false,
    label: "",
    placeholder: input.placeholder || "",
    context: extractContextText(input, form), // Nearby text that provides context
    position: getElementPosition(input), // Position metrics for field identification
    semanticType: null, // Will be filled by ML engine
  };

  // Get current value based on input type
  if (input.type === "checkbox" || input.type === "radio") {
    info.value = input.checked ? input.value || "true" : "";
    info.checked = input.checked;
  } else if (input.tagName === "SELECT") {
    info.value = input.value;
    info.options = Array.from(input.options).map((opt) => ({
      value: opt.value,
      text: opt.text,
      selected: opt.selected,
    }));
  } else {
    info.value = input.value;
  }

  // Find associated label
  info.label = findFieldLabel(input, form);

  // Determine semantic type using ML engine (if available)
  if (window.mlEngine && window.mlEngine.analyzeFieldSemantics) {
    info.semanticType = window.mlEngine.analyzeFieldSemantics(info);
  }

  return info;
}

// Find a label associated with an input field
function findFieldLabel(input, form) {
  let label = "";

  // Method 1: Check for explicit label association
  if (input.id) {
    const labelElement = form.querySelector(`label[for="${input.id}"]`);
    if (labelElement) {
      label = labelElement.textContent.trim();
    }
  }

  // Method 2: Check for parent label
  if (!label) {
    const parentLabel = input.closest("label");
    if (parentLabel) {
      // Extract text content excluding the input's own text
      const clone = parentLabel.cloneNode(true);
      const inputs = clone.querySelectorAll("input, select, textarea, button");
      inputs.forEach((el) => el.remove());
      label = clone.textContent.trim();
    }
  }

  // Method 3: Check for preceding text node or element
  if (!label) {
    // Look for preceding text or elements that might serve as labels
    let prev = input.previousElementSibling;
    while (prev && !label) {
      // Skip empty elements
      if (prev.textContent.trim()) {
        // Check if it's close enough to likely be a label
        const distance = getElementDistance(prev, input);
        if (distance < 100) {
          // Threshold in pixels
          label = prev.textContent.trim();
        }
      }
      prev = prev.previousElementSibling;
    }
  }

  // Method 4: Use aria-label attribute
  if (!label && input.getAttribute("aria-label")) {
    label = input.getAttribute("aria-label").trim();
  }

  // Method 5: Use placeholder as fallback
  if (!label && input.placeholder) {
    label = input.placeholder;
  }

  // Method 6: Use name as last resort
  if (!label && input.name) {
    // Convert camelCase or snake_case to readable text
    label = input.name
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .toLowerCase();
  }

  return label;
}

// Extract text around a field to provide context
function extractContextText(input, form) {
  // Get text within a certain distance of the input
  const contextElements = [];
  const rect = input.getBoundingClientRect();
  const center = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };

  // Find text elements near the input
  const textNodes = [];
  const walker = document.createTreeWalker(form, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.textContent.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const element = node.parentElement;

    // Skip hidden elements or inputs themselves
    if (
      element.offsetParent === null ||
      element.tagName === "INPUT" ||
      element.tagName === "SELECT" ||
      element.tagName === "TEXTAREA"
    ) {
      continue;
    }

    const nodeRect = element.getBoundingClientRect();
    const nodeCenter = {
      x: nodeRect.left + nodeRect.width / 2,
      y: nodeRect.top + nodeRect.height / 2,
    };

    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(center.x - nodeCenter.x, 2) +
        Math.pow(center.y - nodeCenter.y, 2)
    );

    // If close enough, add to context
    if (distance < 150) {
      // 150px radius
      textNodes.push({
        text: node.textContent.trim(),
        distance: distance,
      });
    }
  }

  // Sort by distance and join
  return textNodes
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5) // Take only the 5 closest
    .map((node) => node.text)
    .join(" ");
}

// Get position metrics for a field
function getElementPosition(element) {
  const rect = element.getBoundingClientRect();
  const docRect = document.documentElement.getBoundingClientRect();

  return {
    top: rect.top - docRect.top,
    left: rect.left - docRect.left,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + rect.width / 2 - docRect.left,
    centerY: rect.top + rect.height / 2 - docRect.top,
  };
}

// Calculate distance between two elements
function getElementDistance(element1, element2) {
  const rect1 = element1.getBoundingClientRect();
  const rect2 = element2.getBoundingClientRect();

  const center1 = {
    x: rect1.left + rect1.width / 2,
    y: rect1.top + rect1.height / 2,
  };

  const center2 = {
    x: rect2.left + rect2.width / 2,
    y: rect2.top + rect2.height / 2,
  };

  return Math.sqrt(
    Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2)
  );
}

// Generate a unique identifier for a form
function getFormIdentifier(form) {
  // First priority: explicit ID
  if (form.id) return form.id;

  // Second priority: form action URL
  if (form.action) {
    try {
      return new URL(form.action).pathname;
    } catch (e) {
      // Invalid URL, continue to next method
    }
  }

  // Third priority: create a signature based on field names
  let signature = "";
  const inputs = form.querySelectorAll(
    "input[name], select[name], textarea[name]"
  );

  if (inputs.length > 0) {
    signature = Array.from(inputs)
      .map((input) => input.name || input.id || "")
      .filter((name) => name.length > 0)
      .sort()
      .join("|");
  }

  // Fourth priority: position-based identifier
  if (!signature) {
    const formRect = form.getBoundingClientRect();
    const pageRect = document.body.getBoundingClientRect();
    signature = `form_${Math.round(formRect.top - pageRect.top)}_${Math.round(
      formRect.left - pageRect.left
    )}`;
  }

  return signature || "unknown_form";
}

// Generate a structured representation of the form
function createFormSignature(form) {
  const fields = detectFormFields(form);

  return {
    id: getFormIdentifier(form),
    url: window.location.hostname,
    path: window.location.pathname,
    numFields: fields.length,
    fieldTypes: fields.map((f) => f.type),
    fieldNames: fields.map((f) => f.name).filter((n) => n),
    fieldLabels: fields.map((f) => f.label).filter((l) => l),
    requiredFields: fields.filter((f) => f.required).length,
  };
}

// Export functions to make them available to other scripts
window.formProcessor = {
  detectForms,
  detectFormFields,
  extractFieldInfo,
  findFieldLabel,
  getFormIdentifier,
  createFormSignature,
};
