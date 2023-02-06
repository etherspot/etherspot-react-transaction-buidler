import { useEffect } from 'react';

export interface UseRefObj {
  current: null | HTMLDivElement;
}

const useOnClickOutside = (ref: UseRefObj, outsideClickCallback: Function) => {
  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        outsideClickCallback();
      }
    }

    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref]);
};

export default useOnClickOutside;
