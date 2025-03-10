// Smart Form Filler - ML Engine
// Provides advanced ML functionality for form field matching and pattern learning

// This is a simplified ML approach suitable for a Chrome extension
// It uses text similarity techniques to match form fields and forms

// Common field patterns and their variations
const FIELD_PATTERNS = {
  // Identity fields
  identity: {
    patterns: [
      "name",
      "fullname",
      "username",
      "user",
      "login",
      "firstname",
      "lastname",
      "surname",
    ],
    types: ["text", "string"],
    valuePatterns: [/^[A-Za-z\s\-'\.]+$/],
  },
  // Contact fields
  contact: {
    patterns: [
      "email",
      "mail",
      "e-mail",
      "phone",
      "telephone",
      "mobile",
      "cell",
      "fax",
      "contact",
    ],
    types: ["email", "tel", "text"],
    valuePatterns: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // email
      /^[\d\+\-\(\)\s\.]+$/, // phone
    ],
  },
  // Numeric fields
  numeric: {
    patterns: ["age", "year", "number", "amount", "quantity", "count", "total"],
    types: ["number", "range"],
    valuePatterns: [/^\d+$/],
  },
  // Selection fields
  selection: {
    patterns: [
      "category",
      "type",
      "group",
      "option",
      "choice",
      "select",
      "topic",
    ],
    types: ["select", "select-one", "radio"],
    valuePatterns: [],
  },
  // Boolean fields
  boolean: {
    patterns: [
      "subscribe",
      "newsletter",
      "agree",
      "accept",
      "terms",
      "consent",
      "opt",
    ],
    types: ["checkbox", "radio"],
    valuePatterns: [/^(yes|no|true|false|0|1)$/i],
  },
  // Message fields
  message: {
    patterns: [
      "message",
      "comment",
      "feedback",
      "description",
      "details",
      "notes",
    ],
    types: ["textarea", "text"],
    valuePatterns: [],
  },
  // Address fields
  address: {
    patterns: [
      "address",
      "street",
      "city",
      "state",
      "country",
      "zip",
      "postal",
      "code",
    ],
    types: ["text", "string"],
    valuePatterns: [],
  },
  // Date fields
  date: {
    patterns: ["date", "day", "month", "year", "birth", "dob", "start", "end"],
    types: ["date", "datetime-local", "text"],
    valuePatterns: [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // M/D/YY or MM/DD/YYYY
    ],
  },
};

// Enhanced stopwords list
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "to",
  "from",
  "in",
  "out",
  "on",
  "off",
  "for",
  "of",
  "by",
  "with",
  "about",
  "against",
  "between",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "up",
  "down",
  "please",
  "enter",
  "your",
  "you",
  "this",
  "that",
  "field",
  "input",
  "select",
  "choose",
  "fill",
  "write",
  "required",
  "optional",
  "form",
  "submit",
  "reset",
  "clear",
]);

// Common field types and their variations
const FIELD_TYPES = {
  name: [
    "name",
    "fullname",
    "firstname",
    "lastname",
    "full-name",
    "first-name",
    "last-name",
  ],
  email: ["email", "e-mail", "mail"],
  phone: ["phone", "telephone", "mobile", "cell", "contact"],
  address: ["address", "street", "city", "state", "zip", "postal"],
  company: ["company", "organization", "employer", "business"],
  title: ["title", "position", "job-title", "role"],
  experience: [
    "experience",
    "work-experience",
    "employment-history",
    "work-history",
  ],
  education: ["education", "school", "university", "college", "degree"],
  skills: ["skills", "expertise", "qualifications", "competencies"],
};

// Calculate similarity between two text strings with advanced pattern matching
function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;

  // Convert to lowercase and tokenize
  const tokens1 = tokenizeText(text1.toLowerCase());
  const tokens2 = tokenizeText(text2.toLowerCase());

  // If either has no tokens after processing, they can't match
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  // Check for field pattern matches
  for (const [category, info] of Object.entries(FIELD_PATTERNS)) {
    const isType1 = info.patterns.some((p) =>
      tokens1.some((t) => t.includes(p))
    );
    const isType2 = info.patterns.some((p) =>
      tokens2.some((t) => t.includes(p))
    );
    if (isType1 && isType2) return 0.9; // High confidence but not perfect
  }

  // Calculate advanced similarity scores
  const exactMatchScore = calculateExactMatchScore(tokens1, tokens2);
  const partialMatchScore = calculatePartialMatchScore(tokens1, tokens2);
  const orderScore = calculateOrderScore(tokens1, tokens2);
  const lengthScore = calculateLengthScore(tokens1, tokens2);

  // Weighted combination of scores
  return (
    exactMatchScore * 0.4 +
    partialMatchScore * 0.3 +
    orderScore * 0.2 +
    lengthScore * 0.1
  );
}

// Calculate score for exact token matches
function calculateExactMatchScore(tokens1, tokens2) {
  const intersection = new Set(tokens1.filter((t) => tokens2.includes(t)));
  const union = new Set([...tokens1, ...tokens2]);
  return intersection.size / union.size;
}

// Calculate score for partial token matches
function calculatePartialMatchScore(tokens1, tokens2) {
  let matches = 0;
  let total = 0;

  for (const t1 of tokens1) {
    for (const t2 of tokens2) {
      if (t1.includes(t2) || t2.includes(t1)) {
        matches++;
      }
      total++;
    }
  }

  return total > 0 ? matches / total : 0;
}

// Calculate score based on token order
function calculateOrderScore(tokens1, tokens2) {
  const len = Math.min(tokens1.length, tokens2.length);
  if (len === 0) return 0;

  let orderMatches = 0;
  for (let i = 0; i < len; i++) {
    if (tokens1[i] === tokens2[i]) {
      orderMatches++;
    }
  }

  return orderMatches / len;
}

// Calculate score based on length similarity
function calculateLengthScore(tokens1, tokens2) {
  const maxLen = Math.max(tokens1.length, tokens2.length);
  const minLen = Math.min(tokens1.length, tokens2.length);
  return maxLen > 0 ? minLen / maxLen : 0;
}

// Calculate similarity between two field objects with improved matching
function calculateFieldSimilarity(field1, field2) {
  // Perfect matches
  if (field1.id && field2.id && field1.id === field2.id) return 1.0;
  if (field1.name && field2.name && field1.name === field2.name) return 1.0;

  // Calculate various similarity scores
  const scores = {
    type: calculateTypeCompatibility(field1, field2),
    label: calculateTextSimilarity(field1.label, field2.label) * 0.35,
    name: calculateTextSimilarity(field1.name, field2.name) * 0.25,
    placeholder:
      calculateTextSimilarity(field1.placeholder, field2.placeholder) * 0.2,
    class: calculateTextSimilarity(field1.class, field2.class) * 0.1,
    value: calculateValuePatternSimilarity(field1.value, field2.value) * 0.1,
  };

  // Get field categories
  const category1 = determineFieldCategory(field1);
  const category2 = determineFieldCategory(field2);

  // Boost score if fields are of the same category
  let finalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  if (category1 === category2 && category1 !== "unknown") {
    finalScore = Math.min(1.0, finalScore * 1.2); // 20% boost but cap at 1.0
  }

  return finalScore;
}

// Calculate compatibility between field types
function calculateTypeCompatibility(field1, field2) {
  if (field1.type === field2.type) return 1.0;

  // Check if types belong to the same category
  for (const info of Object.values(FIELD_PATTERNS)) {
    if (info.types.includes(field1.type) && info.types.includes(field2.type)) {
      return 0.8; // High compatibility for related types
    }
  }

  return 0.2; // Low compatibility for different types
}

// Calculate similarity between field values based on patterns
function calculateValuePatternSimilarity(value1, value2) {
  if (!value1 || !value2) return 0;

  // Check if values match any known patterns
  for (const info of Object.values(FIELD_PATTERNS)) {
    for (const pattern of info.valuePatterns) {
      const matches1 = pattern.test(value1);
      const matches2 = pattern.test(value2);
      if (matches1 && matches2) return 0.9;
    }
  }

  // Fallback to basic text similarity
  return calculateTextSimilarity(value1, value2);
}

// Determine the category of a field based on its attributes
function determineFieldCategory(field) {
  const text = [
    field.label || "",
    field.name || "",
    field.placeholder || "",
    field.id || "",
    field.class || "",
  ]
    .join(" ")
    .toLowerCase();

  for (const [category, info] of Object.entries(FIELD_PATTERNS)) {
    // Check if field type matches category
    if (info.types.includes(field.type)) {
      // Check if any patterns match
      if (info.patterns.some((pattern) => text.includes(pattern))) {
        return category;
      }
    }
    // Check patterns even if type doesn't match (for more flexible matching)
    else if (info.patterns.some((pattern) => text.includes(pattern))) {
      return category;
    }
  }

  return "unknown";
}

// Calculate similarity between two forms with improved matching
function calculateFormSimilarity(form1, form2) {
  // If exact match, return 1
  if (form1.id === form2.id) return 1.0;

  // Compare form structures
  const structure1 = analyzeFormStructure(form1);
  const structure2 = analyzeFormStructure(form2);

  // Calculate structure similarity
  const structureSimilarity = compareFormStructures(structure1, structure2);

  // Calculate field pattern similarity
  const patternSimilarity = compareFieldPatterns(form1, form2);

  // Weighted combination
  return structureSimilarity * 0.6 + patternSimilarity * 0.4;
}

// Analyze form structure
function analyzeFormStructure(form) {
  return {
    fieldTypes: countFieldTypes(form),
    fieldCategories: countFieldCategories(form),
    totalFields: form.elements.length,
  };
}

// Count occurrences of each field type
function countFieldTypes(form) {
  const types = {};
  Array.from(form.elements).forEach((element) => {
    types[element.type] = (types[element.type] || 0) + 1;
  });
  return types;
}

// Count occurrences of each field category
function countFieldCategories(form) {
  const categories = {};
  Array.from(form.elements).forEach((element) => {
    const category = determineFieldCategory(element);
    categories[category] = (categories[category] || 0) + 1;
  });
  return categories;
}

// Compare form structures
function compareFormStructures(structure1, structure2) {
  // Compare field type distributions
  const typeSimilarity = compareDistributions(
    structure1.fieldTypes,
    structure2.fieldTypes
  );

  // Compare field category distributions
  const categorySimilarity = compareDistributions(
    structure1.fieldCategories,
    structure2.fieldCategories
  );

  // Compare total fields
  const sizeSimilarity =
    Math.min(structure1.totalFields, structure2.totalFields) /
    Math.max(structure1.totalFields, structure2.totalFields);

  return typeSimilarity * 0.4 + categorySimilarity * 0.4 + sizeSimilarity * 0.2;
}

// Compare two distributions of field types or categories
function compareDistributions(dist1, dist2) {
  const allKeys = new Set([...Object.keys(dist1), ...Object.keys(dist2)]);
  let similarity = 0;

  allKeys.forEach((key) => {
    const val1 = dist1[key] || 0;
    const val2 = dist2[key] || 0;
    similarity += Math.min(val1, val2) / Math.max(val1, val2);
  });

  return allKeys.size > 0 ? similarity / allKeys.size : 0;
}

// Compare field patterns between forms
function compareFieldPatterns(form1, form2) {
  const patterns1 = extractFieldPatterns(form1);
  const patterns2 = extractFieldPatterns(form2);

  return calculateTextSimilarity(patterns1.join(" "), patterns2.join(" "));
}

// Extract patterns from form fields
function extractFieldPatterns(form) {
  return Array.from(form.elements)
    .map((element) => determineFieldCategory(element))
    .filter((category) => category !== "unknown");
}

// Tokenize text into words, removing stopwords and special characters
function tokenizeText(text) {
  if (!text) return [];

  // Remove special characters and split by whitespace
  const tokens = text
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOPWORDS.has(word));

  return tokens;
}

// Find semantic clusters among a set of fields
// This could be used to identify fields that ask for the same information
function findFieldClusters(fields) {
  // This is a simplified clustering algorithm
  // A more sophisticated approach would use proper clustering techniques

  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < fields.length; i++) {
    if (assigned.has(i)) continue;

    const cluster = [fields[i]];
    assigned.add(i);

    for (let j = i + 1; j < fields.length; j++) {
      if (assigned.has(j)) continue;

      const similarity = calculateFieldSimilarity(fields[i], fields[j]);
      if (similarity > 0.8) {
        // Threshold for clustering
        cluster.push(fields[j]);
        assigned.add(j);
      }
    }

    if (cluster.length > 0) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

// Analyze a field to extract semantic meaning
// This helps identify what kind of information the field is asking for
function analyzeFieldSemantics(field) {
  // This is a simplified semantic analysis
  // We're looking for patterns in the field attributes

  const text = [
    field.label || "",
    field.name || "",
    field.placeholder || "",
    field.id || "",
  ]
    .join(" ")
    .toLowerCase();

  // Check for common patterns
  const patterns = {
    email: /email|e-mail/,
    name: /name|fullname|full[\s-]name|first[\s-]name|last[\s-]name/,
    phone: /phone|mobile|cell|telephone/,
    address: /address|street|city|state|zip|postal/,
    password: /password|pwd|pass/,
    username: /username|user[\s-]name|login/,
    creditcard: /card|credit|ccv|cvv|cvc|expir/,
    date: /date|dob|birth|day|month|year/,
  };

  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return category;
    }
  }

  return "unknown";
}

// Export functions to make them available to other scripts
window.mlEngine = {
  calculateTextSimilarity,
  calculateFieldSimilarity,
  calculateFormSimilarity,
  findFieldClusters,
  analyzeFieldSemantics,
  determineFieldCategory,
  FIELD_PATTERNS,
};
