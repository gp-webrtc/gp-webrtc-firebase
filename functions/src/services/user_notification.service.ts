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

import { v4 as UUID } from 'uuid';
import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

import { GPWUserNotification, GPWUserNotificationOptions } from '../models';

export class GPWUserNotificationService {
    static default = new GPWUserNotificationService();

    async create(
        userId: string,
        options: GPWUserNotificationOptions
    ): Promise<{ notificationId: string; uuid: string }> {
        const db = firestore();
        const ts = Timestamp.now();

        const notificationId = db.collection(`/users/${userId}/notifications`).doc().id;
        const uuid = UUID();

        const notification: GPWUserNotification = {
            userId,
            notificationId,
            uuid,
            options: JSON.stringify(options),
            wasRead: false,
            wasReceived: false,
            creationDate: ts,
            modificationDate: ts,
        };
        await db.collection(`/users/${userId}/notifications`).doc(notificationId).set(notification);
        return { notificationId, uuid };
    }

    async save(userId: string, notificationId: string, notification: GPWUserNotification) {
        const db = firestore();
        const ts = Timestamp.now();

        notification.modificationDate = ts;

        await db.collection(`/users/${userId}/notifications`).doc(notificationId).update(notification);
    }

    async updateModificationDate(userId: string, notificationId: string) {
        const db = firestore();
        const ts = Timestamp.now();

        await db.collection(`/users/${userId}/notifications`).doc(notificationId).update({ modificationDate: ts });
    }

    async deleteAll(userId: string) {
        const db = firestore();
        const docs = await db.collection(`/users/${userId}/notifications`).listDocuments();
        for (const doc of docs) {
            await doc.delete();
        }
    }

    // documentData(options: GPWUserNotificationOptions): // | { path: string }
    // | { callId: string; callerId: string; displayName: string }
    //     | {
    //           encryptedTitle?: string;
    //           encryptedBody?: string;
    //           encryptedCategoryIdentifier: string;
    //           encryptedPayload: string;
    //       } {
    //     switch (options.type) {
    //         case 'userEncrypted':
    //             const data: {
    //                 encryptedTitle?: string;
    //                 encryptedBody?: string;
    //                 encryptedCategoryIdentifier: string;
    //                 encryptedPayload: string;
    //             } = {
    //                 encryptedCategoryIdentifier: options.encryptedCategoryIdentifier,
    //                 encryptedPayload: options.encryptedPayload,
    //             };
    //             if (options.pushType === 'alert') {
    //                 data.encryptedTitle = options.encryptedTitle;
    //                 if (data.encryptedBody) data.encryptedBody = options.encryptedBody;
    //             }
    //             return data;
    //     }
    // }
}
