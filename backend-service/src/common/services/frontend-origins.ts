const productionOrigins = [
  'https://impactc.optimizesolux.com',
  'https://impactc-admin.optimizesolux.com',
];

export function frontendOrigins(): string[] {
  const configured = (process.env.FRONTEND_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length) return [...new Set(configured)];
  if (process.env.NODE_ENV === 'production') return productionOrigins;

  return ['http://localhost:3000', 'http://localhost:8081'];
}

export function isAllowedFrontendOrigin(origin: string | undefined): boolean {
  return !origin || frontendOrigins().includes(origin);
}
