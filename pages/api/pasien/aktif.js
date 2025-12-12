let pasienAktif = ""; // disimpan sementara di RAM

export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ pasien_aktif: pasienAktif });
  } else if (req.method === 'POST') {
    const { id_pasien } = req.body;
    if (!id_pasien) return res.status(400).json({ error: 'ID kosong' });
    pasienAktif = id_pasien;
    res.status(200).json({ pasien_aktif: pasienAktif });
  }
}