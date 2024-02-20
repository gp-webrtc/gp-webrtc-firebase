//
// gp-webrtc-firebase
// Copyright (c) 2024, Greg PFISTER. MIT License.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the “Software”), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { Timestamp } from 'firebase-admin/firestore';
import { Change, FirestoreEvent, QueryDocumentSnapshot } from 'firebase-functions/v2/firestore';

import { userNotificationMetadata } from '../data';
import { GPWUserNotification, GPWUserNotificationOptions } from '../models';
import {
    apnsService,
    fcmService,
    userNotificationRegistrationTokenService,
    userNotificationService,
} from '../services';
import { Notification } from '@parse/node-apn';

export class GPWUserNotificationController {
    async onDocumentUpdated(
        event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, { userId: string; notificationId: string }>
    ) {
        const ts = Timestamp.now();

        if (event.data) {
            const userId = event.params.userId;
            const notificationId = event.params.notificationId;
            const before = event.data.before.data() as GPWUserNotification;
            const after = event.data.before.data() as GPWUserNotification;
            after.modificationDate = before.modificationDate;

            if (before.wasRead !== after.wasRead || before.wasReceived || after.wasReceived) {
                after.modificationDate = ts;
                await userNotificationService.save(userId, notificationId, after);
            }
        }
    }

    async send(userId: string, options: GPWUserNotificationOptions) {
        const { uuid } = await userNotificationService.create(userId, options);

        const metadata = userNotificationMetadata[options.type];

        const data = { json: JSON.stringify(options.data) };

        const tokens = await userNotificationRegistrationTokenService.getAll(userId);

        if (tokens.length === 0) {
            return;
        }

        const apnsTokens = tokens
            .map((token) => {
                if ('apnsToken' in token.token)
                    return {
                        tokenId: token.tokenId,
                        token: token.token.apnsToken.apns,
                    };
                else return undefined;
            })
            .flatMap((token) => (token ? [{ tokenId: token.tokenId, token: token.token }] : []));

        const voipTokens = tokens
            .map((token) => {
                if ('apnsToken' in token.token && token.token.apnsToken.voip)
                    return {
                        tokenId: token.tokenId,
                        token: token.token.apnsToken.voip,
                    };
                else return undefined;
            })
            .flatMap((token) => (token ? [{ tokenId: token.tokenId, token: token.token }] : []));

        const fcmTokens = tokens
            .map((token) => {
                if ('fcmToken' in token.token)
                    return {
                        tokenId: token.tokenId,
                        token: token.token.fcmToken,
                    };
                else return undefined;
            })
            .flatMap((token) => (token ? [{ tokenId: token.tokenId, token: token.token }] : []));

        switch (options.type) {
            case 'call':
                if (metadata.apns && metadata.apns.pushType === 'voip' && voipTokens.length > 0) {
                    const notification = new Notification();
                    notification.id = uuid;
                    notification.expiry = Math.floor(Date.now() / 1000) + 30; // 30 seconds
                    notification.topic = metadata.apns.topic;
                    notification.pushType = 'voip';
                    notification.priority = metadata.apns.priority;
                    notification.payload = options.data;
                    await apnsService.send(userId, voipTokens, notification);
                }
                if (metadata.fcm && fcmTokens.length > 0) {
                    await fcmService.send(userId, fcmTokens, {
                        ...metadata.fcm,
                        data,
                    });
                }
                break;
            case 'userDeviceAdded':
                if (metadata.apns && metadata.apns.pushType === 'alert' && apnsTokens.length > 0) {
                    const notification = new Notification();
                    notification.id = uuid;
                    notification.expiry = Math.floor(Date.now() / 1000) + 3600 * 24 * 7; // 7 days
                    notification.topic = metadata.apns.topic;
                    notification.priority = metadata.apns.priority;
                    notification.collapseId = options.data.deviceId;
                    notification.aps.category = metadata.apns.category;
                    notification.aps.alert = {
                        title: 'New device added',
                        body: 'A new device has been added',
                    };
                    notification.payload = {
                        aps: { category: metadata.apns.category },
                        ...options.data,
                    };
                    await apnsService.send(userId, apnsTokens, notification);
                }
                if (metadata.fcm && fcmTokens.length > 0) {
                    await fcmService.send(userId, fcmTokens, {
                        notification: options.notification,
                        ...metadata.fcm,
                        data,
                    });
                }
                break;
        }
    }
}
