import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    return stored || 'system';
  });

  useEffect(() => {
    let applied = theme;
    if (theme === 'system') {
      applied = getSystemTheme();
    }
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(applied);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Listen for system theme changes if 'system' is selected
  useEffect(() => {
    if (theme !== 'system') return;
    const handler = () => setTheme('system');
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handler);
    return () => window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 