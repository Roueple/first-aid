import { PlaceholdersAndVanishInput } from "./placeholders-and-vanish-input";

export function PlaceholdersAndVanishInputDemo() {
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
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Query submitted");
  };

  return (
    <div className="h-[40rem] flex flex-col justify-center items-center px-4">
      <h2 className="mb-10 sm:mb-20 text-xl text-center sm:text-5xl dark:text-white text-black">
        Tanya FIRST-AID Apa Saja
      </h2>
      <PlaceholdersAndVanishInput
        placeholders={placeholders}
        onChange={handleChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}
