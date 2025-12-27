import { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import dynamic from 'next/dynamic'; 
import Link from 'next/link'; 

const Line = dynamic(
  () => import('react-chartjs-2').then((mod) => mod.Line),
  { ssr: false } 
);

import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

try {
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);
} catch (e) { }

const MQTT_SERVER = "wss://mqtt.flespi.io";
const MQTT_TOKEN = "FlespiToken SVuaJdZboOeoyXKKIhFjKYRKfUOzRaHXavHMSTfn7oSl6og9BUPvdGdfk5lVr1Vl"; 
const TOPIC_VITALS = "esp32/vitals";
const TOPIC_EKG    = "esp32/ekg";
const TOPIC_CONTROL = "esp32/control"; // Topik baru untuk perintah

const CHART_MIN = 1000; 
const CHART_MAX = 3500;
const TOTAL_POINTS = 220; 

export default function Home() {
    const [nama, setNama] = useState('');
    const [status, setStatus] = useState('');
    const [isMqttConnected, setIsMqttConnected] = useState(false);
    const [isClient, setIsClient] = useState(false);
    
    // Simpan Client MQTT di State agar bisa dipakai tombol SET
    const [mqttClient, setMqttClient] = useState(null);

    const [dataSensor, setDataSensor] = useState({ bpm: "--", spo2: "--", suhu: "--", pasien: "Menunggu..." });
    const chartValues = useRef(new Array(TOTAL_POINTS).fill(null));

   const [chartData, setChartData] = useState({
        labels: new Array(TOTAL_POINTS).fill(''), 
        datasets: [{
            label: 'EKG',
            data: new Array(TOTAL_POINTS).fill(null),
            borderColor: '#00FF00',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
            fill: false,
            animation: false, 
        }],
    });

    const chartOptions = {
        responsive: true, animation: false, 
        scales: {
            x: { display: false }, 
            y: { display: false, min: CHART_MIN, max: CHART_MAX } 
        },
        plugins: { legend: { display: false } },
        maintainAspectRatio: false,
    };

    // =================================================================
    // 2. SETUP GRAFIK PPG (CYAN - KECIL DI KANAN)
    // =================================================================
    const [ppgData, setPpgData] = useState({
        labels: new Array(TOTAL_POINTS).fill(''),
        datasets: [{
            label: 'SPO2',
            data: new Array(TOTAL_POINTS).fill(null),
            borderColor: '#00FFFF', // Warna Garis Cyan
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            
            // --- EFEK FILL (ISI WARNA) ---
            fill: true, 
            backgroundColor: 'rgba(0, 255, 255, 0.5)', // Warna transparan di bawah garis
        }]
    });

    const ppgChartOptions = {
        responsive: true, animation: false,
        scales: {
            x: { display: false },
            y: { 
                display: true, 
                position: 'right',
                
                min: 0,
                max: 100, 
                
                grid: { color: '#333' },
                ticks: { 
                    color: 'cyan', 
                    font: { size: 10 },
                    stepSize: 20 // Jarak antar angka (0, 20, 40... 100)
                }
            }
        },
        plugins: { legend: { display: false } },
        maintainAspectRatio: false,
    };

    // Buffer/Ref untuk menampung data PPG sementara
    const ppgValues = useRef(new Array(TOTAL_POINTS).fill(null));

    useEffect(() => {
        setIsClient(true);
        import('chartjs-plugin-zoom').then((plugin) => {
            ChartJS.register(plugin.default);
        }).catch(e => console.log(e));
    }, []);

useEffect(() => {
        const clientId = "Web-" + Math.random().toString(16).substr(2, 8);
        const client = mqtt.connect(MQTT_SERVER, {
            clientId, protocolVersion: 4, clean: true, 
            reconnectPeriod: 1000, username: MQTT_TOKEN, password: ""
        });

        client.on('connect', () => {
            console.log("MQTT Connected");
            setIsMqttConnected(true);
            setMqttClient(client); 
            
            // --- PERUBAHAN 1: JANGAN LUPA SUBSCRIBE TOPIK BARU ---
            // Tambahkan 'esp32/ppg' ke dalam list array ini
            client.subscribe([TOPIC_VITALS, TOPIC_EKG, 'esp32/ppg']);
        });

        client.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString());

                // --- 1. LOGIKA VITALS (ANGKA) ---
                if (topic === TOPIC_VITALS) {
                    setDataSensor({
                        bpm: payload.bpm, spo2: payload.spo2, suhu: payload.suhu, pasien: payload.pasien
                    });

                    // Simpan Database
                    if (payload.bpm > 0 || payload.spo2 > 0) {
                        fetch('/api/save-vitals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        }).catch(err => console.error("Gagal simpan DB:", err));
                    }
                } 
                // --- 2. LOGIKA EKG (GRAFIK HIJAU) ---
                else if (topic === TOPIC_EKG) {
                    const val = payload.val;
                    const idx = payload.x; 

                    if (idx >= 0 && idx < TOTAL_POINTS) {
                        chartValues.current[idx] = val;
                        // Eraser Bar EKG
                        for(let i=1; i<=5; i++) {
                            chartValues.current[(idx + i) % TOTAL_POINTS] = null;
                        }
                        setChartData(prev => ({
                            ...prev,
                            datasets: [{ ...prev.datasets[0], data: [...chartValues.current] }]
                        }));
                    }
                }
                // --- 3. LOGIKA PPG (GRAFIK BIRU/CYAN) - LANGKAH 3 DISINI ---
                else if (topic === 'esp32/ppg') {
                    const val = payload.val;
                    const idx = payload.x; // Kunci Sinkronisasi (Pakai X dari ESP32)

                    if (idx >= 0 && idx < TOTAL_POINTS) {
                        // Masukkan data ke buffer PPG
                        ppgValues.current[idx] = val;

                        // Eraser Bar PPG (Hapus 5 titik depan biar rapi)
                        for(let i=1; i<=5; i++) {
                            ppgValues.current[(idx + i) % TOTAL_POINTS] = null;
                        }

                        // Update State PPG
                        setPpgData(prev => ({
                            ...prev,
                            datasets: [{
                                ...prev.datasets[0],
                                data: [...ppgValues.current]
                            }]
                        }));
                    }
                }

            } catch (error) {}
        });
        
        // Cleanup function (opsional tapi bagus ada)
        return () => {
            if(client) client.end();
        };

    }, []); // Dependency array kosong agar jalan sekali saat load

    // --- FUNGSI KIRIM NAMA KE ESP32 ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!mqttClient || !isMqttConnected) {
            setStatus("Gagal: MQTT belum terhubung.");
            return;
        }

        setStatus('Mengirim ke Alat...');
        
        // Kirim perintah MQTT ke ESP32
        const command = JSON.stringify({ set_pasien: nama });
        mqttClient.publish(TOPIC_CONTROL, command, (err) => {
            if (err) {
                setStatus("Gagal mengirim perintah.");
            } else {
                setStatus(`Sukses! Perintah dikirim: ${nama}`);
                // Reset input
                setNama('');
            }
        });
    };

return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#000', color: 'white', minHeight: '100vh' }}>

        {/* --- HEADER --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, color: '#00FF00' }}>Sistem Monitoring Kesehatan</h2>
            <Link href="/riwayat">
                <button style={{ padding: '10px 15px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                    📂 LIHAT DATA
                </button>
            </Link>
        </div>

        {/* --- INFO PASIEN --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div><span style={{color: '#888'}}>Pasien:</span> <strong style={{fontSize: '1.2em', color: 'cyan'}}>{dataSensor.pasien}</strong></div>
            <div style={{ fontSize: '0.8em', color: isMqttConnected ? '#00FF00' : 'red'}}>● {isMqttConnected ? 'LIVE' : 'DISCONNECTED'}</div>
        </div>

        {/* ================================================================== */}
        {/* === BAGIAN 1: GRAFIK EKG BESAR (ATAS - FULL WIDTH) === */}
        {/* ================================================================== */}
        <div style={{ border: '2px solid #333', borderRadius: '15px', padding: '15px', backgroundColor: '#111', marginBottom: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#00FF00', textAlign: 'center' }}>ECG / EKG (Aktivitas Jantung)</h3>
            {/* Area Grafik Besar */}
            <div style={{ height: '350px', width: '100%' }}>
                {isClient && <Line data={chartData} options={chartOptions} />}
            </div>
        </div>

        {/* ================================================================== */}
        {/* === BAGIAN 2: KONTAINER BAWAH (INDIKATOR KIRI, PPG KANAN) === */}
        {/* ================================================================== */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', height: '220px' }}>

            {/* --- BAGIAN 2a: INDIKATOR NUMERIK (KIRI - LEBIH LEBAR) --- */}
            <div style={{ flex: 3, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                {/* KOTAK BPM */}
                <div style={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', padding: '15px', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' }}>
                    <div style={{ color: '#00FF00', fontSize: '0.9em', marginBottom: '5px' }}>HEART RATE (PR)</div>
                    <div style={{ fontSize: '2.8em', fontWeight: 'bold', color: '#00FF00', lineHeight: '1' }}>
                        {dataSensor.bpm} <span style={{fontSize:'0.4em'}}>BPM</span>
                    </div>
                </div>
                {/* KOTAK SPO2 */}
                <div style={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', padding: '15px', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' }}>
                    <div style={{ color: '#00FFFF', fontSize: '0.9em', marginBottom: '5px' }}>OXYGEN (SpO2)</div>
                    <div style={{ fontSize: '2.8em', fontWeight: 'bold', color: '#00FFFF', lineHeight: '1' }}>
                        {dataSensor.spo2} <span style={{fontSize:'0.4em'}}>%</span>
                    </div>
                </div>
                {/* KOTAK SUHU */}
                <div style={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', padding: '15px', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' }}>
                    <div style={{ color: 'orange', fontSize: '0.9em', marginBottom: '5px' }}>TEMPERATURE</div>
                    <div style={{ fontSize: '2.8em', fontWeight: 'bold', color: 'orange', lineHeight: '1' }}>
                        {dataSensor.suhu} <span style={{fontSize:'0.4em'}}>°C</span>
                    </div>
                </div>
            </div>

            {/* --- BAGIAN 2b: GRAFIK PPG KECIL (KANAN - SUDUT) --- */}
            <div style={{ flex: 2, backgroundColor: '#111', border: '2px solid #333', borderRadius: '15px', padding: '10px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#00FFFF', fontSize: '14px', textAlign: 'center' }}>PPG (Sirkulasi Darah)</h3>
                {/* Area Grafik Kecil */}
                <div style={{ flex: 1, position: 'relative' }}>
                    {isClient && <Line data={ppgData} options={ppgChartOptions} />}
                </div>
            </div>

        </div>
        {/* Akhir Bagian Bawah */}


        {/* --- FORM GANTI PASIEN (Tetap di bawah) --- */}
        <div style={{ marginTop: '25px', padding: '20px', border: '1px solid #222', borderRadius: '15px', backgroundColor: '#050505' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px' }}>
                <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Masukkan Nama Pasien Baru..." style={{ padding: '12px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#222', color: 'white', flex: 1, fontSize: '1em' }} />
                <button type="submit" style={{ backgroundColor: '#005500', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em' }}>SET PASIEN</button>
            </form>
            <small style={{color: '#666', marginTop: '10px', display:'block', textAlign: 'center'}}>{status}</small>
        </div>
    </div>
);
}