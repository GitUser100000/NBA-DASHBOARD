import { useState } from 'react'
import './App.css'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import GamePickerPage from './pages/GamePickerPage'
import GameDashboard from './pages/GameDashboard'

function App() {
  return (
    <>
      <h1>My App</h1>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Navigate to="/GamePickerPage" replace />} />
          <Route path="/" element={<Navigate to="/GamePickerPage" replace />}/>
          <Route path="/GamePickerPage" element={<GamePickerPage />}/>
          <Route path="/GameDashboard/:gameId" element={<GameDashboard />}/>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
