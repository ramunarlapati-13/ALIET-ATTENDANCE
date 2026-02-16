import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

const db = admin.firestore();

export async function POST(request: NextRequest) {
    try {
        const { title, body, tokens, topic, imageUrl, filters } = await request.json();

        if (!title || !body) {
            return NextResponse.json(
                { error: 'Title and body are required' },
                { status: 400 }
            );
        }

        // Prepare the message payload
        const messageBase: any = {
            notification: {
                title,
                body,
            },
            webpush: {
                notification: {
                    title,
                    body,
                    icon: '/logo.png',
                    badge: '/logo.png',
                },
                fcmOptions: {
                    link: process.env.NEXT_PUBLIC_APP_URL || 'https://alietake.web.app',
                },
            },
        };

        if (imageUrl) {
            messageBase.notification.imageUrl = imageUrl;
            messageBase.webpush.notification.image = imageUrl;
        }

        let targetTokens: string[] = [];

        // 1. If explicit tokens provided, use them
        if (tokens && Array.isArray(tokens) && tokens.length > 0) {
            targetTokens = tokens;
        }
        // 2. If topic provided, we can send to topic (but checking tokens is more flexible usually for custom filtering)
        else if (topic) {
            // For topic messaging, we return early
            const message = { ...messageBase, topic };
            const response = await admin.messaging().send(message);
            return NextResponse.json({ success: true, messageId: response });
        }
        // 3. If filters provided, query Firestore
        else if (filters) {
            let query: admin.firestore.Query = db.collection('admin').doc('notifications').collection('tokens');

            if (filters.role && filters.role !== 'all') {
                query = query.where('role', '==', filters.role);
            }
            if (filters.branch) {
                query = query.where('branch', '==', filters.branch);
            }
            if (filters.year) {
                query = query.where('year', '==', parseInt(filters.year));
            }
            if (filters.section) {
                query = query.where('section', '==', filters.section);
            }

            const snapshot = await query.get();
            targetTokens = snapshot.docs.map(doc => doc.data().token).filter(t => t);
            console.log(`Found ${targetTokens.length} tokens matching filters:`, filters);
        }

        if (targetTokens.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No recipients found matching criteria.'
            });
        }

        // Send multicast in batches of 500
        const batchSize = 500;
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < targetTokens.length; i += batchSize) {
            const batchTokens = targetTokens.slice(i, i + batchSize);
            const multicastMessage = {
                ...messageBase,
                tokens: batchTokens,
            };

            try {
                const response = await admin.messaging().sendEachForMulticast(multicastMessage);
                successCount += response.successCount;
                failureCount += response.failureCount;

                // Cleanup invalid tokens if any failed
                if (response.failureCount > 0) {
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success && (
                            resp.error?.code === 'messaging/invalid-registration-token' ||
                            resp.error?.code === 'messaging/registration-token-not-registered'
                        )) {
                            const failedToken = batchTokens[idx];
                            // Delete invalid token asynchronously
                            db.collection('admin').doc('notifications').collection('tokens').doc(failedToken).delete().catch(console.error);
                        }
                    });
                }

            } catch (err) {
                console.error('Batch send error:', err);
            }
        }

        return NextResponse.json({
            success: true,
            successCount,
            failureCount,
            recipientCount: targetTokens.length
        });

    } catch (error: any) {
        console.error('Error sending notification:', error);
        return NextResponse.json(
            { error: 'Failed to send notification', details: error.message },
            { status: 500 }
        );
    }
}
