import { createContext, useContext, ReactNode } from 'react';

interface MobileScrollContextType {
    headerVisible: boolean;
}

const MobileScrollContext = createContext<MobileScrollContextType>({ headerVisible: true });

export function MobileScrollProvider({ children, value }: { children: ReactNode; value: MobileScrollContextType }) {
    return (
        <MobileScrollContext.Provider value={value}>
            {children}
        </MobileScrollContext.Provider>
    );
}

export function useMobileScroll() {
    return useContext(MobileScrollContext);
}
