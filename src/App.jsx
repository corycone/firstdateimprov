import { useState, useEffect } from 'react';
import MasterDataParser from './MasterDataParser';
import Admin from './Admin';
import './App.css';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  if (currentPath === '/admin') {
    return <Admin />;
  }

  return <MasterDataParser />;
}

export default App;
