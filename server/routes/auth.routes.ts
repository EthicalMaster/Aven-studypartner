import {z} from 'zod';
import {deleteAccount,drainStorageDeletions} from '../services/account-deletion.service.js';
import {passwordRecoveryService,SecurityError} from '../services/password-recovery.service.js';
import {securityMail} from '../services/security-mail.service.js';
import {recoveryRequestSchema,recoveryCompleteSchema,passwordChangeSchema} from '../../shared/account-security.js';
import { accountSessionsService } from '../services/account-sessions.service.js';
import { hashSessionToken } from '../utils/crypto.js';
import { academicPreferencesService } from '../services/academic-preferences.service.js';
import { academicPreferencesSchema } from '../../shared/academic-context.js';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import {
  authService,
  SESSION_COOKIE_NAME,
  AuthenticationError,
  DuplicateEmailError,
  InvalidEmailError,
} from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  completeOnboardingSchema,
  type RegisterInput,
  type LoginInput,
  type UpdateProfileInput,
  type CompleteOnboardingInput,
} from '../utils/validation.js';
import { curriculumService, ACADEMIC_PROGRAMS } from '../services/curriculum.service.js';

export const authRouter = Router();

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

/**
 * POST /api/auth/register
 * Registers a new student account, establishes an authenticated session,
 * and sets the secure HTTP-only cookie.
 */
authRouter.post(
  '/register',
  authRateLimiter,
  validateBody(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = req.body as RegisterInput;
      const userAgent = req.headers['user-agent'];
      const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress;

      const result = await authService.register(input, { userAgent, ipAddress });

      // Set secure HTTP-only cookie
      res.cookie(SESSION_COOKIE_NAME, result.sessionToken, COOKIE_OPTIONS);

      res.status(201).json({
        success: true,
        message: 'Account successfully registered and authenticated.',
        user: result.user,
      });
    } catch (err: any) {
      if (err instanceof DuplicateEmailError || err.code === 'DUPLICATE_EMAIL') {
        res.status(409).json({
          error: 'DUPLICATE_EMAIL',
          message: 'An account with this email address already exists. Please sign in instead.',
        });
        return;
      }
      if (err instanceof InvalidEmailError) {
        res.status(400).json({
          error: 'INVALID_EMAIL',
          message: err.message,
        });
        return;
      }
      if (err.message === 'DATABASE_NOT_CONFIGURED') {
        res.status(503).json({
          error: 'DATABASE_NOT_CONFIGURED',
          message: 'PostgreSQL database is not configured. Set DATABASE_URL in your local environment.',
        });
        return;
      }
      console.error('[Auth Register Error]:', err);
      res.status(500).json({
        error: 'REGISTRATION_FAILED',
        message: 'Unable to complete registration. Please try again.',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Validates student credentials, issues a new session, and sets the secure HTTP-only cookie.
 * Employs generic error responses to prevent account enumeration.
 */
authRouter.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = req.body as LoginInput;
      const userAgent = req.headers['user-agent'];
      const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress;

      const result = await authService.login(input, { userAgent, ipAddress });

      // Set secure HTTP-only cookie
      res.cookie(SESSION_COOKIE_NAME, result.sessionToken, COOKIE_OPTIONS);

      res.json({
        success: true,
        message: 'Authentication successful.',
        user: result.user,
      });
    } catch (err: any) {
      if (err instanceof AuthenticationError) {
        res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password. Please check your credentials.',
        });
        return;
      }
      if (err.message === 'DATABASE_NOT_CONFIGURED') {
        res.status(503).json({
          error: 'DATABASE_NOT_CONFIGURED',
          message: 'PostgreSQL database is not configured. Set DATABASE_URL in your local environment.',
        });
        return;
      }
      console.error('[Auth Login Error]:', err);
      res.status(500).json({
        error: 'LOGIN_FAILED',
        message: 'An unexpected authentication error occurred.',
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Revokes the server-side session in the database and clears the browser's session cookie.
 */
authRouter.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    let sessionToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionToken && req.headers.authorization?.startsWith('Bearer ')) {
      sessionToken = req.headers.authorization.slice(7).trim();
    }

    if (sessionToken) {
      await authService.logout(sessionToken);
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err: any) {
    // Clear cookie regardless of DB errors
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
    res.json({
      success: true,
      message: 'Logged out.',
    });
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated student user and academic profile.
 * Protected by requireAuth.
 */
authRouter.get('/me', requireAuth, (req: Request, res: Response): void => {
  // req.user was securely resolved and verified by requireAuth middleware
  res.json({
    authenticated: true,
    user: req.user,
  });
});

/**
 * PATCH /api/auth/profile
 * Updates the authenticated student's profile information.
 * Protected by requireAuth.
 */
authRouter.patch(
  '/profile',
  requireAuth,
  validateBody(updateProfileSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = req.body as UpdateProfileInput;
      const updatedUser = await authService.updateProfile(req.user!.id, input);

      res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: updatedUser,
      });
    } catch (err: any) {
      console.error('[Update Profile Error]:', err);
      res.status(500).json({
        error: 'UPDATE_FAILED',
        message: 'Unable to update profile. Please try again.',
      });
    }
  }
);

/**
 * POST /api/auth/onboarding/complete
 * Marks onboarding as complete for the authenticated student,
 * updates their configured academic profile preferences, and returns updated user.
 */
authRouter.post(
  '/onboarding/complete',
  requireAuth,
  validateBody(completeOnboardingSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = req.body as CompleteOnboardingInput;
      const updatedUser = await authService.completeOnboarding(req.user!.id, input);

      res.json({
        success: true,
        message: 'Onboarding completed and curriculum profile initialized.',
        user: updatedUser,
      });
    } catch (err: any) {
      console.error('[Onboarding Complete Error]:', err);
      res.status(500).json({
        error: 'ONBOARDING_FAILED',
        message: 'Unable to record onboarding completion.',
      });
    }
  }
);

/**
 * GET /api/auth/curriculum
 * Returns the authenticated student's personalized curriculum eligibility,
 * active academic stage, program, and available programs catalog.
 */
authRouter.get(
  '/curriculum',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = curriculumService.resolveCurriculum(req.user!.profile);

      res.json({
        curriculum: resolved,
        catalog: ACADEMIC_PROGRAMS,
      });
    } catch (err: any) {
      console.error('[Curriculum Fetch Error]:', err);
      res.status(500).json({
        error: 'CURRICULUM_FETCH_FAILED',
        message: 'Failed to resolve academic curriculum.',
      });
    }
  }
);


// Preferences are always scoped to the authenticated profile, never a client ID.
authRouter.all('/academic-preferences', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const studentId = req.user?.profile?.id;
  if (!studentId) { res.status(403).json({message:'A student profile is required.'}); return; }
  try {
    if (req.method === 'GET') { res.json({preferences:await academicPreferencesService.get(studentId)}); return; }
    if (req.method === 'DELETE') { await academicPreferencesService.clear(studentId); res.json({preferences:null}); return; }
    if (req.method === 'PUT') {
      const parsed=academicPreferencesSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({message:'Invalid academic preferences.'}); return; }
      res.json({preferences:await academicPreferencesService.save(studentId,parsed.data)}); return;
    }
    res.setHeader('Allow','GET, PUT, DELETE');res.status(405).json({message:'Method not allowed.'});
  } catch { res.status(503).json({message:'Could not access saved academic preferences. Please try again later.'}); }
});

// Session tokens and hashes remain server-side; only browser labels/timestamps are returned.
authRouter.get('/sessions',requireAuth,async(req:Request,res:Response)=>{
 try {const token=req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.slice(7).trim();
  res.json({sessions:await accountSessionsService.list(req.user!.id,hashSessionToken(token))});
 }catch{res.status(503).json({message:'Could not load active sessions.'});}
});
authRouter.post('/sessions/revoke-others',requireAuth,async(req:Request,res:Response)=>{
 try {const token=req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.slice(7).trim();
  res.json({revoked:await accountSessionsService.revokeOthers(req.user!.id,hashSessionToken(token))});
 }catch{res.status(503).json({message:'Could not sign out other sessions. Try again.'});}
});

// Recovery requests have a uniform response; delivery runs after the response to avoid account timing disclosure.
authRouter.get('/recovery/status',(_req,res)=>res.json({available:securityMail.configured()}));
authRouter.post('/recovery/request',validateBody(recoveryRequestSchema),async(req,res)=>{
 try{
  if(!securityMail.configured())throw new SecurityError(503,'Email recovery is not configured yet.');
  if(!await passwordRecoveryService.admit(`request-ip:${req.ip||req.socket.remoteAddress}`,10,3600))throw new SecurityError(429,'Too many requests. Try again later.');
  res.status(202).json({message:'If the account is eligible, a code will arrive shortly. Check spam too. Wait 60 seconds before requesting another.'});
  void passwordRecoveryService.request(req.body.email).catch(()=>console.warn('[Security] Recovery request could not be delivered.'));
 }catch(error){securityResponse(res,error);}
});
authRouter.post('/recovery/complete',validateBody(recoveryCompleteSchema),async(req,res)=>{
 try{
  if(!securityMail.configured())throw new SecurityError(503,'Email recovery is not configured yet.');
  if(!await passwordRecoveryService.admit(`verify-ip:${req.ip||req.socket.remoteAddress}`,30,3600))throw new SecurityError(429,'Too many attempts. Try again later.');
  await passwordRecoveryService.complete(req.body.email,req.body.code,req.body.password);
  res.clearCookie(SESSION_COOKIE_NAME,{httpOnly:true,secure:isProduction,sameSite:'lax',path:'/'});res.json({message:'Password changed. Sign in with your new password.'});
 }catch(error){securityResponse(res,error);}
});
authRouter.get('/password/allowance',requireAuth,async(req,res)=>{try{res.json(await passwordRecoveryService.allowance(req.user!.id));}catch(error){securityResponse(res,error);}});
authRouter.post('/password/change',requireAuth,authRateLimiter,validateBody(passwordChangeSchema),async(req,res)=>{
 try{await passwordRecoveryService.changeSignedIn(req.user!.id,req.body.currentPassword,req.body.password);res.clearCookie(SESSION_COOKIE_NAME,{httpOnly:true,secure:isProduction,sameSite:'lax',path:'/'});res.json({message:'Password changed. Sign in again.'});}catch(error){securityResponse(res,error);}
});
function securityResponse(res:Response,error:unknown){res.status(error instanceof SecurityError?error.status:503).json({message:error instanceof SecurityError?error.message:'Account security is temporarily unavailable. Try again later.'});}

authRouter.delete('/account',requireAuth,authRateLimiter,validateBody(z.object({password:z.string().min(1).max(256),confirmation:z.literal('DELETE')}).strict()),async(req,res)=>{
 try{const result=await deleteAccount(req.user!.id,req.body.password);res.clearCookie(SESSION_COOKIE_NAME,{httpOnly:true,secure:isProduction,sameSite:'lax',path:'/'});res.json(result);void drainStorageDeletions().catch(()=>console.warn('[Cleanup] File removal will retry.'));}catch(error){securityResponse(res,error);}
});
