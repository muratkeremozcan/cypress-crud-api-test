## Prerequisite: add `Delete` and `Update` capabilities to our stack

> If you are only interested in going through the e2e onboarding, skip or skim this section.

In order to add delete and update capabilities to our orders service, we will need to enhance our:

1. model

2. repository

3. service

4. lambdas

5. api stack

   

Note that this is the same flow we have followed throughout the course to build our service step by step.

### Enhance `src/models/order.ts`

Add the new interface to the bottom:

```typescript
export interface OrderUpdateProps {
  total: number
}
```

### Enhance `src/repositories/orders-repository`

Import our new model at the top of the file. 

Add delete and update functions to our OrdersRepsitory class.

```typescript
import type { Order, OrderUpdateProps } from '../models/order'

// ...

export class OrdersRepository extends BaseRepository {

	// .... We can add the new functions to the bottom of the class
  
/** delete a specific entity */
  async deleteOne(orderId: string): Promise<null> {
    const params: DocumentClient.DeleteItemInput = {
      TableName: this.tableName,
      Key: primaryKey(orderId),
    }

    await this.client.delete(params).promise()
    
    return null
  }

  /** update a specific entity if it exists, deserialize it before returning */
  async updateOne(orderId: string, options: OrderUpdateProps): Promise<Order | null> {
    const params: DocumentClient.UpdateItemInput = {
      TableName: this.tableName,
      Key: primaryKey(orderId),
      UpdateExpression: 'set #total = :total',
      ExpressionAttributeNames: { '#total': 'total' },
      ExpressionAttributeValues: {
        ':total': options.total,
      },
      ReturnValues: 'ALL_NEW', // needed to return the updated entity
    }

    const result = await this.client.update(params).promise()
    if (!result.Attributes) return null

    return deserialize(result.Attributes as OrderEntity)
  }
}
```

 #### Enhance `src/services/orders-service.ts`

Import the new model from above, and add delete and update functions to the OrdersService class:

```typescript
import type { Order, OrderCreateProps, OrderUpdateProps } from '../models/order'

export class OrdersService<T> {
  
  // ...

  /** Delete an order */
  async deleteOne(orderId: string): Promise<null> {
    await this.repository.deleteOne(orderId)

    return null
  }

  /** Update an order */
  async updateOne(orderId: string, options: OrderUpdateProps): Promise<Order | null> {
    const order = await this.repository.updateOne(orderId, options)

    return order || null
  }
}
```

#### Enhance our API stack `cdk/stacks/api.ts`

We add the 2 routes for delete and put. The key change is the cors options for the shared resourcePath `/orders/{id}` having to come after the related routes.

```typescript
api.route({
  resourcePath: '/orders/{id}',
  httpMethod: 'GET',
  name: 'orders-get',
  handler: 'orders-get.handler',
})
// notice we removed the cors option from here

api.route({
  resourcePath: '/orders/{id}',
  httpMethod: 'DELETE',
  name: 'orders-delete',
  handler: 'orders-delete.handler',
})

api.route({
  resourcePath: '/orders/{id}',
  httpMethod: 'PUT',
  name: 'orders-update',
  handler: 'orders-update.handler',
})
// the cors option has to come at the end of the related routes
api.addCorsOption('/orders/{id}', ['GET', 'PUT', 'DELETE']) 
```

### Add new lambdas for delete and update

Ensure that `packages/events/extend-events.ts` has your service name; add it as a type and add it to the interface.

```typescript
export type ExtendEventType = 'mschrepelservice/some-event' | 'muratkeremozcanService/some-event'

export interface ExtendEventsMap extends EventMap<ExtendEventType> {
  'mschrepelservice/some-event': Order
  'muratkeremozcanService/some-event': Order
}
```

#### `src/lambdas/api/orders-delete.ts`

Make sure to replace the string `mschrepelservice` with your own service.

```typescript
import { extendEvents } from '../../../../../packages/events'
import { getOrdersService } from '../../lib/get-service'
import { apiHandlerStack, jwtAuthorizeClaims } from '../../../../../packages/middy-stack'
import log from '../../../../../packages/logger'

const service = getOrdersService()

const lambda = async (event: any) => {
  const contextualLogger = log.info('orders-delete invoked with:', event.body)

  try {
    const { pathParameters } = event
    const { id: orderId } = pathParameters

    await service.deleteOne(orderId)

    contextualLogger.info('order deleted successfully', orderId)
    contextualLogger.info('publishing mschrepelservice/some-event')

    await extendEvents.producer.publish('mschrepelservice/some-event', orderId)
    contextualLogger.info('publishing mschrepelservice/some-event')

    return {
      statusCode: 200,
      body: 'Delete successful!',
    }
  } catch (e: unknown) {
    log.error('Error in mschrepelservice orders-delete', e)
    return {
      statusCode: 500,
      body: 'Internal error',
    }
  }
}

export const handler = apiHandlerStack(lambda, {
  authRequired: true,
  jwtAuthorize: jwtAuthorizeClaims({
    scopes: 'orders:order:delete',
  }),
})
```

#### `src/lambdas/api/orders-update.ts`

Make sure to replace the string `mschrepelservice` with your own service.

```typescript
import { extendEvents } from '../../../../../packages/events'
import { getOrdersService } from '../../lib/get-service'
import { apiHandlerStack, jwtAuthorizeClaims } from '../../../../../packages/middy-stack'
import log from '../../../../../packages/logger'

const service = getOrdersService()

/** If the payload needs parsing, do so, otherwise return as is */
function safeJSONParse(body: string) {
  try {
    return JSON.parse(body)
  } catch (e) {
    return body
  }
}

const lambda = async (event: any) => {
  const contextualLogger = log.info('orders-update invoked with:', event.body)

  try {
    const { pathParameters } = event
    const { id: orderId } = pathParameters

    const { total } = safeJSONParse(event.body)
    const orderProperties = { total }

    const order = await service.updateOne(orderId, orderProperties)

    contextualLogger.child({ orderId })
    contextualLogger.info('order updated successfully', orderId)
    contextualLogger.info('publishing mschrepelservice/some-event')

    await extendEvents.producer.publish('mschrepelservice/some-event', orderId)
    contextualLogger.info('publishing mschrepelservice/some-event')

    return {
      statusCode: 200,
      body: JSON.stringify(order),
    }
  } catch (e: unknown) {
    log.error('Error in mschrepelservice orders-update', e)
    return {
      statusCode: 500,
      body: 'Internal error',
    }
  }
}

export const handler = apiHandlerStack(lambda, {
  authRequired: true,
  jwtAuthorize: jwtAuthorizeClaims({
    scopes: 'orders:order:update',
  }),
})

```


A replica of all the modifications until this point can be found at `./reference-code/Chapter 7 - with delete and put`

### Deploy the enhancements

As we have done throughout the course, we have to deploy our service.

> If you have not yet created helper script functions for some of the below by now, [here is the reference](https://helloextend.atlassian.net/wiki/spaces/ENG/pages/327695/Extend+CLI#Login) from Extend CLI.

```bash
ec aws creds login && ec yarn login ## login
ec aws creds assume -e playground ## assume role

## at ./src/<yourServiceFolder>/cdk
cdk synth
cdk deploy --all --profile playground

## optionally check at the AWS console
ec aws console # this will open a console, sign in with your extend account
ec aws console -e playground # this will log you into this env, switch role and you are in
# check the region (N.Virginia, us-east-1) and verify the stack at CloudFormation
```

### Test the newly added Delete and Update capabilities

You can use any tool for this, including the source controlled `test.rest` file at  `reference-code/Chapter 7 - with delete and put/test.rest`

1. At repo root run `yarn validtoken-withscopes Password123` . Copy the token into the `@token parameter in the `test.rest` file.
2. Copy your stack's base url to the `@baseUrl` parameter.
3. Send a request using `postOrder` function. Grab the id from the response and copy it to the `@orderId` parameter.
4. `getOrder`, `putOrder`, `deleteOrder` should all respond with 200s.

## In case you are only interested in the e2e onboarding at this time

Make sure you have cloned and installed the repository `https://github.com/helloextend/onboarding-bootcamp.git` without issues.

Create a branch, and copy the contents of `reference-code/Chapter 7 - with delete and put` to a folder under `src/<yourServiceName>` . In this case, the deployed service will be the instructor's instance, but you will be able to add the e2e files.

Before you start the e2e onboarding, make sure you can fully test the service as described in the previous section. Mind that since you are using the instructor's service instance, you do not have to update the `@baseUrl` parameter in the `test.rest` file.



## Begin e2e

### Scaffold Cypress into your service folder & add scripts

While at your `src/username` directory in bash, execute the command: `npx @bahmutov/cly init --typescript  `. It will scaffold a Cypress folder to your directory.

In `package.json` add two scripts under the scripts property. We add a prefix to these commands so that we can run Cypress off of the root/node_modules.

>In this entire onboarding course, we do not install anything to our service folder.

```json
"scripts": {
  "cy:open": "../../node_modules/.bin/cypress open",
  "cy:run": "../../node_modules/.bin/cypress run"
}
```

While at your directory, try out these commands. They will run the scaffolded tests. 

```bash	
yarn cy:run # runs headlessly
yarn cy:open # uses the test runner
```

At this point all should be working out of the box.

### Add `cy-api` plugin 

Although Cypress is mostly known as a UI e2e testing tool, it has excellent API testing capabilities thanks to its [request api](https://docs.cypress.io/api/commands/request). We will take that a step further using [cy.api plugin](https://github.com/bahmutov/cy-api) -which is a fancy wrapper over cy.request- so that we have a visual pane showing the network data. This is only a visual addition to what we could observe in DevTools; not only it improves the local developer experience but also helps us diagnose CI executions easier through [Cypress Dashboard](https://dashboard.cypress.io/organizations) run record videos.

The plugin has been installed at the repo root, but we still need to import the types and the functions.
Move the `tsconfig.json` file -which got created with the scaffolding- from `src/<yourService>/` to the Cypress folder `src/<yourService>/cypress`. Add to this file types for  `"@bahmutov/cy-api"`. 

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["es5", "dom"],
    "types": ["cypress", "@bahmutov/cy-api"]
  },
  "include": ["**/*.ts"]
}
```

Now we have to add the functions. At `cypress/support/index.ts`, insert the below line to the top.

```typescript
import '@bahmutov/cy-api/support'

// we can remove the rest of the code in the file

```

> This is the generic process to install any Cypress plugin, and there are [tons of them](https://docs.cypress.io/plugins/directory).

At this point, the cypress folder should be looking like as below, and your directory should have a `cypress.json` file.

```bash
cypress
├── fixtures
│   └── example.json
├── integration
│   └── spec.ts
├── plugins
│   └── index.ts
├── support
│   └── index.ts
└── tsconfig.json
├── README.md
```

Run `yarn cy:open` or `yarn cy:run` scripts one more time.

> If you removed the rest of the code from the `cypress/support/index.ts`, the scaffolded test for calling the custom command should fail at `reference-code/e2e/cypress/integration/spec.ts`. Remove the test also since it is not relevant anymore.

If all is regression free, we can empty out the scaffolded spec file and start creating a new tests.

### Ensure that we can get a token

Before we start our tests, we have to ensure that we can get a token. In the onboarding course, we are running TS scripts to generate various signed tokens. In the real world we would have a function to acquire a token for us, but here we will utilize these scripts as well. [cy.task](https://docs.cypress.io/api/commands/task) allows us to run any JS/TS code within the context of Cypress.

Let's import the function into our `cypress/plugins/index.ts` file so that we can use it. Import the token function and add a task for the token.

```typescript
// import the token function
import * as token from '../../../../scripts/cypress-token'

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  on('task', {
    log(x) {
      // prints into the terminal's console
      console.log(x)

      return null
    },
  })

  // our new task
  on('task', token)
}

```

Now let us go to the spec file at `src/<yourService>/cypress/integration/spec.ts` and write a test to make sure that we get a  string from this function.

> Note that Cypress re-executes spec files on saved changes, but if the `plugins/index` file is changed we have to stop Cypress test runner and start the test again.

```typescript
describe('Crud operations', () => {
  it('gets token', () => {
    cy.task('token').should('be.a', 'string')
		
    // if we want to specify the argument this fn should be called with
	  cy.task('token', 'myOwnPassword').should('be.a', 'string')
  })
})
```

Cypress has a declarative chaining syntax that pipes inputs and outputs. Most of the time, you do not even need to deal with the values going through the chain. Async/await makes it much easier to unwrap values, but [Commands are not Promises](https://docs.cypress.io/guides/core-concepts/introduction-to-cypress.html#Commands-Are-Not-Promises), using `await` on a Cypress chain will not work as expected. This is a [very conscious and important design decision](https://docs.cypress.io/faq/questions/using-cypress-faq#Can-I-use-the-new-ES7-async-await-syntax) that gives Cypress a fluid, functional programming inspired, observable-stream-like api that many begin to prefer over what they have been used to.

We will usually want to acquire a token and build a state before our e2e tests. This happens in the before hooks. Here we want to get a token before the tests begin, and make the token value avaiable throughout the test. In Cypress there are [three ways to access values from before hooks within the tests](aq/questions/using-cypress-faq#Can-I-use-the-new-ES7-async-await-syntax). At Extend and in this exercise, we use the one we find to be cleanest. Let us make sure we get a token in a before block, and access that value in the it block.

```typescript

describe('Crud operations', () => {
  let token
  
  // assign the value we get to our token variable
  before( () => cy.task('token').then(t => token = t ))
  
  it('gets token', () => {
    // log to the runner (we can also log to DevTools via console.log)
    cy.log(token)
  })
})
```

### Configure our baseUrl

 We need our unique aws stack base url. Let us add it to Cypress config at `./src/yourUserName/cypress.json`

```typescript
// at your root folder's cypress.json file, add baseUrl property
// if you are using the instructor's reference code, you can copy the below value
// otherwise, change it to the baseUrl of your service
{
  "baseUrl": "https://abu8x9thp0.execute-api.us-east-1.amazonaws.com/prod"
}
```

Once this change is made, we can observe the Cypress runner restart. If we go to the Settings tab and expand Configuration, we can spot our `baseUrl`. Note that there are a plethora of ways to configure Cypress (cypress.json, cypress.env.json, config folder etc.) and all valid configuration values get reflected here; it is a good way to test if what you configured works locally.

TODO: insert Cypress-configurat.png to Confluence.

### GET an order

Let us try to GET one of our orders. By this point, we have some orders that we previously generated via Postman or [VsCode REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client), we can use one of those to start simple with the idempotent GET request.

The syntax for Cypress [request api](https://docs.cypress.io/api/commands/request) is simple; method, url, headers.

```typescript
describe('Crud operations', () => {
  let token
  // assign the value we get to our token variable
  before(() => cy.task('token').then((t) => (token = t)))

  it('gets an order', () => {
    // we are keeping it simple and getting an existing order
    // if you are using the instructor's stack, you can use this order Id
    const orderId = '57a2415d-9ec6-4c20-bce4-1b7f85219460'

    cy.api({
      method: 'GET',
      url: `orders/${orderId}`,
      headers: {
        'X-Extend-Access-Token': token,
      },
    })
  })
})

```

Using the time travel debugger, click and observe each step. The right pane will display the same information you would find in DevTools.

(insert get-request gif)

### Our crud e2e test strategy

Before we get to assertions, let us write out the full crud operation first. Our API e2e testing strategy is to cover the update case, which inadvertedly covers create, get, update and delete. Why is this? Cypress can test both UIs and APIs, so think of a UI crud operation where you are setting up state or cleaning up via api calls and isolating the UI testing to the feature:

1. Creation

- UI create
- API delete

2. Update

- API create
- UI update
- API delete

3. Delete

- API create
- UI delete

That is a good way to test your UI pieces in isolation, while using api calls to setup & tear down state. 

Now, replace “UI” with “api”. 
It is all overlapping; Update case covers it all. 

>  We have a [strict definition of done](https://helloextend.atlassian.net/wiki/spaces/ENG/pages/1353711882/E2E+test+Definition+of+Done+DoD) for our e2e tests at Extend, and this strategy satisfies the need to leave a clean system state after the execution.

### POST an order

Instead of using a previously created order, let us now create our own, update it and delete it at the end.

Let us start with the POST request. You see the similar api, where we added the body as the payload. We are also yielding the response.body using `its('body')`. [its](https://docs.cypress.io/api/commands/its) is a connector in Cypress which yields a property's value on the previously yielded subject. It has Cypress function level [retry-ability](https://docs.cypress.io/guides/core-concepts/retry-ability) built-in to it, so it will retry the api call until that propery is exists; i.e. the outgoing POST request has a body property. 

We are not too interested in the status or other aspects at the moment, so we will yield the body and work with it.

```typescript
cy.api({
  method: 'POST',
  url: '/orders',
  headers: {
    'X-Extend-Access-Token': token,
  },
  body: {
    total: 457,
  },
}).its('body')
```

Next is the PUT request. Verify similar to POST, but different url and slightly different payload so that we have a meaningful update.

```typescript
cy.api({
  method: 'PUT',
  url: `/orders/${order.id}`,
  headers: {
    'X-Extend-Access-Token': token,
  },
  body: {
    total: '500',
  },
})
```

And finally, the DELETE request.

```typescript
cy.api({
  method: 'DELETE',
  url: `/orders/${order.id}`,
  headers: {
    'X-Extend-Access-Token': token,
  },
})
```

Putting them all together, we have a full e2e flow.

```typescript
describe('Crud operations', () => {
  let token
  before(() => cy.task('token').then((t) => (token = t)))

  it('should create, get, update, delete an order', () => {
    cy.api({
      method: 'POST',
      url: '/orders',
      headers: {
        'X-Extend-Access-Token': token,
      },
      body: {
        total: 457,
      },
    })
      .its('body')
      .then((order) => {
        cy.api({
          method: 'GET',
          url: `/orders/${order.id}`,
          headers: {
            'X-Extend-Access-Token': token,
          },
        })

        cy.api({
          method: 'PUT',
          url: `/orders/${order.id}`,
          headers: {
            'X-Extend-Access-Token': token,
          },
          body: {
            total: '500',
          },
        })

        cy.api({
          method: 'DELETE',
          url: `/orders/${order.id}`,
          headers: {
            'X-Extend-Access-Token': token,
          },
        })
      })
  })
})

```

### Cypress commands

This is looking a bit verbose. Not necessarily for this example, but in the real world it would be doing things that may be common to many specs. Any time test code may be duplicated, we should think of helper functions (2 -3 specs) which we would import, or Cypress  commands in the global `cy` namespace. For more knowledge on this topic check out [Functional Programming Patterns with Cypress](https://dev.to/muratkeremozcan/functional-test-patterns-with-cypress-27ed).

Common functionality that is to be made available to multiple specs (our recommendation is 3+) could be added as Cypress `Custom commands`. Custom Commands are available to be used globally with the `cy.` prefix. Let's create some commands for practice, and then make a new version of the spec file called `with-commands.spec.ts`.

At your user root, create the file `cypress/support/commands.ts`. 

At `cypress/support/index.ts` import the commands.ts file. Keep the plugin import but delete the rest of the scaffolded code if you have not done so by now. The file content should look like this:

```typescript
import './commands'
import '@bahmutov/cy-api/support'
```

At `cypress/support/commands.ts` add the crud commands as Cypress commands. We only have to wrap them in `Cypress.Commands.add('fnName', .... )`.

```typescript
Cypress.Commands.add(
  'createOrder',
  (
    token: string,
    body = {
      total: 457,
    },
  ) =>
    cy.api({
      method: 'POST',
      url: '/orders',
      headers: {
        'X-Extend-Access-Token': token,
      },
      body,
    }),
)

Cypress.Commands.add('getOrder', (token: string, id: string) =>
  cy.api({
    method: 'GET',
    url: `/orders/${id}`,
    headers: {
      'X-Extend-Access-Token': token,
    },
  }),
)

Cypress.Commands.add(
  'updateOrder',
  (
    token: string,
    id: string,
    body = {
      total: 457,
    },
  ) =>
    cy.api({
      method: 'PUT',
      url: `/orders/${id}`,
      headers: {
        'X-Extend-Access-Token': token,
      },
      body,
    }),
)

Cypress.Commands.add('deleteOrder', (token: string, id: string) =>
  cy.api({
    method: 'DELETE',
    url: `/orders/${id}`,
    headers: {
      'X-Extend-Access-Token': token,
    },
  }),
)
```

Let's also create the file `cypress/index.d.ts` and add type definitions.

```typescript
export {}

declare global {
  namespace Cypress {
    interface Chainable<Subject> {
      /** Creates an order with an optionally specified body.
       * ```js
       * cy.createOrder(token, { total: 457 })
       * ```
       */
      createOrder(token: string, body?: object): Chainable<any>

      /** Gets an order by id
       * ```js
       * cy.getOrder(token, orderId)
       * ```
       */
      getOrder(token: string, id: string): Chainable<any>

      /** Updates an order by id
       * ```js
       * cy.updateOrder(token, orderId, { total: 457 })
       * ```
       */
      updateOrder(token: string, id: string, body?: object): Chainable<any>

      /** Deletes an order by id
       * ```js
       * cy.deleteOrder(token, orderId)
       * ```
       */
      deleteOrder(token: string, id: string): Chainable<any>
    }
  }
}
```

Now we can write a much concise version of our spec using Cypress commands and their type definitions. At file `src/<yourServiceFolder>/cypress/integration/with-commands.spec.ts`

```typescript
describe('Crud operations with cy commands', () => {
  let token
  before(() => cy.task('token').then((t) => (token = t)))

  it('should create, get, update, delete an order', () => {
    cy.createOrder(token)
      .its('body')
      .then(({ id }) => {
        cy.getOrder(token, id)

        cy.updateOrder(token, id)

        cy.deleteOrder(token, id)
      })
  })
})
```

### Adding assertions

At this time we have a complete e2e flow, but we are not testing anything. We should add some assertions to increase our test effectiveness. There is always a fine balance; the more we check the more frail / noisy tests can become, but we also gain more confidence. 

There are [4 ways to do assertions with Cypress](https://www.youtube.com/watch?v=5w6T5xB_SzI&t=9s), 3 of them have [retry ability](https://docs.cypress.io/guides/core-concepts/retry-ability). Retry ability makes Cypress not only a great DOM testing tool - the DOM has many moving parts - but also [a great API client for testing event driven systems](https://dev.to/muratkeremozcan/api-testing-event-driven-systems-7fe). We will create 3 versions of our test, each showing an assertion style with retry ability, and at the end introduce the [cy-spok](https://www.youtube.com/watch?v=OGL_qIS7MZo&t=1s) plugin.

#### BDD style assertions

This is great if you want to spot check a linear path through the response object, and usually you are not worried about other nodes, for example the body.

```typescript
cy.getOrder(token, id).its('status').should('eq', 200)
```

To check the status and the body too, without making additional requests, we can use [aliases](https://docs.cypress.io/guides/core-concepts/variables-and-aliases). They give us the ability to back-track the object tree nodes.

```typescript	
cy.getOrder(token, id).as('get').its('status').should('eq', 200)
cy.get('@get').its('body.id').should('eq', id)

cy.updateOrder(token, id).as('update').its('status').should('eq', 200)
cy.get('@update').its('body.id').should('eq', id)
```

#### TDD style assertions

These are useful if you want to check multiple nodes. Think of `should` as a `then ` that has a retry ability; the expect statements will retry for a predetermined amound of time (<4 secs by default) until the assertion passes.

```typescript
cy.getOrder(token, id).should(res => {
   expect(res.status).to.eq(200)
   expect(res.body.id).to.eq(id)
 })

cy.updateOrder(token, id).should(res => {
  expect(res.status).to.eq(200)
  expect(res.body.id).to.eq(id)
})

cy.deleteOrder(token, id).should(res => {
  expect(res.status).to.eq(200)
})
```

Replace the above `.should`s with `then`s and you have a Jest like assertion that does not retry.

### BDD with .then using cy.wrap

[cy.wrap](https://docs.cypress.io/api/commands/wrap#Syntax) wraps the object or promise passed to it within Cypress context, then yields that object or resolved value of the promise. Here it will give us retry ability, although we are using `.then` instead of `.should`. It also helps us chain the subject -`res`- in the context of Cypress

```typescript
cy.getOrder(token, id).then((res) => {
  cy.wrap(res.status).should('eq', 200)
  cy.wrap(res.body.id).should('eq', id)
})

cy.updateOrder(token, id).then((res) => {
  cy.wrap(res.status).should('eq', 200)
  cy.wrap(res.body.id).should('eq', id)
})

cy.deleteOrder(token, id).then((res) => {
  cy.wrap(res.status).should('eq', 200)
})
```

Here is the complete spec with the 3 retry enabled assertion styles.

```typescript
describe('Crud operations with cy commands', () => {
  let token
  before(() => cy.task('token').then((t) => (token = t)))

  it('should create, get, update, delete an order', () => {
    cy.createOrder(token)
      .its('body')
      .then(({ id }) => {
        cy.getOrder(token, id)

        cy.updateOrder(token, id)

        cy.deleteOrder(token, id)
      })
  })

  it('should do BDD style assertions', () => {
    cy.createOrder(token)
      .its('body')
      .then(({ id }) => {
        cy.getOrder(token, id).as('get').its('status').should('eq', 200)
        cy.get('@get').its('body.id').should('eq', id)

        cy.updateOrder(token, id).as('update').its('status').should('eq', 200)
        cy.get('@update').its('body.id').should('eq', id)

        cy.deleteOrder(token, id).its('status').should('eq', 200)
      })
  })

  it('should do TDD style assertions', () => {
    cy.createOrder(token)
      .its('body')
      .then(({ id }) => {
        cy.getOrder(token, id).should((res) => {
          expect(res.status).to.eq(200)
          expect(res.body.id).to.eq(id)
        })

        cy.updateOrder(token, id).should((res) => {
          expect(res.status).to.eq(200)
          expect(res.body.id).to.eq(id)
        })

        cy.deleteOrder(token, id).should((res) => {
          expect(res.status).to.eq(200)
        })
      })
  })

  it('should do BDD with .then using cy.wrap', () => {
    cy.createOrder(token)
      .its('body')
      .then(({ id }) => {
        cy.getOrder(token, id).then((res) => {
          cy.wrap(res.status).should('eq', 200)
          cy.wrap(res.body.id).should('eq', id)
        })

        cy.updateOrder(token, id).then((res) => {
          cy.wrap(res.status).should('eq', 200)
          cy.wrap(res.body.id).should('eq', id)
        })

        cy.deleteOrder(token, id).then((res) => {
          cy.wrap(res.status).should('eq', 200)
        })
      })
  })
})
```

### Enhance the api commands with additional retry ability

[cy.request](https://docs.cypress.io/api/commands/request) has two properties we love to control. 

* `retryOnStatusCodeFailure`: Whether Cypress should automatically retry status code errors under the hood. Cypress will retry a request up to 4 times if this is set to true.

* `failOnStatusCode` :  Whether to fail on response codes other than `2xx` and `3xx`

  > There is also `retryOnNetworkFailure` which retries  transient network errors under the hood. It is set the true by default.

Let's do some refactoring to our commands and give them supercharged retry abilities. For this example the additional api-retry utilities are overkill, but at Extend this is the standard we follow to ensure flake free tests.

We will add a flag to control the function behavior; by default we want it to fail on non 200 | 300 status codes, and we also want it to retry. By default we leave the value as is, but when we want to assert non 200 | 300 responses, we set this flag to true.

While we are at it, let's add some minimal logging to make the Cypress runner command log more pleasant. At `src/<yourServiceFolder>/cypress/support/commands.ts`

```typescript
/** Common headers for all our api calls */
const headers = (token) => ({
  'X-Extend-Access-Token': token,
})

Cypress.Commands.add(
  'createOrder',
  (
    token: string,
    body = {
      total: 457,
    },
    allowedToFail = false,
  ) =>
    cy.log('**createOrder**').api({
      method: 'POST',
      url: '/orders',
      headers: headers(token),
      body,
      retryOnStatusCodeFailure: !allowedToFail,
      failOnStatusCode: !allowedToFail,
    }),
)

Cypress.Commands.add('getOrder', (token: string, id: string, allowedToFail = false) =>
  cy.log('**getOrder**').api({
    method: 'GET',
    url: `/orders/${id}`,
    headers: headers(token),
    retryOnStatusCodeFailure: !allowedToFail,
    failOnStatusCode: !allowedToFail,
  }),
)

Cypress.Commands.add(
  'updateOrder',
  (
    token: string,
    id: string,
    body = {
      total: 457,
    },
    allowedToFail = false,
  ) =>
    cy.log('**updateOrder**').api({
      method: 'PUT',
      url: `/orders/${id}`,
      headers: headers(token),
      body,
      retryOnStatusCodeFailure: !allowedToFail,
      failOnStatusCode: !allowedToFail,
    }),
)

Cypress.Commands.add('deleteOrder', (token: string, id: string, allowedToFail = false) =>
  cy.log('**deleteOrder**').api({
    method: 'DELETE',
    url: `/orders/${id}`,
    headers: headers(token),
    retryOnStatusCodeFailure: !allowedToFail,
    failOnStatusCode: !allowedToFail,
  }),
)
```

Do not forget to update the type definitions as well.

```typescript
export {}

declare global {
  namespace Cypress {
    interface Chainable<Subject> {
      /** Creates an order with an optionally specified body.
       * ```js
       * cy.createOrder(token, { total: 457 })
       * ```
       */
      createOrder(token: string, body?: object, allowedToFail?): Chainable<any>

      /** Gets an order by id
       * ```js
       * cy.getOrder(token, orderId)
        * ```
       */
      getOrder(token: string, id: string, allowedToFail?): Chainable<any>

      /** Updates an order by id
       * ```js
       * cy.updateOrder(token, orderId, { total: 457 })
       * ```
       */
      updateOrder(token: string, id: string, body?: object, allowedToFail?): Chainable<any>

      /** Deletes an order by id
       * ```js
       * cy.deleteOrder(token, orderId)
       * ```
       */
      deleteOrder(token: string, id: string, allowedToFail?): Chainable<any>
    }
  }
}

```

### Advanced assertions with [`cy-spok` plugin](https://github.com/bahmutov/cy-spok)

Data is the lifeline of our solution at Extend, and while e2e testing an api, we should do a lot more than status assertions and test-context relevant spot checks in order to increase our test effectiveness and release confidence. 

Spok provides abilities to test large amounts **non-deterministic** data with minimal but comprehensive assertions through convenience functions, regex and predicates. It lets us represent sub-objects as assertions, to compose them and use destructuring. Consequently **spok enables us to have higher confidence in our tests without any  additional cost of brittleness and noise**.

Before using spok, we need to enable some new TS features at our `cypress/tsconfig.json` by using `esnext` instead of `es5`, and a few more options.

```json
{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["esnext", "dom"],
    "types": ["cypress", "@bahmutov/cy-api"],
    "moduleResolution": "node"
  },
  "include": ["**/*.ts", "plugins/index.js"]
}

```

#### Add a comment to our order

Let's create a new spec file `src/<yourServiceFolder>/cypress/integration/with-spok.spec.ts`, with the e2e flow. Let's also import spok and add a simple assertion on the getOrder call. Remember to stop the Cypress runner and execute the new spec.

```typescript	
import spok from 'cy-spok'

describe('Crud operations with cy spok', () => {
  let token
  before(() => cy.task('token').then((t) => (token = t)))

  it('should create, get, update, delete an order', () => {
    cy.createOrder(token)
      .its('body')
      .then(({ id }) => {
        cy.getOrder(token, id)
          .should((response) => expect(response.status).to.eq(200))
          .its('body')
          .should(
            spok({
              id: id,
            }),
          )

        cy.updateOrder(token, id)

        cy.deleteOrder(token, id)
      })
  })
})
```

Using time travel debugger, let's look at the response body on getOrder. There is a lot we can scrutinize in this data, but so far we are only spot checking the `id` property which is a value relevant to the test context. The status check and spot-value would be great for a performance test, but we need to verify more of the data in an e2e test.

> It can be easier to spot-find this data in DevTools vs the cy-api UI

TODO: insert get-Order-with-comment.png to Confluence

```json
{
  "comments": [
    {
      "orderId": "cea3ab3b-283f-4c55-8c92-a49a4ba71d78",
      "id": "90983a2e-8a41-4378-a52b-53a2fed59fa1",
      "comment": "A fire and forget notification happened at 6:28:50 PM server time",
      "createdAt": 1641580130785
    }
  ],
  "id": "cea3ab3b-283f-4c55-8c92-a49a4ba71d78",
  "total": 457,
  "createdAt": 1641580130640
}
```

It is always easier to start with shallow properties, so let's write some simple spok assertion for shallow properties `total`, `createdAt` and `comments`.

```typescript
 .should(
   spok({
     comments: spok.array,
     id: id,
     total: spok.type('number'),
     createdAt: spok.type('number'),
   })
 )
```

The comments property is an array of objects. We can tap into the fluid Cypress api to verify those array of properties easily. Here is the spec file so far:

```typescript
import spok from 'cy-spok'

describe('Crud operations with cy spok', () => {
  let token
  before(() => cy.task('token').then((t) => (token = t)))

  it('should create, get, update, delete an order', () => {
    cy.createOrder(token)
      .its('body')
      .then(({ id }) => {
        cy.getOrder(token, id)
          .should((response) => expect(response.status).to.eq(200))
          .its('body')
          .should(
            spok({
              comments: spok.array,
              id: id,
              total: spok.type('number'),
              createdAt: spok.type('number'),
            }),
          )
          .log('deep check the properties under comments array of object(s)')
          .its('comments')
          .each((comment) =>
            cy.wrap(comment).should(
              spok({
                orderId: spok.string,
                id: spok.string,
                comment: spok.string,
                createdAt: spok.type('number'),
              }),
            ),
          )
        cy.updateOrder(token, id)

        cy.deleteOrder(token, id)
      })
  })
})
```


When looking at the assertions for `updateOrder`, we can see a pattern; we will be making similar assertions on similar network requests; it is the same entity after all. Let's add the below assertion to `cy.updateOrder`

```typescript	
cy.updateOrder(token, id)
  .should((response) => expect(response.status).to.eq(200))
  .its('body')
  .should(
  spok({
    id: id,
    total: spok.type('number'),
    createdAt: spok.type('number'),
  }),
)
```

Maybe we can extract out some of the common parts and make lean and deep assertions. While we are at it, let's add some more logging with cy-spok's `$topic` property.

```typescript
import spok from 'cy-spok'

describe('Crud operations with cy spok', () => {
  let token
  before(() => cy.task('token').then((t) => (token = t)))

  // the common properties between the assertions
  const commonProperties = {
    total: spok.type('number'),
    createdAt: spok.type('number'),
  }

  /** common assertions between network requests */
  const commentSpok = spok({
    orderId: spok.string,
    id: spok.string,
    comment: spok.string,
    createdAt: spok.type('number'),
  })

  it('should create, get, update, delete an order', () => {
    cy.createOrder(token)
      .its('body')
      .then(({ id }) => {
        cy.getOrder(token, id)
          .should((response) => expect(response.status).to.eq(200))
          .its('body')
          .should(
            spok({
              $topic: '***getOrder assertions***',
              id,
              ...commonProperties,
            }),
          )
          .log('deep check the properties under comments array of object(s)')
          .its('comments')
          .each((comment) => cy.wrap(comment).should(commentSpok))

        cy.updateOrder(token, id)
          .should((response) => expect(response.status).to.eq(200))
          .its('body')
          .should(
            spok({
              $topic: '***updateOrder assertions***',
              id,
              ...commonProperties,
            }),
          )

        cy.deleteOrder(token, id).its('status').should('eq', 200)
      })
  })
})

```

That means we can spice up our testing by passing in custom payloads instead of the default ones, and even check against them.

```typescript
import spok from 'cy-spok'

describe('Crud operations with cy spok', () => {
  let token
  before(() => cy.task('token').then((t) => (token = t)))

  // the common properties between the assertions
  const commonProperties = {
    createdAt: spok.type('number'),
  }

  /** common assertions between network requests */
  const commentSpok = spok({
    orderId: spok.string,
    id: spok.string,
    comment: spok.string,
    createdAt: spok.type('number'),
  })

  it('should create, get, update, delete an order', () => {
    const postPayload = { total: 300 }

    cy.createOrder(token, postPayload)
      .its('body')
      .then(({ id }) => {
        cy.getOrder(token, id)
          .should((response) => expect(response.status).to.eq(200))
          .its('body')
          .should(
            spok({
              $topic: '***getOrder assertions***',
              id,
              ...postPayload,
              ...commonProperties,
            }),
          )
          .log('deep check the properties under comments array of object(s)')
          .its('comments')
          .each((comment) => cy.wrap(comment).should(commentSpok))

        const updatePayload = { total: 600 }

        cy.updateOrder(token, id, updatePayload)
          .should((response) => expect(response.status).to.eq(200))
          .its('body')
          .should(
            spok({
              $topic: '***updateOrder assertions***',
              id,
              ...updatePayload,
              ...commonProperties,
            }),
          )

        cy.log('getOrder checks after the update')
        cy.getOrder(token, id)
          .should((response) => expect(response.status).to.eq(200))
          .its('body')
          .should(
            spok({
              $topic: '***getOrder assertions***',
              id,
              ...updatePayload,
              ...commonProperties,
            }),
          )
          .log('deep check the properties under comments array of object(s)')
          .its('comments')
          .each((comment) => cy.wrap(comment).should(commentSpok))

        cy.deleteOrder(token, id).its('status').should('eq', 200)
      })
  })
})

```

That's a lot of code being repeated! We can do some refactoring to make it neater. FP point free style, composition, destructuring... With Cypress' api all are possible, use your imagination. We can also tap into stricter spok assertions. Here is how the final test can look like.

```typescript
import spok from 'cy-spok'

describe('Crud operations with cy spok', () => {
  let token
  before(() => cy.task('token').then((t) => (token = t)))

  // the common properties between the assertions
  const commonProperty = {
    createdAt: spok.type('number'),
  }

  const idRegex = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/

  /** common assertions between network requests */
  const commentSpok = spok({
    orderId: spok.test(idRegex),
    id: spok.test(idRegex),
    comment: spok.string,
    createdAt: spok.gt(164e10),
  })

  const assertStatus = (response) => expect(response.status).to.be.oneOf([200, 201])

  const commentShouldSatisfy = (comment) => cy.wrap(comment).should(commentSpok)

  it('should create, get, update, delete an order', () => {
    const postPayload = { total: 300 }
    const updatePayload = { total: 600 }

    cy.createOrder(token, postPayload)
      .should(assertStatus)
      .its('body')
      .then(({ id }) => {
        cy.getOrder(token, id)
          .should(assertStatus)
          .its('body')
          .should(
            spok({
              id,
              ...postPayload,
              ...commonProperty,
            }),
          )
          .log('deep check the array of object(s)')
          .its('comments')
          .each(commentShouldSatisfy)

        /** Common assertions between every GET and PUT calls */
        const satisfyCommonAssertions = spok({
          id,
          ...updatePayload,
          ...commonProperty,
        })

        cy.updateOrder(token, id, updatePayload)
          .should(assertStatus)
          .its('body')
          .should(satisfyCommonAssertions)

        cy.log('getOrder checks after the update')
        cy.getOrder(token, id)
          .should(assertStatus)
          .its('body')
          .should(satisfyCommonAssertions)
          .log('deep check the array of object(s)')
          .its('comments')
          .each(commentShouldSatisfy)

        cy.deleteOrder(token, id).should(assertStatus)
      })
  })
})

```

>  For more cy-spok style assertion examples, take a look at our internal [test-package-consumer](https://github.com/helloextend/test-package-consumer/tree/main/cypress/integration), external [cy-api-spok](https://github.com/muratkeremozcan/cypressExamples/tree/master/cypress-api-spok/cypress/integration) examples and the [video tutorial](https://www.youtube.com/watch?v=OGL_qIS7MZo&t=2s) going through it.

For more knowledge on testing, check out our [Recommended learning roadmap for the Test Discipline](https://helloextend.atlassian.net/wiki/spaces/ENG/pages/1280114689/Recommended+learning+roadmap+for+the+Test+Discipline). We are working on a client side onboarding and testing course, but meanwhile you can complement you Cypress skills on the UI side via [Cypress basics workshop](https://github.com/bahmutov/cypress-workshop-basics).