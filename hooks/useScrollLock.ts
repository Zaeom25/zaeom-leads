import { useEffect } from 'react';

export const useScrollLock = (lock: boolean) => {
    useEffect(() => {
        if (lock) {
            document.documentElement.classList.add('body-lock');
            document.body.classList.add('body-lock');
        } else {
            // Only remove if no other elements are requesting a lock
            // (In a real app we'd use a context or counter, but for now 
            // let's just make sure it's removed when the specific modal unmounts)
        }

        return () => {
            // We can't easily know if other modals are still open here
            // without global state, but let's try to be safe.
            if (!lock) return;

            // Check if any other modal-like element is visible
            const openModals = document.querySelectorAll('[role="dialog"], .fixed.inset-0').length;
            if (openModals <= 1) {
                document.documentElement.classList.remove('body-lock');
                document.body.classList.remove('body-lock');
            }
        };
    }, [lock]);
};
