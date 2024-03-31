import * as path from 'path';
import * as os from 'os';

export const FLOMO_CACHE_LOC = path.join(os.homedir(), "/.flomo/cache/");
export const FLOMO_PLAYWRIGHT_CACHE_LOC = path.join(os.homedir(), "/.flomo/cache/playwright/");
export const AUTH_FILE = FLOMO_PLAYWRIGHT_CACHE_LOC + 'flomo_auth.json';
export const DOWNLOAD_FILE = FLOMO_PLAYWRIGHT_CACHE_LOC + 'flomo_export.zip';