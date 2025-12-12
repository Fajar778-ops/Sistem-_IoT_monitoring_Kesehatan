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

const CHART_MIN = 0; 
const CHART_MAX = 4095;
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
            y: { display: true, min: CHART_MIN, max: CHART_MAX, grid: { color: '#222' }, ticks: { color: '#888' }}
        },
        plugins: { legend: { display: false } },
        maintainAspectRatio: false,
    };

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
            setMqttClient(client); // Simpan client ke state
            client.subscribe([TOPIC_VITALS, TOPIC_EKG]);
        });

        client.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString());

                if (topic === TOPIC_VITALS) {
                    setDataSensor({
                        bpm: payload.bpm, spo2: payload.spo2, suhu: payload.suhu, pasien: payload.pasien
                    });

                    // Simpan Database (Hapus filter >0 jika ingin tes paksa)
                    if (payload.bpm > 0 || payload.spo2 > 0) {
                        fetch('/api/save-vitals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        }).catch(err => console.error("Gagal simpan DB:", err));
                    }
                } 
                else if (topic === TOPIC_EKG) {
                    const val = payload.val;
                    const idx = payload.x; 

                    if (idx >= 0 && idx < TOTAL_POINTS) {
                        chartValues.current[idx] = val;
                        for(let i=1; i<=5; i++) {
                            let eraserIdx = (idx + i) % TOTAL_POINTS;
                            chartValues.current[eraserIdx] = null;
                        }
                        setChartData(prev => ({
                            ...prev,
                            datasets: [{ ...prev.datasets[0], data: [...chartValues.current] }]
                        }));
                    }
                }
            } catch (error) {}
        });

        return () => { if (client) client.end(); };
    }, []);

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
        <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto', backgroundColor: '#000', color: 'white', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '15px' }}>
                <h2 style={{ margin: 0, color: '#00FF00' }}>ICU MONITORING</h2>
                <Link href="/riwayat">
                    <button style={{ padding: '10px 15px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                        📂 LIHAT DATA
                    </button>
                </Link>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div><span style={{color: '#888'}}>Pasien:</span> <strong style={{fontSize: '1.2em', color: 'cyan'}}>{dataSensor.pasien}</strong></div>
                <div style={{ fontSize: '0.8em', color: isMqttConnected ? '#00FF00' : 'red'}}>● {isMqttConnected ? 'LIVE' : 'DISCONNECTED'}</div>
            </div>

            <div style={{ border: '3px solid #333', borderRadius: '15px', padding: '10px', backgroundColor: '#111', position: 'relative' }}>
                <div style={{ height: '300px', width: '100%', marginBottom: '10px' }}>
                    {isClient && <Line data={chartData} options={chartOptions} />}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', borderTop: '2px solid #333', paddingTop: '10px' }}>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#00FF00', fontSize: '0.9em' }}>HR (BPM)</div><div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#00FF00', lineHeight: '1' }}>{dataSensor.bpm}</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#00FFFF', fontSize: '0.9em' }}>SpO2 (%)</div><div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#00FFFF', lineHeight: '1' }}>{dataSensor.spo2}</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: 'orange', fontSize: '0.9em' }}>TEMP (°C)</div><div style={{ fontSize: '2.5em', fontWeight: 'bold', color: 'orange', lineHeight: '1' }}>{dataSensor.suhu}</div></div>
                </div>
            </div>

            <div style={{ marginTop: '30px', padding: '15px', border: '1px solid #222', borderRadius: '10px', backgroundColor: '#050505' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
                    <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Ganti Pasien..." style={{ padding: '8px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#222', color: 'white' }} />
                    <button type="submit" style={{ backgroundColor: '#005500', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>SET</button>
                </form>
                <small style={{color: '#666', marginTop: '5px', display:'block'}}>{status}</small>
            </div>
        </div>
    );
}