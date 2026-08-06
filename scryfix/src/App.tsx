import CardLookup from './components/CardLookup'
import './App.css'

function App() {
  return (
    <section id="center">
      <h1>Scryfix</h1>
      <p>Look up a card to start reporting a data error on Scryfall.</p>
      <CardLookup />
    </section>
  )
}

export default App
