export default [
  {
    files: ["app.js", "crypto.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        Blob: "readonly",
        FileReader: "readonly",
        URL: "readonly",
        alert: "readonly",
        atob: "readonly",
        btoa: "readonly",
        confirm: "readonly",
        crypto: "readonly",
        document: "readonly",
        encryptPayload: "readonly",
        decryptPayload: "readonly",
        localStorage: "readonly",
        setTimeout: "readonly",
        structuredClone: "readonly",
        TextDecoder: "readonly",
        TextEncoder: "readonly",
        window: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-undef": "error",
      "prefer-const": "error"
    }
  }
  ,
  {
    files: ["crypto.js"],
    rules: {
      "no-unused-vars": "off"
    }
  }
];
