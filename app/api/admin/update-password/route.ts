
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { updatePasswordRequestSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

export async function POST(req: NextRequest) {
    if (!adminAuth) {
        return NextResponse.json(
            { error: 'Server configuration missing for password updates' },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();

        // SECURITY: Validate input before processing
        let validated;
        try {
            validated = updatePasswordRequestSchema.parse(body);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    {
                        error: 'Invalid input',
                        details: error.errors.map(e => ({
                            field: e.path.join('.'),
                            message: e.message
                        }))
                    },
                    { status: 400 }
                );
            }
            throw error;
        }

        const { uid, email, newPassword, adminToken } = validated;

        // SECURITY: Verify admin authentication (CRITICAL - DO NOT DISABLE)
        if (!adminToken) {
            return NextResponse.json(
                { error: 'Unauthorized: No token provided' },
                { status: 401 }
            );
        }

        try {
            await adminAuth.verifyIdToken(adminToken);
            // TODO: Add custom claims verification for admin role
            // const decodedToken = await adminAuth.verifyIdToken(adminToken);
            // if (!decodedToken.admin) {
            //     return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
            // }
        } catch (e) {
            console.error("Admin token verification failed:", e);
            return NextResponse.json(
                { error: 'Unauthorized: Invalid Token' },
                { status: 401 }
            );
        }

        try {
            await adminAuth.updateUser(uid, {
                password: newPassword,
            });
            if (process.env.NODE_ENV === 'development') {
                console.log(`[UpdatePassword] Successfully updated password for UID: ${uid}`);
            }
            return NextResponse.json({ success: true, action: 'updated' });
        } catch (updateError: any) {
            if (updateError.code === 'auth/user-not-found') {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[UpdatePassword] User not found (UID: ${uid}). Attempting to create new user...`);
                }

                if (!email) {
                    return NextResponse.json(
                        { error: 'User not found in Auth and no email provided to create one.' },
                        { status: 404 }
                    );
                }

                try {
                    await adminAuth.createUser({
                        uid: uid,
                        email: email,
                        password: newPassword,
                        emailVerified: true // Auto-verify since admin created it
                    });
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`[UpdatePassword] Successfully created new user for UID: ${uid}`);
                    }
                    return NextResponse.json({ success: true, action: 'created' });
                } catch (createError: any) {
                    console.error('[UpdatePassword] Failed to create user:', createError);
                    throw createError;
                }
            } else {
                throw updateError;
            }
        }

    } catch (error: any) {
        console.error('[UpdatePassword] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update password' },
            { status: 500 }
        );
    }
}
