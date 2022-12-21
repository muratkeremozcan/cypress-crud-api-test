import './commands'
import 'cypress-data-session'
import 'cypress-each'
// import '@bahmutov/cy-api'
import 'cypress-plugin-api' // toggle between cy-api and cypress-plugin-api
import '@replayio/cypress/support'

chai.config.truncateThreshold = 200 // test if we can see more than [object Object] in replay tests
