import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://bonz:Hurufbesarsemua69*@cluster0.k0noyti.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

export default async function handler(req, res) {
    // Kita ambil nama pasien dari ?nama=Budi
    const { nama } = req.query;

    if (!nama) return res.status(400).json({ error: 'Nama pasien wajib diisi' });

    try {
        await client.connect();
        const db = client.db('MedicalData');
        
        // Cari data berdasarkan nama pasien, urutkan dari yang terbaru (descending)
        const history = await db.collection('RekamMedis')
            .find({ pasien: { $regex: nama, $options: 'i' } }) // Regex agar 'budi' ketemu 'Budi'
            .sort({ waktu_rekam: -1 }) 
            .limit(50) // Ambil 50 data terakhir saja biar tidak berat
            .toArray();

        res.status(200).json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}