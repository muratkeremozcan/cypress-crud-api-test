/// <reference types="cypress" />

/* eslint-disable @typescript-eslint/no-var-requires */
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************
// import the token function

import * as token from '../../scripts/cypress-token'

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
    cyDataSession(on, config)
  )

  return allConfigs
}
