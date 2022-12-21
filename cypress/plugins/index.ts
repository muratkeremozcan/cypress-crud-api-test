import * as token from '../../scripts/cypress-token'
import cypressReplay from '@replayio/cypress'
const cyDataSession = require('cypress-data-session/src/plugin')
/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  on('task', token)

  const allConfigs = Object.assign(
    {},
    // add plugins here
    cypressReplay(on, config),
    cyDataSession(on, config)
  )

  return allConfigs
}
