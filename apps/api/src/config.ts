export function parsePort(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined) return fallback;

  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a TCP port between 1 and 65535.`);
  }
  return port;
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required when DB_TYPE=mssql.`);
  return value;
}
