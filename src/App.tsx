import { MotionConfig } from 'motion/react'
import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { StoreProvider } from './contexts/StoreContext'
import StoreLayout from './layouts/StoreLayout'

const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function App() {
  return <MotionConfig reducedMotion="user"><StoreProvider>
    <Suspense fallback={<div className="page-loader"><span className="loader-mark">M</span><span>Đang tải MUSE STORE...</span></div>}>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<StoreLayout />} />
      </Routes>
    </Suspense>
  </StoreProvider></MotionConfig>
}
