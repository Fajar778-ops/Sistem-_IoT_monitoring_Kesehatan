import "@/styles/globals.css";
import { useState, useEffect } from "react";

export default function App({ Component, pageProps }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500); // Saya naikkan jadi 2.5 detik biar puas lihat logonya
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="loader-wrapper">
        <div className="loader-content">
          <img 
            src="/Logo-Resmi-Unhas-1.png"  
            alt="Logo Kampus" 
            className="loader-logo" 
          />
          
          <div className="progress-bar-box">
            <div className="progress-bar-fill"></div>
          </div>
          <p className="loading-text">Memuat Sistem IoT...</p>
        </div>
      </div>
    );
  }

  return <Component {...pageProps} />;
}