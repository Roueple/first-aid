import { PlaceholdersAndVanishInput } from "./placeholders-and-vanish-input";

interface FelixVanishInputProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
  initialValue?: string;
  'data-tutorial'?: string;
}

export function FelixVanishInput({ onSubmit, disabled, initialValue, 'data-tutorial': dataTutorial }: FelixVanishInputProps) {
  // Indonesian real estate audit finding placeholders
  const placeholders = [
    "Tampilkan semua temuan audit AJB di CitraGarden City Jakarta",
    "Cari temuan audit berstatus open di CitraLand Surabaya",
    "Munculkan temuan berulang di CitraRaya Tangerang tahun 2023",
    "Tampilkan semua temuan audit kas & bank tahun 2023",
    "Cari temuan serah terima unit tidak lengkap tahun 2024",
    "Munculkan temuan high risk di proyek Ciputra tahun 2022",
    "Tampilkan temuan audit vendor di Ciputra World Jakarta 2023",
    "Cari temuan overdue action plan di seluruh proyek 2024",
    "Munculkan temuan perizinan di proyek wilayah Surabaya 2022",
    "Tampilkan temuan audit Divisi Penjualan tahun 2023",
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
