// Paleta industrial do ObraViva: grafite, concreto e amarelo.
export const cores = {
  grafite: "#22252B",
  grafiteClaro: "#3A3E46",
  amarelo: "#F2B705",
  texto: "#3A3E46",
  textoSuave: "#6B7076",
  borda: "#E3E1DC",
  concreto: "#F5F4F1",
};

export const main = {
  backgroundColor: "#ffffff",
  fontFamily: "'Barlow', Arial, Helvetica, sans-serif",
  margin: "0",
  padding: "24px 0",
};

export const container = {
  maxWidth: "560px",
  margin: "0 auto",
  border: `1px solid ${cores.borda}`,
  borderRadius: "10px",
  overflow: "hidden" as const,
};

export const header = {
  backgroundColor: cores.grafite,
  padding: "22px 28px",
  borderBottom: `4px solid ${cores.amarelo}`,
};

export const brand = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: 700 as const,
  letterSpacing: "1.5px",
  textTransform: "uppercase" as const,
  margin: "0",
};

export const content = { padding: "28px" };

export const h1 = {
  fontSize: "21px",
  fontWeight: 700 as const,
  color: cores.grafite,
  margin: "0 0 16px",
};

export const text = {
  fontSize: "15px",
  color: cores.texto,
  lineHeight: "1.6",
  margin: "0 0 22px",
};

export const button = {
  backgroundColor: cores.amarelo,
  color: cores.grafite,
  fontSize: "15px",
  fontWeight: 700 as const,
  borderRadius: "8px",
  padding: "13px 24px",
  textDecoration: "none",
  display: "inline-block",
};

export const codigo = {
  backgroundColor: cores.concreto,
  border: `1px solid ${cores.borda}`,
  borderRadius: "8px",
  color: cores.grafite,
  fontSize: "28px",
  fontWeight: 700 as const,
  letterSpacing: "6px",
  padding: "16px 20px",
  textAlign: "center" as const,
  margin: "0 0 22px",
};

export const footer = {
  fontSize: "12px",
  color: cores.textoSuave,
  lineHeight: "1.6",
  margin: "26px 0 0",
};
