import { StrictMode } from 'react'
import './sw-registration.js'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
//New
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
