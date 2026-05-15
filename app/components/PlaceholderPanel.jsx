"use client";

export default function PlaceholderPanel({ title, description, items }) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 24,
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)"
      }}
    >
      <h2 style={{ margin: 0, fontSize: 24, letterSpacing: -0.5 }}>{title}</h2>
      <p style={{ margin: "8px 0 18px", color: "#6b7280", lineHeight: 1.6 }}>
        {description}
      </p>

      {items && items.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                borderRadius: 14,
                padding: 14,
                color: "#374151",
                fontWeight: 600
              }}
            >
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}