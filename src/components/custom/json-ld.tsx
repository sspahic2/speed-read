export function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Speed Reader",
    url: "https://quicky.now",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description:
      "Upload PDFs & EPUBs and read 3x faster with RSVP speed-reading. Adjustable pacing, personal cloud library, and speech practice.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free trial available",
    },
    featureList: [
      "RSVP speed reading",
      "PDF and EPUB support",
      "Adjustable words per minute",
      "Personal cloud library",
      "Speech practice mode",
      "Reading progress sync",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
