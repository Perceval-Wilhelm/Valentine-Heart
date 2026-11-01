import { ImageResponse } from "next/og";
import { valentine } from "@/content/valentine";
import { createRandom, sampleHeart } from "@/features/heart/geometry";

export const alt = `${valentine.share.title}: a glowing heart made of light, from ${valentine.from}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const signature = `from ${valentine.from}`;

// Without a browser user agent, Google Fonts returns TrueType, which is what the image renderer reads;
// `text` trims the font to just the letters drawn here.
async function googleFont(family: string, axes: string, text: string) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}:${axes}&text=${encodeURIComponent(text)}`,
  ).then((response) => response.text());
  const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
  if (!url) throw new Error(`Google Fonts returned no TrueType file for ${family}`);
  return fetch(url).then((response) => response.arrayBuffer());
}

/** The same particle heart as the page, flattened into dots. */
function heartDots() {
  const { positions, glow } = sampleHeart(1700, 3);
  let circles = "";
  for (let i = 0; i < glow.length; i++) {
    const x = 250 + positions[i * 3] * 196;
    const y = 236 - positions[i * 3 + 1] * 196;
    const rim = glow[i] === 1;
    const color = rim ? "#ffd6e5" : glow[i] > 0.4 ? "#ff6f9f" : "#c23a73";
    circles += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rim ? 2.3 : 1.5}" fill="${color}" fill-opacity="${rim ? 0.95 : 0.7}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="480" viewBox="0 0 500 480"><defs><radialGradient id="g"><stop offset="0" stop-color="#ff4f8b" stop-opacity=".45"/><stop offset="1" stop-color="#ff4f8b" stop-opacity="0"/></radialGradient></defs><circle cx="250" cy="236" r="240" fill="url(#g)"/>${circles}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default async function Image() {
  const [light, bold, sans] = await Promise.all([
    googleFont("Fraunces", "ital,wght@1,300", valentine.greeting),
    googleFont("Fraunces", "ital,wght@1,600", valentine.to),
    googleFont("Be+Vietnam+Pro", "wght@400", signature),
  ]);
  const random = createRandom(9);
  const stars = Array.from({ length: 70 }, () => [random() * 1200, random() * 630, 0.6 + random() * 1.6]);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        position: "relative",
        background: "linear-gradient(180deg, #05010a 0%, #12041b 55%, #2a0826 100%)",
      }}
    >
      {stars.map(([x, y, r]) => (
        <div
          key={`${x}-${y}`}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            background: "#fff2f7",
            opacity: 0.55,
          }}
        />
      ))}
      <img src={heartDots()} width={500} height={480} alt="" style={{ marginLeft: 40 }} />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 10 }}>
        <div style={{ fontFamily: "Fraunces Light", fontStyle: "italic", fontSize: 58, color: "#ffd9e6" }}>
          {valentine.greeting}
        </div>
        <div
          style={{
            fontFamily: "Fraunces",
            fontStyle: "italic",
            fontSize: 150,
            lineHeight: 1,
            color: "#ff9ec2",
            marginTop: 4,
          }}
        >
          {valentine.to}
        </div>
        <div
          style={{
            fontFamily: "Be Vietnam Pro",
            fontSize: 28,
            letterSpacing: 4,
            color: "rgba(255, 226, 236, .7)",
            marginTop: 26,
          }}
        >
          {signature}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Fraunces Light", data: light, weight: 300, style: "italic" },
        { name: "Fraunces", data: bold, weight: 600, style: "italic" },
        { name: "Be Vietnam Pro", data: sans, weight: 400, style: "normal" },
      ],
    },
  );
}
