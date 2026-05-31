import { useState, createContext, useContext, useEffect, useCallback } from 'react'
import API from '../api/axios'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('placeiq_profile')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { localStorage.removeItem('placeiq_profile') }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (formData) => {
    const { data } = await API.post('/auth/login', formData)
    localStorage.setItem('placeiq_profile', JSON.stringify(data))
    setUser(data)
    return data
  }, [])

  const verifyOTP = useCallback(async (formData) => {
    const { data } = await API.post('/auth/verify-otp', formData)
    localStorage.setItem('placeiq_profile', JSON.stringify(data))
    setUser(data)
    return data
  }, [])

  const register = useCallback(async (formData) => {
    const { data } = await API.post('/auth/register', formData)
    return data // Doesn't log in directly anymore
  }, [])

  const logout = useCallback(async () => {
    try { await API.post('/auth/logout') } catch {}
    localStorage.removeItem('placeiq_profile')
    setUser(null)
    window.location.href = '/'
  }, [])

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates }
      localStorage.setItem('placeiq_profile', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, verifyOTP, logout, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}