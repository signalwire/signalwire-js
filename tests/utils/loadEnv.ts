import * as fs from 'fs';
import * as path from 'path';

/**
 * Load environment variables from .env file in the integration tests directory
 * @throws Error if the .env file is not found
 */
export function loadEnv() {
  const envPath = path.join(__dirname, '..', 'integration', '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `Environment file not found at ${envPath}. Please create tests/integration/.env based on .env.example`
    );
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}
