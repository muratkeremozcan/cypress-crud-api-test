import { datatype, address } from '@withshepherd/faker'

describe('Crud operations', () => {
  let token
  before(() => cy.task('token').then((t) => (token = t)))

  it('cruds an order', () => {
    let pizzaId = datatype.number()

    cy.api({
      method: 'POST',
      url: `/orders`,
      headers: {
        'Access-Token': token
      },
      body: {
        pizza: pizzaId,
        address: address.streetAddress()
      }
    })

    cy.api({
      method: 'GET',
      url: `/orders`,
      headers: {
        'Access-Token': token
      }
    })
      .its('body')
      .then((orders) => {
        const ourPizza = Cypress._.filter(
          orders,
          (order) => order.pizza === pizzaId
        )

        cy.wrap(ourPizza.length).should('eq', 1)

        const orderId = ourPizza[0].orderId

        cy.log(orderId)

        cy.api({
          method: 'PUT',
          url: `/orders/${orderId}`,
          headers: {
            'Access-Token': token
          },
          body: {
            pizza: ++pizzaId,
            address: address.streetAddress()
          }
        })

        cy.api({
          method: 'GET',
          url: `/orders/${orderId}`,
          headers: {
            'Access-Token': token
          }
        })

        cy.api({
          method: 'DELETE',
          url: `/orders/${orderId}`,
          headers: {
            'Access-Token': token
          }
        })
      })
  })
})
