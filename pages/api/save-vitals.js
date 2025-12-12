import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://bonz:Hurufbesarsemua69*@cluster0.k0noyti.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        await client.connect();
        const db = client.db('MedicalData'); // Nama Database
        const collection = db.collection('RekamMedis'); // Nama Collection

        const data = req.body;
        // Tambahkan waktu server
        const doc = {
            ...data,
            waktu_rekam: new Date(),
            tanggal_string: new Date().toLocaleString("id-ID", {timeZone: "Asia/Jakarta"})
        };

        await collection.insertOne(doc);
        res.status(200).json({ message: 'Saved' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        // await client.close(); // Biarkan terbuka untuk performa di Vercel
    }
}