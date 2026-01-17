
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme] = useState<Theme>('dark');
    const [resolvedTheme] = useState<'dark'>('dark');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.add('dark');
        // Prevenir flashes de branco
        root.style.backgroundColor = '#111111';
    }, []);

    const setTheme = () => {
        // Modo claro removido conforme solicitação do usuário
        console.log('O modo claro foi desativado para manter a consistência do design premium.');
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
