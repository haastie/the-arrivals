import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { ContentProvider } from './content/content.ts'
import { AudioProvider } from './components/AudioProvider.tsx'
import Landing from './pages/Landing.tsx'
import Join from './pages/Join.tsx'
import Play from './pages/Play.tsx'
import Master from './pages/Master.tsx'
import Warmup from './pages/Warmup.tsx'
import Admin from './pages/Admin.tsx'
import FoodMap from './pages/FoodMap.tsx'

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/join', element: <Join /> },
  { path: '/play', element: <Play /> },
  { path: '/master', element: <Master /> },
  { path: '/warmup', element: <Warmup /> },
  { path: '/admin', element: <Admin /> },
  { path: '/eten', element: <FoodMap /> },
  { path: '*', element: <Landing /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AudioProvider>
      <ContentProvider>
        <RouterProvider router={router} />
      </ContentProvider>
    </AudioProvider>
  </StrictMode>,
)
