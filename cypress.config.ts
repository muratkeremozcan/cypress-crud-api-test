import { defineConfig } from 'cypress'

export default defineConfig({
  viewportWidth: 1000,
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.ts')(on, config)
    },
    baseUrl: 'https://2afo7guwib.execute-api.us-east-1.amazonaws.com/latest'
  }
})
