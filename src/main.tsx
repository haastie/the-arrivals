import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing.tsx'
import Join from './pages/Join.tsx'
import Play from './pages/Play.tsx'
import Master from './pages/Master.tsx'

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/join', element: <Join /> },
  { path: '/play', element: <Play /> },
  { path: '/master', element: <Master /> },
  { path: '*', element: <Landing /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
