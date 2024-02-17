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
import { fcmService, userNotificationService } from '../services';
import { logger } from 'firebase-functions/v2';

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
        logger.debug(`Sending notification to ${userId}`, options);
        await userNotificationService.create(userId, options);

        const metadata = userNotificationMetadata[options.type];
        logger.debug('Notification metadata', metadata);

        const data = { json: JSON.stringify(options.data) };

        switch (options.type) {
            case 'call':
                await fcmService.send(userId, { apns: metadata.apns, data: data });
                break;
            case 'userDeviceAdded':
                await fcmService.send(userId, { notification: options.notification, apns: metadata.apns, data });
                break;
        }
    }
}
