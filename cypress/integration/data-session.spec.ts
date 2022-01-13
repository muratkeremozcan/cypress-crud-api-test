import { address } from '@withshepherd/faker'

describe('Crud operations using data session', () => {
  let token
  // if this id is new it will work just like regular createOrder,
  // if it is a duplicate, it will reuse that order
  const pizzaId = 83030

  before(() => cy.task('token').then((t) => (token = t)))

  it('If the pizza by id already exists in the DB re-uses it, otherwise creates a new order', () => {
    cy.maybeCreateOrder('orderSession', token, {
      pizza: pizzaId,
      address: address.streetAddress()
    })

    cy.getOrders(token)
      .its('body')
      .then((orders) => {
        const ourPizza = Cypress._.filter(
          orders,
          (order) => order.pizza === pizzaId
        )
        cy.wrap(ourPizza.length).should('be.gt', 0)
        const orderId = ourPizza[0].orderId

        // let's not change the orderId so that we can demo data session

        cy.getOrder(token, orderId).as('get').its('status').should('eq', 200)
        cy.get('@get').its('body.pizza').should('eq', pizzaId)

        // try toggling the delete,
        // next time the test runs it can re-use the order
        // if we did not delete it the previous run
        // cy.deleteOrder(token, orderId).its('status').should('eq', 200)
      })
  })
})
