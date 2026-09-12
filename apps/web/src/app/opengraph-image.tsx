import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Operations Intelligence Workbench — evidence-backed observations, human-approved decisions, append-only audit trail";

/**
 * Social card generated at build time (no dynamic data), so no runtime cost
 * and no edge-runtime requirement. Satori renders flexbox CSS only.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#0f1320",
          backgroundImage: "linear-gradient(135deg, #0f1320 0%, #131b33 55%, #16224a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundImage: "linear-gradient(135deg, #2b5ce6, #1a41b5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            O
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 26, fontWeight: 600 }}>Operations Intelligence</span>
            <span style={{ fontSize: 15, color: "#93a0bd", letterSpacing: 4, textTransform: "uppercase" }}>
              Workbench
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: -1,
              maxWidth: 940,
            }}
          >
            <span>Scattered operational information in.</span>
            <span style={{ color: "#7ea2ff" }}>Governed, explainable action out.</span>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#aab6d0" }}>
            Evidence cited · Rules deterministic · High-risk decisions human-approved
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {["Three scenario packs", "Evaluation suite 1.000", "Apache-2.0 open source"].map(
            (chip) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  padding: "10px 22px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.22)",
                  fontSize: 20,
                  color: "#e5eaf5",
                }}
              >
                {chip}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    size,
  );
}
