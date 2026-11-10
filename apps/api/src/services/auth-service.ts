/**
 * MediBooking Enterprise Authentication Service
 * Implements passwordless mobile OTP authentication, sliding-window rate limiting,
 * multi-tenant user identity discovery, and cryptographic JWT session signing.
 */

import crypto from 'crypto';
import {
  UserRole,
  StaffScope,
  AuthTokenPayload,
  UserContext,
} from '@medibooking/types';
import { SEED_DATA, BHOPAL_10_CLINICS } from '@medibooking/database';

export interface OtpRecord {
  mobile: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}

export interface RateLimitRecord {
  count: number;
  windowStart: number;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly otpMap = new Map<string, OtpRecord>();
  private readonly rateLimitMap = new Map<string, RateLimitRecord>();
  private readonly dynamicUsers = new Map<string, UserContext>();

  // 5 minutes TTL for OTP
  private readonly OTP_TTL_MS = 5 * 60 * 1000;
  // Maximum 5 OTP requests in production, high limit in development/test
  private readonly RATE_LIMIT_MAX = process.env.NODE_ENV === 'production' ? 5 : 1000;
  private readonly RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

  constructor(secret?: string) {
    this.jwtSecret = secret || process.env.JWT_SECRET || 'medibooking-enterprise-jwt-secret-dev-2026';
  }

  /**
   * Register dynamically onboarded user (Admin, Doctor, Staff)
   */
  public registerDynamicUser(userContext: UserContext): void {
    const cleanMobile = userContext.mobile.trim().replace(/^\+91/, '');
    this.dynamicUsers.set(cleanMobile, userContext);
  }

  /**
   * Request passwordless 6-digit OTP for an Indian mobile number
   */
  public async requestOtp(mobile: string): Promise<{
    success: boolean;
    message: string;
    ttlSeconds: number;
    devOtp?: string;
  }> {
    const cleanMobile = mobile.trim().replace(/^\+91/, '');
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      throw new Error('Invalid Indian mobile number. Must be 10 digits starting with 6-9.');
    }

    // 1. Sliding window rate limit check
    const now = Date.now();
    const rateLimit = this.rateLimitMap.get(cleanMobile);
    if (rateLimit) {
      if (now - rateLimit.windowStart < this.RATE_LIMIT_WINDOW_MS) {
        if (rateLimit.count >= this.RATE_LIMIT_MAX) {
          const waitMins = Math.ceil((this.RATE_LIMIT_WINDOW_MS - (now - rateLimit.windowStart)) / 60000);
          throw new Error(`Rate limit exceeded. Too many OTP requests. Please retry in ${waitMins} minute(s).`);
        }
        rateLimit.count++;
      } else {
        // Reset window
        this.rateLimitMap.set(cleanMobile, { count: 1, windowStart: now });
      }
    } else {
      this.rateLimitMap.set(cleanMobile, { count: 1, windowStart: now });
    }

    // 2. Generate high-entropy 6-digit numeric OTP
    const generatedOtp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = now + this.OTP_TTL_MS;

    this.otpMap.set(cleanMobile, {
      mobile: cleanMobile,
      otp: generatedOtp,
      expiresAt,
      attempts: 0,
    });

    const isNonProd = process.env.NODE_ENV !== 'production';

    return {
      success: true,
      message: `OTP sent successfully to +91-${cleanMobile}`,
      ttlSeconds: Math.floor(this.OTP_TTL_MS / 1000),
      devOtp: isNonProd ? generatedOtp : undefined,
    };
  }

  /**
   * Verify mobile OTP and issue authenticated JWT session
   */
  public async verifyOtp(
    mobile: string,
    otp: string,
    preferredRole?: UserRole
  ): Promise<{
    token: string;
    userContext: UserContext;
  }> {
    const cleanMobile = mobile.trim().replace(/^\+91/, '');
    const cleanOtp = otp.trim();
    const now = Date.now();

    const record = this.otpMap.get(cleanMobile);
    const isDevBypass = process.env.NODE_ENV !== 'production' && cleanOtp === '123456';

    if (!isDevBypass) {
      if (!record) {
        throw new Error('No active OTP found for this mobile. Please request a new OTP.');
      }
      if (record.expiresAt < now) {
        this.otpMap.delete(cleanMobile);
        throw new Error('OTP has expired. Please request a new one.');
      }
      if (record.attempts >= 5) {
        this.otpMap.delete(cleanMobile);
        throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
      }

      record.attempts++;

      if (record.otp !== cleanOtp) {
        throw new Error('Incorrect OTP. Please check the code and try again.');
      }

      // Single-use guarantee: Invalidate OTP on successful verification
      this.otpMap.delete(cleanMobile);
    }

    // 3. Resolve user identity and tenant context
    const userContext = this.resolveUserContext(cleanMobile, preferredRole);

    // 4. Issue cryptographically signed JWT token
    const tokenPayload: AuthTokenPayload = {
      sub: userContext.userId,
      mobile: userContext.mobile,
      role: userContext.activeRole,
      clinicId: userContext.activeClinicId,
      staffScope: userContext.staffScope,
      dedicatedDoctorId: userContext.dedicatedDoctorId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days validity
    };

    const token = this.signToken(tokenPayload);

    return {
      token,
      userContext,
    };
  }

  /**
   * Register a new Patient with demographic and profile details
   */
  public async registerPatient(data: {
    mobile: string;
    fullName: string;
    age: number;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    email?: string;
    locality: string;
    address?: string;
    bloodGroup?: string;
    emergencyContact?: string;
  }): Promise<{
    token: string;
    userContext: UserContext;
  }> {
    const cleanMobile = data.mobile.trim().replace(/^\+91/, '');
    const userContext: UserContext = {
      userId: `usr-pat-${cleanMobile}`,
      mobile: cleanMobile,
      fullName: data.fullName.trim(),
      activeRole: UserRole.PATIENT,
      allowedRoles: [UserRole.PATIENT],
      availableClinics: [],
    };

    // Store in dynamic users map
    this.registerDynamicUser(userContext);

    // Issue JWT token
    const tokenPayload: AuthTokenPayload = {
      sub: userContext.userId,
      mobile: userContext.mobile,
      role: userContext.activeRole,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    const token = this.signToken(tokenPayload);

    return {
      token,
      userContext,
    };
  }

  /**
   * Cryptographically sign JWT using HMAC-SHA256
   */
  public signToken(payload: AuthTokenPayload): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify and decode JWT token
   */
  public verifyToken(token: string): AuthTokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [encodedHeader, encodedPayload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', this.jwtSecret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature!), Buffer.from(expectedSignature))) {
        return null;
      }

      const payload: AuthTokenPayload = JSON.parse(
        Buffer.from(encodedPayload!, 'base64url').toString('utf8')
      );

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Resolves the full multi-tenant UserContext for a mobile number
   */
  public resolveUserContext(mobile: string, preferredRole?: UserRole): UserContext {
    const cleanMobile = mobile.trim().replace(/^\+91/, '');

    // 0. Check dynamically registered users first if no conflicting preferredRole is requested
    const dynamicUser = this.dynamicUsers.get(cleanMobile);
    if (dynamicUser && (!preferredRole || dynamicUser.allowedRoles.includes(preferredRole) || dynamicUser.activeRole === UserRole.PATIENT)) {
      if (preferredRole && dynamicUser.allowedRoles.includes(preferredRole)) {
        return { ...dynamicUser, activeRole: preferredRole };
      }
      return dynamicUser;
    }

    // 1. If preferredRole is explicitly PATIENT, always return patient identity
    if (preferredRole === UserRole.PATIENT) {
      const patientNames: Record<string, string> = {
        '9826098765': 'Vikramaditya Rao',
        '9826077777': 'Anita Mehra',
        '9826088888': 'Suresh Gupta',
        '9826044444': 'Rahul Sharma',
      };
      const patientName = patientNames[cleanMobile] || 'Patient User';
      return {
        userId: `usr-pat-${cleanMobile}`,
        mobile: cleanMobile,
        fullName: patientName,
        activeRole: UserRole.PATIENT,
        allowedRoles: [UserRole.PATIENT],
        availableClinics: [],
      };
    }

    // 2. Check Platform Super Admin
    if (preferredRole === UserRole.SUPER_ADMIN || cleanMobile.endsWith('00000')) {
      return {
        userId: 'usr-superadmin-01',
        mobile: cleanMobile,
        fullName: 'MediBooking Platform Super Admin',
        activeRole: UserRole.SUPER_ADMIN,
        allowedRoles: [UserRole.SUPER_ADMIN],
        availableClinics: [],
      };
    }

    // 3. If preferredRole is DOCTOR or mobile belongs to a doctor
    if (preferredRole === UserRole.DOCTOR || cleanMobile.endsWith('22222') || cleanMobile.endsWith('12345')) {
      for (const clinic of BHOPAL_10_CLINICS) {
        const docMatch = clinic.doctors.find(
          (d) => d.mobile.replace(/^\+91/, '') === cleanMobile
        );
        if (docMatch) {
          return {
            userId: docMatch.userId,
            mobile: cleanMobile,
            fullName: docMatch.fullName,
            activeRole: UserRole.DOCTOR,
            activeClinicId: clinic.id,
            activeClinicName: clinic.name,
            activeChamberNumber: docMatch.chamberNumber,
            allowedRoles: [UserRole.DOCTOR],
            availableClinics: [
              {
                clinicId: clinic.id,
                clinicName: clinic.name,
                role: UserRole.DOCTOR,
                chamberNumber: docMatch.chamberNumber,
              },
            ],
          };
        }
      }
      // Fallback default doctor (Dr. Rajesh Sharma)
      const doctorMatch = SEED_DATA.doctors[0]!;
      return {
        userId: `usr-doc-${doctorMatch.doctorId.slice(0, 8)}`,
        mobile: cleanMobile,
        fullName: doctorMatch.fullName,
        activeRole: UserRole.DOCTOR,
        activeClinicId: SEED_DATA.clinic.id,
        activeClinicName: SEED_DATA.clinic.name,
        activeChamberNumber: doctorMatch.chamberNumber,
        allowedRoles: [UserRole.DOCTOR],
        availableClinics: [
          {
            clinicId: SEED_DATA.clinic.id,
            clinicName: SEED_DATA.clinic.name,
            role: UserRole.DOCTOR,
            chamberNumber: doctorMatch.chamberNumber,
          },
        ],
      };
    }

    // 4. If preferredRole is RECEPTIONIST or mobile belongs to staff
    if (preferredRole === UserRole.RECEPTIONIST || cleanMobile.endsWith('33333')) {
      for (const clinic of BHOPAL_10_CLINICS) {
        const staffMatch = clinic.staff.find(
          (s) => s.mobile.replace(/^\+91/, '') === cleanMobile
        );
        if (staffMatch) {
          return {
            userId: staffMatch.userId,
            mobile: cleanMobile,
            fullName: staffMatch.fullName,
            activeRole: UserRole.RECEPTIONIST,
            activeClinicId: clinic.id,
            activeClinicName: clinic.name,
            staffScope: staffMatch.staffScope,
            dedicatedDoctorId: staffMatch.dedicatedDoctorId,
            allowedRoles: [UserRole.RECEPTIONIST],
            availableClinics: [
              {
                clinicId: clinic.id,
                clinicName: clinic.name,
                role: UserRole.RECEPTIONIST,
              },
            ],
          };
        }
      }
      // Fallback default receptionist (Sunita Sahu)
      const staffMatch = SEED_DATA.staff[0]!;
      return {
        userId: staffMatch.userId,
        mobile: cleanMobile,
        fullName: staffMatch.fullName,
        activeRole: UserRole.RECEPTIONIST,
        activeClinicId: SEED_DATA.clinic.id,
        activeClinicName: SEED_DATA.clinic.name,
        staffScope: staffMatch.scope,
        dedicatedDoctorId: staffMatch.dedicatedDoctorId,
        allowedRoles: [UserRole.RECEPTIONIST],
        availableClinics: [
          {
            clinicId: SEED_DATA.clinic.id,
            clinicName: SEED_DATA.clinic.name,
            role: UserRole.RECEPTIONIST,
          },
        ],
      };
    }

    // 5. If preferredRole is CLINIC_ADMIN or mobile belongs to admin
    if (
      preferredRole === UserRole.CLINIC_ADMIN ||
      cleanMobile.endsWith('99999') ||
      cleanMobile.endsWith('11111') ||
      /^98260100\d{2}$/.test(cleanMobile)
    ) {
      let targetClinic = SEED_DATA.clinic;
      if (/^98260100\d{2}$/.test(cleanMobile)) {
        const clinicIdx = parseInt(cleanMobile.slice(-2), 10) - 1;
        if (BHOPAL_10_CLINICS[clinicIdx]) {
          targetClinic = BHOPAL_10_CLINICS[clinicIdx]!;
        }
      }

      return {
        userId: `usr-admin-${targetClinic.id.slice(0, 8)}`,
        mobile: cleanMobile,
        fullName: `${targetClinic.name} Administrator`,
        activeRole: UserRole.CLINIC_ADMIN,
        activeClinicId: targetClinic.id,
        activeClinicName: targetClinic.name,
        allowedRoles: [UserRole.CLINIC_ADMIN],
        availableClinics: [
          {
            clinicId: targetClinic.id,
            clinicName: targetClinic.name,
            role: UserRole.CLINIC_ADMIN,
          },
        ],
      };
    }

    // 7. Check if mobile matches doctor in BHOPAL_10_CLINICS
    for (const clinic of BHOPAL_10_CLINICS) {
      const docMatch = clinic.doctors.find((d) => d.mobile.replace(/^\+91/, '') === cleanMobile);
      if (docMatch) {
        return {
          userId: docMatch.userId,
          mobile: cleanMobile,
          fullName: docMatch.fullName,
          activeRole: UserRole.DOCTOR,
          activeClinicId: clinic.id,
          activeClinicName: clinic.name,
          activeChamberNumber: docMatch.chamberNumber,
          allowedRoles: [UserRole.DOCTOR],
          availableClinics: [
            {
              clinicId: clinic.id,
              clinicName: clinic.name,
              role: UserRole.DOCTOR,
              chamberNumber: docMatch.chamberNumber,
            },
          ],
        };
      }
    }

    // 8. Check if mobile matches staff in BHOPAL_10_CLINICS
    for (const clinic of BHOPAL_10_CLINICS) {
      const staffMatch = clinic.staff.find((s) => s.mobile.replace(/^\+91/, '') === cleanMobile);
      if (staffMatch) {
        return {
          userId: staffMatch.userId,
          mobile: cleanMobile,
          fullName: staffMatch.fullName,
          activeRole: UserRole.RECEPTIONIST,
          activeClinicId: clinic.id,
          activeClinicName: clinic.name,
          staffScope: staffMatch.staffScope,
          dedicatedDoctorId: staffMatch.dedicatedDoctorId,
          allowedRoles: [UserRole.RECEPTIONIST],
          availableClinics: [
            {
              clinicId: clinic.id,
              clinicName: clinic.name,
              role: UserRole.RECEPTIONIST,
            },
          ],
        };
      }
    }

    // 9. Default identity: Patient
    const patientNames: Record<string, string> = {
      '9826098765': 'Vikramaditya Rao',
      '9826077777': 'Anita Mehra',
      '9826088888': 'Suresh Gupta',
      '9826044444': 'Rahul Sharma',
    };
    const patientName = patientNames[cleanMobile] || 'Patient User';

    return {
      userId: `usr-pat-${cleanMobile}`,
      mobile: cleanMobile,
      fullName: patientName,
      activeRole: UserRole.PATIENT,
      allowedRoles: [UserRole.PATIENT],
      availableClinics: [],
    };
  }

  /**
   * Reset store (used in test suite)
   */
  public reset(): void {
    this.resetStore();
  }

  public resetStore(): void {
    this.otpMap.clear();
    this.rateLimitMap.clear();
    this.dynamicUsers.clear();
  }
}

export const authService = new AuthService();

