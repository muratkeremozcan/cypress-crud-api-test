import spok from 'cy-spok'
import { datatype, address } from '@withshepherd/faker'

describe('Crud operations with cy spok', () => {
  let token
  before(() => cy.task('token').then((t) => (token = t)))

  const pizzaId = datatype.number()
  const editedPizzaId = +pizzaId
  const postPayload = { pizza: pizzaId, address: address.streetAddress() }
  const putPayload = {
    pizza: editedPizzaId,
    address: address.streetAddress()
  }

  // the common properties between the assertions
  const commonProperties = {
    address: spok.string,
    orderId: spok.test(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/), // regex pattern to match any id
    status: (s) => expect(s).to.be.oneOf(['pending', 'delivered'])
  }

  // common spok assertions between put and get
  const satisfyAssertions = spok({
    pizza: editedPizzaId,
    ...commonProperties
  })

  it('cruds an order, uses spok assertions', () => {
    cy.createOrder(token, postPayload).its('status').should('eq', 201)

    cy.getOrders(token)
      .should((res) => expect(res.status).to.eq(200))
      .its('body')
      .then((orders) => {
        const ourPizza = Cypress._.filter(
          orders,
          (order) => order.pizza === pizzaId
        )
        cy.wrap(ourPizza.length).should('eq', 1)
        const orderId = ourPizza[0].orderId

        cy.getOrder(token, orderId)
          .its('body')
          .should(
            spok({
              pizza: pizzaId,
              ...commonProperties
            })
          )

        cy.updateOrder(token, orderId, putPayload)
          .its('body')
          .should(satisfyAssertions)

        cy.getOrder(token, orderId).its('body').should(satisfyAssertions)

        cy.deleteOrder(token, orderId).its('status').should('eq', 200)
      })
  })
})
