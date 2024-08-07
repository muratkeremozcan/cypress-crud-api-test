## A guide to CRUD API testing a deployed service with Cypress


This one is slightly outdated. Take a look at https://github.com/muratkeremozcan/cypress-mockoon-api-test for a better example.

```bash
yarn install
yarn cy:open
yarn cy:run
```

For learning purposes, you can check out the branch `base` to start from scratch and follow the guide. `main` has the final version of the repo. The code samples are setup to copy paste into the repo and work at every step.

Follow the blog post at [dev.to](https://dev.to/muratkeremozcan/crud-api-testing-a-deployed-service-with-cypress-using-cy-api-spok-cypress-data-session-cypress-each-4mlg) for guidance.

### The Service under test

The service we are using in this example is Aunt Maria's Pizzeria from the book [Serverless Applications with Node.js](https://www.manning.com/books/serverless-applications-with-node-js).

Since we are API testing the service, the implementation details are not critical. For those that are interested, it is a AWS serverless app that is deployed via [ClaudiaJs](https://claudiajs.com/), and the source code can be found [here](https://github.com/muratkeremozcan/books/tree/master/aws/claudiajs/pizza-api).

There is a `test.rest` file in the repo root that can help us get familiar with the API. It uses [VsCode REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension to test the api like we would do with Postman.

## Static-analysis

```bash
yarn lint
yarn typecheck
yarn check-format # check only changed files

# all the above in parallel
yarn validate

yarn fix-format # check & fix all files
```

### `lint-staged` & `husky`

On `git commit`, `typecheck` is run, followed by `lint`, then Prettier fixes the format of **only the staged files** and appends them to the commit.
