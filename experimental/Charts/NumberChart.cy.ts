import NumberChart from './NumberChart.vue'

const title = () => cy.get('.number-chart-content > :first-child')
const value = () => cy.get('.number-chart-content > :nth-child(2)')
const delta = () => cy.get('.number-chart-content > :nth-child(3)')

describe('legacy NumberChart direction', () => {
  afterEach(() => {
    document.documentElement.dir = ''
  })

  it('aligns the title and metric to RTL reading direction', () => {
    document.documentElement.dir = 'rtl'

    cy.mount(NumberChart, {
      props: {
        config: {
          title: 'درآمد',
          value: 1200,
          suffix: 'ریال',
          delta: 12,
        },
      },
    })

    title().should('have.css', 'align-self', 'flex-start')
    title().should('have.css', 'text-align', 'start')
    value().should('have.css', 'align-self', 'flex-end')
    value().should('have.css', 'text-align', 'end')
    delta().should('have.css', 'align-self', 'flex-end')
    delta().should('have.css', 'text-align', 'end')
  })

  it('leaves the legacy English LTR layout unchanged', () => {
    document.documentElement.dir = 'ltr'

    cy.mount(NumberChart, {
      props: {
        config: { title: 'Revenue', value: 1200, suffix: 'USD', delta: 12 },
      },
    })

    title().should('have.css', 'align-self', 'auto')
    value().should('have.css', 'align-self', 'auto')
    delta().should('have.css', 'align-self', 'auto')
  })
})
