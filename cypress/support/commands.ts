import { datatype, address } from '@withshepherd/faker'

const headers = (token) => ({
  'Access-Token': token
})

Cypress.Commands.add(
  'createOrder',
  (
    token: string,
    body = {
      pizza: datatype.number(),
      address: address.streetAddress()
    },
    allowedToFail = false
  ) =>
    cy.log('**createOrder**').api({
      method: 'POST',
      url: `/orders`,
      headers: headers(token),
      body,
      retryOnStatusCodeFailure: !allowedToFail,
      failOnStatusCode: !allowedToFail
    })
)

Cypress.Commands.add('getOrders', (token: string, allowedToFail = false) =>
  cy.log('**getOrders**').api({
    method: 'GET',
    url: `/orders`,
    headers: headers(token),
    retryOnStatusCodeFailure: !allowedToFail,
    failOnStatusCode: !allowedToFail
  })
)

Cypress.Commands.add(
  'getOrder',
  (token: string, orderId: string, allowedToFail = false) =>
    cy.log('**getOrder**').api({
      method: 'GET',
      url: `/orders/${orderId}`,
      headers: headers(token),
      retryOnStatusCodeFailure: !allowedToFail,
      failOnStatusCode: !allowedToFail
    })
)

Cypress.Commands.add(
  'updateOrder',
  (
    token: string,
    orderId: string,
    body = {
      pizza: datatype.number(),
      address: address.streetAddress()
    },
    allowedToFail = false
  ) =>
    cy.log('**updateOrder**').api({
      method: 'PUT',
      url: `/orders/${orderId}`,
      headers: headers(token),
      body,
      retryOnStatusCodeFailure: !allowedToFail,
      failOnStatusCode: !allowedToFail
    })
)

Cypress.Commands.add(
  'deleteOrder',
  (token: string, orderId: string, allowedToFail = false) =>
    cy.log('**deleteOrder**').api({
      method: 'DELETE',
      url: `/orders/${orderId}`,
      headers: headers(token),
      retryOnStatusCodeFailure: !allowedToFail,
      failOnStatusCode: !allowedToFail
    })
)
