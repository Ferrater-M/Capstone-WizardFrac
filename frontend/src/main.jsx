import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { installKeepAudioPlaying } from './utils/keepAudioPlaying'
import { installAuthFetch } from './utils/authFetch'

// Every request to our server carries the player's login pass (see utils/authFetch.js)
installAuthFetch()

// Music keeps playing while the player is in another tab or app
installKeepAudioPlaying()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
