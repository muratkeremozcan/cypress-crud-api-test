import spok from 'cy-spok'

describe('pokemon api', () => {
  it('get one pokemon', () => {
    cy.api({
      method: 'GET',
      url: 'pokemon/1/',
      retryOnStatusCodeFailure: true
    })
      .its('body')
      .should(
        spok({
          $topic: '***pokemon-top-level',
          abilities: spok.array,
          base_experience: spok.number,
          forms: spok.arrayElements(1),
          game_indices: spok.arrayElementsRange(5, 30),
          height: spok.number,
          id: spok.number,
          is_default: spok.type('boolean'),
          location_area_encounters: spok.startsWith('https://pokeapi.co'),
          moves: (arr) => arr.length > 20,
          name: spok.string,
          order: spok.ge(1),
          past_types: (arr) => arr.length >= 0,
          species: spok.type('object'),
          sprites: (obj) => expect(obj).to.have.property('front_default'),
          types: (arr) =>
            expect(arr.map((i) => i.type.name)).to.not.be.undefined,
          weight: spok.gtz,
          stats: spok.arrayElements(6)
        })
      )
      .its('stats')
      .should('have.length', 6) // an array of objects
      .each((stat) =>
        cy.wrap(stat).should(
          spok({
            $topic: 'each-pokemon-stat',
            base_stat: spok.gtz,
            effort: spok.gez,
            stat: (obj) =>
              expect(obj.name).to.be.a('string') &&
              expect(obj.url).to.include('https://pokeapi.co')
          })
        )
      )
  })
})
