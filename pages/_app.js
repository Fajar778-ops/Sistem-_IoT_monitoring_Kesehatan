import "@/styles/globals.css";
import { useState, useEffect } from "react";

export default function App({ Component, pageProps }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Timer 2 detik (2000ms)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // TAMPILAN LOADING SCREEN
  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader-content">
          {/* Logo Kampus */}
          <img 
            src="/Logo-Resmi-Unhas-1" 
            alt="Logo Universitas Hasanuddin" 
            className="loader-logo" 
          />
          
          {/* Bar Loading Keren */}
          <div className="progress-bar-container">
            <div className="progress-bar-fill"></div>
          </div>
          
          <p className="loading-text">Memuat Sistem EKG...</p>
        </div>
      </div>
    );
  }

  // TAMPILAN WEBSITE ASLI
  return <Component {...pageProps} />;
}