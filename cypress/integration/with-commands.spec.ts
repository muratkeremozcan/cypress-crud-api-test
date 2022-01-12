import { datatype, address } from '@withshepherd/faker'

describe('Crud operations', () => {
  let token
  before(() => cy.task('token').then((t) => (token = t)))

  it('cruds an order', () => {
    let pizzaId = datatype.number()

    cy.createOrder(token, { pizza: pizzaId, address: address.streetAddress() })

    cy.getOrders(token)
      .its('body')
      .then((orders) => {
        const ourPizza = Cypress._.filter(
          orders,
          (order) => order.pizza === pizzaId
        )

        cy.wrap(ourPizza.length).should('eq', 1)

        const orderId = ourPizza[0].orderId

        cy.updateOrder(token, orderId, {
          pizza: ++pizzaId,
          address: address.streetAddress()
        })

        cy.getOrder(token, orderId)

        cy.deleteOrder(token, orderId)
      })
  })

  it('BDD style assertions', () => {
    let pizzaId = datatype.number()

    cy.createOrder(token, { pizza: pizzaId, address: address.streetAddress() })
      .its('status')
      .should('eq', 201)

    cy.getOrders(token)
      .its('body')
      .then((orders) => {
        const ourPizza = Cypress._.filter(
          orders,
          (order) => order.pizza === pizzaId
        )

        cy.wrap(ourPizza.length).should('eq', 1)

        const orderId = ourPizza[0].orderId

        cy.updateOrder(token, orderId, {
          pizza: ++pizzaId,
          address: address.streetAddress()
        })
          .as('update')
          .its('status')
          .should('eq', 200)
        cy.get('@update').its('body.pizza').should('eq', pizzaId)

        cy.getOrder(token, orderId).as('get').its('status').should('eq', 200)
        cy.get('@get').its('body.pizza').should('eq', pizzaId)

        cy.deleteOrder(token, orderId).its('status').should('eq', 200)
      })
  })

  it('TDD style assertions', () => {
    let pizzaId = datatype.number()

    cy.createOrder(token, {
      pizza: pizzaId,
      address: address.streetAddress()
    })
      .its('status')
      .should('eq', 201)

    cy.getOrders(token)
      .its('body')
      .then((orders) => {
        const ourPizza = Cypress._.filter(
          orders,
          (order) => order.pizza === pizzaId
        )

        cy.wrap(ourPizza.length).should('eq', 1)

        const orderId = ourPizza[0].orderId

        cy.updateOrder(token, orderId, {
          pizza: ++pizzaId,
          address: address.streetAddress()
        }).should((res) => {
          expect(res.status).to.eq(200)
          expect(res.body.pizza).to.eq(pizzaId)
        })

        cy.getOrder(token, orderId).should((res) => {
          expect(res.status).to.eq(200)
          expect(res.body.pizza).to.eq(pizzaId)
        })

        cy.deleteOrder(token, orderId).should((res) => {
          expect(res.status).to.eq(200)
        })
      })
  })

  it('BDD with .then using cy.wrap', () => {
    let pizzaId = datatype.number()

    cy.createOrder(token, {
      pizza: pizzaId,
      address: address.streetAddress()
    })
      .its('status')
      .should('eq', 201)

    cy.getOrders(token)
      .its('body')
      .then((orders) => {
        const ourPizza = Cypress._.filter(
          orders,
          (order) => order.pizza === pizzaId
        )

        cy.wrap(ourPizza.length).should('eq', 1)

        const orderId = ourPizza[0].orderId

        cy.updateOrder(token, orderId, {
          pizza: ++pizzaId,
          address: address.streetAddress()
        }).then((res) => {
          cy.wrap(res.status).should('eq', 200)
          cy.wrap(res.body.pizza).should('eq', pizzaId)
        })

        cy.getOrder(token, orderId).then((res) => {
          cy.wrap(res.status).should('eq', 200)
          cy.wrap(res.body.pizza).should('eq', pizzaId)
        })

        cy.deleteOrder(token, orderId).then((res) => {
          cy.wrap(res.status).should('eq', 200)
        })
      })
  })
})
