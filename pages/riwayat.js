import { useState } from 'react';
import Link from 'next/link';

export default function Riwayat() {
    const [searchName, setSearchName] = useState('');
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/get-riwayat?nama=${searchName}`);
            const data = await res.json();
            setRecords(data);
        } catch (err) {
            alert("Gagal mengambil data");
        }
        setLoading(false);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto', backgroundColor: '#111', color: 'white', minHeight: '100vh' }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h2 style={{ color: '#00FF00' }}>📂 REKAM MEDIS DIGITAL</h2>
                <Link href="/" style={{color: 'cyan', textDecoration:'underline'}}>Kembali ke Monitor</Link>
            </div>

            {/* FORM PENCARIAN */}
            <form onSubmit={handleSearch} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #333', borderRadius: '10px' }}>
                <p>Cari Riwayat Pasien:</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        value={searchName} 
                        onChange={e => setSearchName(e.target.value)} 
                        placeholder="Ketik Nama Pasien..." 
                        style={{ flex: 1, padding: '10px', borderRadius: '5px', border: 'none' }} 
                    />
                    <button type="submit" style={{ padding: '10px 20px', backgroundColor: 'blue', color: 'white', border: 'none', borderRadius: '5px', cursor:'pointer' }}>
                        CARI DATA
                    </button>
                </div>
            </form>

            {/* TABEL HASIL */}
            {loading ? <p>Sedang memuat...</p> : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#222', color: '#00FF00' }}>
                                <th style={{padding:'10px', border:'1px solid #444'}}>Waktu</th>
                                <th style={{padding:'10px', border:'1px solid #444'}}>BPM</th>
                                <th style={{padding:'10px', border:'1px solid #444'}}>SpO2</th>
                                <th style={{padding:'10px', border:'1px solid #444'}}>Suhu</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.length > 0 ? records.map((rec, idx) => (
                                <tr key={idx} style={{ textAlign: 'center', borderBottom: '1px solid #333' }}>
                                    <td style={{padding:'10px'}}>{rec.tanggal_string}</td>
                                    <td style={{padding:'10px', color:'red', fontWeight:'bold'}}>{rec.bpm}</td>
                                    <td style={{padding:'10px', color:'cyan'}}>{rec.spo2}%</td>
                                    <td style={{padding:'10px', color:'orange'}}>{rec.suhu}°C</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" style={{padding:'20px', textAlign:'center', color:'#666'}}>Belum ada data atau nama tidak ditemukan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}