# Smart Form Filler Chrome Extension

This extension will:

1. Monitor forms that users fill out
2. Store form data securely in Chrome storage
3. Recognize similar forms in the future
4. Automatically fill in forms based on past behavior
5. Use a lightweight ML approach to recognize semantically similar questions

## Key Components:

1. **manifest.json**: Configuration with necessary permissions
2. **content.js**: Monitors form interactions and handles auto-filling
3. **background.js**: Manages data storage and ML functionality
4. **popup.html/js**: User interface for controlling the extension
5. **formProcessing.js**: Helper functions for form analysis
6. **mlEngine.js**: Simple ML functionality for text similarity
