import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { installKeepAudioPlaying } from './utils/keepAudioPlaying'
import { installMediaLock } from './utils/lockMedia'
import { installAuthFetch } from './utils/authFetch'
import { installStage } from './utils/stage'
import { installDeviceClass } from './utils/device'
import { installUiScale } from './utils/uiScale'
import { installSideSquares } from './utils/sideSquares'
import { installTapIndicator } from './utils/tapIndicator'

// Phone or computer? (<html> gets "wf-touch" or "wf-desktop", see utils/device.js)
installDeviceClass()

// GUI Scaling (Settings): Default on a computer, Large on a phone (see utils/uiScale.js)
installUiScale()

// The whole game is one 1920×1080 stage, scaled evenly to fit the window with black bars (see utils/stage.js)
installStage(document.getElementById('wf-stage'))

// Slowly turning pixel squares in the black bars around the stage (see utils/sideSquares.js)
installSideSquares(document.getElementById('wf-stage'))

// Phones: a pixel tap marker wherever the screen is tapped (see utils/tapIndicator.js)
installTapIndicator()

// Every request to our server carries the player's login pass (see utils/authFetch.js)
installAuthFetch()

// Music keeps playing while the player is in another tab or app
installKeepAudioPlaying()

// Music, sounds and tutorial clips can't be skipped, scrubbed or paused from outside the game
// (browser media button, phone lock screen / Control Center, "Show controls" menus)
installMediaLock()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
