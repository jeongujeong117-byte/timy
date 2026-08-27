import { useState } from 'react'
import './App.css'

function App() {
  const [isAvailable, setIsAvailable] = useState(true)

  return (
    <main className="participation-screen">
      <h1>금요일 저녁 모임</h1>
      <p className="instruction">안 되는 시간을 눌러 빼주세요.</p>

      <div className="time-row">
        <span className="time-label">10</span>
        <button
          type="button"
          className={`time-slot ${isAvailable ? 'available' : 'unavailable'}`}
          aria-pressed={isAvailable}
          onClick={() => setIsAvailable(!isAvailable)}
        >
          {isAvailable ? '가능' : '불가능'}
        </button>
      </div>
    </main>
  )
}

export default App
