import { useMemo, useState } from 'react'
import './App.css'

type Flight = {
  id: number
  flightNo: string
  route: string
  scheduled: string
  gate: string
  status: 'On time' | 'Delayed' | 'Boarding'
}

const flights: Flight[] = [
  { id: 1, flightNo: 'MR-204', route: 'SFO → SEA', scheduled: '08:15', gate: 'A12', status: 'Boarding' },
  { id: 2, flightNo: 'MR-118', route: 'LAX → DEN', scheduled: '09:40', gate: 'C03', status: 'On time' },
  { id: 3, flightNo: 'MR-332', route: 'JFK → ORD', scheduled: '10:05', gate: 'B09', status: 'Delayed' },
  { id: 4, flightNo: 'MR-447', route: 'PHX → SFO', scheduled: '11:20', gate: 'D05', status: 'On time' },
  { id: 5, flightNo: 'MR-512', route: 'SEA → BOS', scheduled: '12:10', gate: 'A07', status: 'Boarding' },
]

function App() {
  const [query, setQuery] = useState('')

  const filteredFlights = useMemo(() => {
    const needle = query.trim().toLowerCase()

    if (!needle) {
      return flights
    }

    return flights.filter((flight) => {
      return [flight.flightNo, flight.route, flight.gate, flight.status]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [query])

  const onTimeCount = flights.filter((flight) => flight.status === 'On time').length
  const delayedCount = flights.filter((flight) => flight.status === 'Delayed').length
  const boardingCount = flights.filter((flight) => flight.status === 'Boarding').length

  return (
    <main className="app-shell">
      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">MARIA • Operations center</p>
          <h1>Flight tracking with calm, clear control.</h1>
          <p>
            Monitor arrivals, departures, gate changes, and delays in one focused dashboard.
          </p>
        </div>

        <div className="hero-stats" aria-label="Flight status overview">
          <div className="stat-card">
            <span className="stat-label">Active flights</span>
            <strong>{flights.length}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">On time</span>
            <strong>{onTimeCount}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Delayed</span>
            <strong>{delayedCount}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Boarding</span>
            <strong>{boardingCount}</strong>
          </div>
        </div>
      </header>

      <section className="toolbar">
        <label className="search-box">
          <span>Search flights</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Flight, route, gate, or status"
          />
        </label>

        <div className="pill-row" aria-label="Status legend">
          <span className="pill pill-live">Live feed</span>
          <span className="pill">Auto-refresh every 30s</span>
        </div>
      </section>

      <section className="flight-board">
        <div className="board-header">
          <div>
            <p className="eyebrow">Today’s schedule</p>
            <h2>Departure board</h2>
          </div>
          <p>{filteredFlights.length} flights visible</p>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Flight</th>
                <th>Route</th>
                <th>Scheduled</th>
                <th>Gate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlights.map((flight) => (
                <tr key={flight.id}>
                  <td>{flight.flightNo}</td>
                  <td>{flight.route}</td>
                  <td>{flight.scheduled}</td>
                  <td>{flight.gate}</td>
                  <td>
                    <span className={`status ${flight.status.toLowerCase().replace(/ /g, '-')}`}>
                      {flight.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default App
