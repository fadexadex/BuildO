"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppMode = 'quest' | 'build';

interface ModeContextType {
    mode: AppMode;
    setMode: (mode: AppMode) => void;
    toggleMode: () => void;
}

const ModeContext = createContext<ModeContextType>({
    mode: 'quest',
    setMode: () => {},
    toggleMode: () => {},
});

export const useMode = () => useContext(ModeContext);

export const ModeProvider = ({ children }: { children: React.ReactNode }) => {
    const [mode, setMode] = useState<AppMode>('quest');

    // Persist mode preference
    useEffect(() => {
        const savedMode = typeof window !== 'undefined' ? localStorage.getItem('app_mode') as AppMode : null;
        if (savedMode && (savedMode === 'quest' || savedMode === 'build')) {
            setMode(savedMode);
        }
    }, []);

    const handleSetMode = (newMode: AppMode) => {
        setMode(newMode);
        if (typeof window !== 'undefined') {
            localStorage.setItem('app_mode', newMode);
        }
    };

    const toggleMode = () => {
        handleSetMode(mode === 'quest' ? 'build' : 'quest');
    };

    return (
        <ModeContext.Provider value={{ mode, setMode: handleSetMode, toggleMode }}>
            {children}
        </ModeContext.Provider>
    );
};

