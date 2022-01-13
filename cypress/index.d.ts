/* eslint-disable @typescript-eslint/no-unused-vars */

import { Order } from './support/commands'

/* eslint-disable @typescript-eslint/no-explicit-any */
export {}

declare global {
  namespace Cypress {
    interface Chainable<Subject> {
      /** Creates an order with an optionally specified body.
       * ```js
       * cy.createOrder(token)
       * cy.createOrder(token, { pizza: 1, address: '123 Main St' })
       * ```
       */
      createOrder(
        token: string,
        body?: Order,
        allowedToFail?: boolean
      ): Chainable<any>

      /** Gets a list of orders
       * ```js
       * cy.getOrder(token, orderId)
       * ```
       */
      getOrders(token: string, allowedToFail?: boolean): Chainable<any>

      /** Gets an order by id
       * ```js
       * cy.getOrder(token, orderId)
       * ```
       */
      getOrder(
        token: string,
        id: string,
        allowedToFail?: boolean
      ): Chainable<any>

      /** Updates an order by id with an optionally specified body
       * ```js
       * cy.updateOrder(token, orderId, { pizza: 2, address: '456 Main St' })
       * ```
       */
      updateOrder(
        token: string,
        id: string,
        body?: Order,
        allowedToFail?: boolean
      ): Chainable<any>

      /** Deletes an order by id
       * ```js
       * cy.deleteOrder(token, orderId)
       * ```
       */
      deleteOrder(
        token: string,
        id: string,
        allowedToFail?: boolean
      ): Chainable<any>

      /** Checks if a pizza by the given ID exists before trying to create an order.
       * If no pizza is found, creates an order
       * If there is already a Pizza with the given id, re-uses it  does not incur api costs.
       */
      maybeCreateOrder(
        sessionName: string,
        token: string,
        body?: Order
      ): Chainable<any>
    }
  }
}
