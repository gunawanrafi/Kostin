export default function HomePage(): JSX.Element {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "3rem", color: "#1a1a2e" }}>KostIn</h1>
      <p style={{ color: "#666", marginTop: "0.5rem" }}>
        Platform Kost Berbasis AI untuk Mahasiswa Malang
      </p>
    </main>
  );
}
