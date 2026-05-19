import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Bitcoin Circular';
const SITE_URL = 'https://bitcoincircular.com';

export interface SeoProps {
  title: string;          // page-specific; will be suffixed with " | Bitcoin Circular" unless includesBrand
  description: string;    // 50–160 chars
  path?: string;          // e.g. "/leaderboard" — used for canonical + og:url
  image?: string;         // absolute or root-relative
  type?: 'website' | 'article' | 'profile';
  includesBrand?: boolean; // set true if title already contains the brand
  jsonLd?: object | object[];
  noIndex?: boolean;
}

const Seo = ({
  title,
  description,
  path = '/',
  image,
  type = 'website',
  includesBrand = false,
  jsonLd,
  noIndex = false,
}: SeoProps) => {
  const fullTitle = includesBrand ? title : `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const imageUrl = image
    ? (image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? image : `/${image}`}`)
    : 'https://storage.googleapis.com/gpt-engineer-file-uploads/3zwD6Z3gBjbo0Ld564p6VOwPUJC3/social-images/social-1777497358347-Bitcoin_Circular_Header.webp';
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
      ))}
    </Helmet>
  );
};

export default Seo;
