import { PlaceholdersAndVanishInput } from "./placeholders-and-vanish-input";

interface FelixVanishInputProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
}

export function FelixVanishInput({ onSubmit, disabled }: FelixVanishInputProps) {
  // Indonesian real estate audit finding placeholders
  const placeholders = [
    "Berapa temuan audit IT di tahun 2024?",
    "Tampilkan proyek dengan temuan terbanyak",
    "Cari temuan tentang PPJB atau AJB",
    "Proyek mana yang belum ada IMB?",
    "Temuan audit departemen Legal tahun 2023",
    "Berapa proyek yang memiliki masalah SHM?",
    "Cari temuan tentang KPR di Citraland",
    "Tampilkan semua temuan kategori High Risk",
    "Audit findings untuk Raffles Hills Cibubur",
    "Berapa total temuan di tahun 2022-2024?",
    "Proyek dengan status PPJB belum selesai",
    "Temuan terkait sertifikat tanah",
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
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <PlaceholdersAndVanishInput
        placeholders={placeholders}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
