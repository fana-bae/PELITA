'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    // Read saved theme from localStorage on first load
    const saved = localStorage.getItem('pelita-theme') || 'light'
    if (saved !== theme) {
      setTheme(saved)
    }
    document.documentElement.setAttribute('data-theme', saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('pelita-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
