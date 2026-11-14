/**
 * src/portal/session.ts
 * Session, Role-Based Access Control and Guards
 * PORTAL_SPEC.md Section 2
 */
import rawHospitals from '../world/hospitals.json';

export type UserRole = 'dispatch' | 'hospital';

export interface UserSession {
  operatorId: string;
  role: UserRole;
  hospital?: string; // 3-letter hospital code, e.g. "AIM"
  demoMode?: boolean;
}

const SESSION_STORAGE_KEY = 'plexus.session';

/**
 * Returns the current active session or a default demo session
 */
export function getSession(): UserSession {
  if (typeof window === 'undefined') {
    return { operatorId: 'PLX-AIIMS-01', role: 'dispatch', demoMode: true };
  }

  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.operatorId && parsed.role) {
        return parsed as UserSession;
      }
    }
  } catch (err) {
    console.warn('[Session] Failed to parse plexus.session:', err);
  }

  // Default demo account
  return {
    operatorId: 'PLX-AIIMS-01',
    role: 'dispatch',
    demoMode: true,
  };
}

/**
 * Stores the user session into sessionStorage and localStorage
 */
export function setSession(session: UserSession): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent('plexus:session_change', { detail: session }));
  } catch (err) {
    console.error('[Session] Failed to save plexus.session:', err);
  }
}

/**
 * Clears the user session
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('plexus:session_change', { detail: null }));
  } catch (err) {
    console.error('[Session] Failed to clear session:', err);
  }
}

/**
 * Matches a hospital code (e.g. "AIM", "MAX", "SFD") from an email or identifier
 * Supports:
 * - <hospital-name>@gmail.com (e.g. aiims@gmail.com, max@gmail.com, safdarjung@gmail.com)
 * - Hospital code directly (e.g. AIM, MDT) or PLX-AIM-H1
 */
export function matchHospitalCode(identifier: string): string | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();

  // Extract the part before '@' if email format, or take the full identifier
  const emailMatch = clean.match(/^([^@]+)@(?:gmail\.com|fmail\.com|[a-z0-9.-]+\.[a-z]{2,})$/i);
  const target = emailMatch ? emailMatch[1].trim() : clean;
  const stripped = target.replace(/[^a-z0-9]/g, '');

  if (!stripped) return null;

  // 1. Direct code match (e.g. aim, sfd, max, mdt, n62, etc.)
  const directCode = rawHospitals.find((h) => h.code.toLowerCase() === stripped);
  if (directCode) return directCode.code;

  // 2. Specific regex rules for Delhi-NCR hospitals
  if (/aiims|allindia/i.test(target)) return 'AIM';
  if (/safdarjung|safdar/i.test(target)) return 'SFD';
  if (/patparganj/i.test(target)) return 'MXP';
  if (/saket/i.test(target)) return 'MAX';
  if (/max/i.test(target)) return 'MAX';
  if (/medanta/i.test(target)) return 'MDT';
  if (/fortis.*noida|noida.*fortis/i.test(target)) return 'N62';
  if (/fortis.*okhla|okhla.*fortis/i.test(target)) return 'FTN';
  if (/fortis.*vasant|vasant.*fortis/i.test(target)) return 'FSB';
  if (/gtb|dilshad/i.test(target)) return 'GTB';
  if (/rml|connaught/i.test(target)) return 'RML';
  if (/lok\s*nayak|lnjp/i.test(target)) return 'LNJ';
  if (/ganga\s*ram|gangaram/i.test(target)) return 'SGR';
  if (/apollo|sarita/i.test(target)) return 'APL';
  if (/rajiv\s*gandhi/i.test(target)) return 'RGV';
  if (/blk/i.test(target)) return 'BLK';
  if (/manipal/i.test(target)) return 'MPD';
  if (/stephen/i.test(target)) return 'STP';
  if (/saroj/i.test(target)) return 'ROH';
  if (/venkateshwar/i.test(target)) return 'DWK';
  if (/paras/i.test(target)) return 'GCH';
  if (/jaypee/i.test(target)) return 'NBV';
  if (/ddu|deendayal/i.test(target)) return 'DRB';
  if (/sanjay\s*gandhi/i.test(target)) return 'SDP';
  if (/artemis/i.test(target)) return 'NH4';
  if (/holy\s*family/i.test(target)) return 'PRS';
  if (/noida/i.test(target)) return 'N62';
  if (/gurugram|gurgaon/i.test(target)) return 'MDT';
  if (/rohini/i.test(target)) return 'ROH';
  if (/dwarka/i.test(target)) return 'DWK';

  // 3. Normalized hospital name / full name matching
  for (const h of rawHospitals) {
    const normName = h.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normFull = h.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (stripped.includes(normName) || normName.includes(stripped)) return h.code;
    if (stripped.includes(normFull) || normFull.includes(stripped)) return h.code;
  }

  // 4. Legacy PLX match: PLX-<CODE>-...
  const plxMatch = clean.match(/plx-([a-z0-9]{3,4})/i);
  if (plxMatch) {
    const code = plxMatch[1].toUpperCase();
    const exists = rawHospitals.some((h) => h.code.toUpperCase() === code);
    if (exists) return code;
  }

  return null;
}

/**
 * Parses an operator ID or email to determine role and hospital
 * - Admin / Dispatch: admin@fmail.com, admin@gmail.com, PLX-AIIMS-01, PLX-DISPATCH-01
 * - Hospital: <hospital-name>@gmail.com, PLX-<CODE>-H1, or hospital code/name
 */
export function parseOperatorCredentials(operatorId: string): {
  role: UserRole;
  hospital?: string;
  isValid: boolean;
} {
  const clean = operatorId.trim();
  const lower = clean.toLowerCase();

  // Admin / Dispatch regex: admin@fmail.com, admin@gmail.com, admin, or PLX-DISPATCH / PLX-AIIMS-01
  if (
    /^admin(?:@(?:fmail\.com|gmail\.com|[a-z0-9.-]+\.[a-z]{2,}))?$/i.test(clean) ||
    clean.toUpperCase() === 'PLX-AIIMS-01' ||
    clean.toUpperCase() === 'PLX-DISPATCH-01' ||
    clean.toUpperCase().startsWith('PLX-DISPATCH')
  ) {
    return { role: 'dispatch', isValid: true };
  }

  // Hospital email or name regex match (e.g. aiims@gmail.com, max@gmail.com)
  const matchedHosp = matchHospitalCode(clean);
  if (matchedHosp) {
    return {
      role: 'hospital',
      hospital: matchedHosp,
      isValid: true,
    };
  }

  // Hospital accounts with legacy format (PLX-<CODE>-H1 or PLX-<CODE>-...)
  const hospMatch = clean.toUpperCase().match(/^PLX-([A-Z0-9]{3,4})-H\d+$/i);
  if (hospMatch) {
    return {
      role: 'hospital',
      hospital: hospMatch[1].toUpperCase(),
      isValid: true,
    };
  }

  // If email was provided but didn't match any known hospital, fallback to AIM
  if (lower.includes('@')) {
    return {
      role: 'hospital',
      hospital: 'AIM',
      isValid: true,
    };
  }

  return { role: 'hospital', hospital: 'AIM', isValid: true };
}

/**
 * Guards: Hospital user cannot open /workspace/* (redirect to their Today screen)
 */
export function canAccessWorkspace(session: UserSession = getSession()): boolean {
  return session.role === 'dispatch';
}

/**
 * Guards: Dispatchers can open hospital portal via "View as hospital"
 */
export function canAccessHospital(
  _hospitalCode: string,
  session: UserSession = getSession()
): boolean {
  // Both dispatch and hospital users can view hospital portals in this system
  return session.role === 'dispatch' || session.role === 'hospital';
}

/**
 * Determines whether demo switcher should be rendered
 * PORTAL_SPEC.md 2: "Demo: hospital ▾" dropdown in the header (dispatch role and demo mode only)
 */
export function canShowDemoSwitcher(session: UserSession = getSession()): boolean {
  return session.role === 'dispatch' || session.demoMode === true;
}
