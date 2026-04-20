import { PlaceholdersAndVanishInput } from "./placeholders-and-vanish-input";

interface BernardVanishInputProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
  initialValue?: string;
  'data-tutorial'?: string;
}

export function BernardVanishInput({ onSubmit, disabled, initialValue, 'data-tutorial': dataTutorial }: BernardVanishInputProps) {
  // Indonesian real estate audit finding placeholders - organized by category
  const placeholders = [
    // 🏘️ By Proyek & Kategori Temuan
    "Temuan audit Housing category di CitraLand tahun 2023-2024",
    "Finding audit Mall category Ciputra World Surabaya semua departemen",
    "Audit finding proyek Hotel Ciputra Golf Club & Hotel",
    "Semua temuan SH2 di proyek Housing dengan nilai >= 6",
    "Temuan kategori Healthcare di Ciputra Hospital tahun 2024",
    
    // 💰 Finance & Accounting
    "Temuan piutang dan collection di departemen Finance tahun 2024",
    "Finding cash opname tidak rutin tanpa Berita Acara di Finance",
    "Audit finding pencatatan akuntansi di Finance tahun 2023-2024",
    "Temuan purchasing tidak sesuai prosedur SPK/PO perbandingan harga",
    "Finding escrow KPR tidak sesuai prosedur di departemen Finance",
    
    // 🏗️ Engineering & QS
    "Finding Engineering terkait material bekas atau pekerjaan tidak sesuai SPK",
    "Temuan QS pekerjaan tambah kurang tidak didukung Instruksi Lapangan",
    "Audit finding serah terima unit tanpa Form BAST",
    "SPK klausul retensi tidak sesuai masa pemeliharaan kontrak",
    "Temuan volume pekerjaan di departemen Engineering tahun 2024",
    
    // ⚖️ Legal & Legalitas
    "Temuan legalitas tanah IMB belum lengkap atau tidak ada informasi di sistem",
    "Finding SPPJB klausul tidak sesuai ketentuan kantor pusat",
    "Audit finding pelaporan PPATK transaksi penjualan",
    "Selisih luasan sertifikat di departemen Legal tahun 2023-2024",
    "Temuan AJB belum balik nama atau proses balik nama tertunda",
    
    // 🏢 Estate & Property Management
    "Finding outsourcing security di departemen Estate tahun 2024",
    "Temuan lift atau sistem ARD tidak berfungsi di apartemen",
    "Finding kebersihan dan estetika lingkungan cluster atau area mall",
    "Audit finding BPJS karyawan dibayar lewat kasbon atau kas bon tidak sesuai prosedur",
    "Temuan maintenance preventif di departemen Estate tahun 2023-2024",
  ];

  const handleChange = (_e: React.ChangeEvent<HTMLInputElement>) => {
    // Optional: handle input change if needed
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.querySelector('input');
    if (input && input.value.trim()) {
      onSubmit(input.value.trim());
    }
  };

  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""} data-tutorial={dataTutorial}>
      <PlaceholdersAndVanishInput
        placeholders={placeholders}
        onChange={handleChange}
        onSubmit={handleSubmit}
        initialValue={initialValue}
      />
    </div>
  );
}
