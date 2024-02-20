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

import { messaging } from 'firebase-admin';
import { BaseMessage, MulticastMessage } from 'firebase-admin/messaging';

import { userNotificationRegistrationTokenService } from '.';
import { logger } from 'firebase-functions/v1';

export class GPWFCMService {
    async send(userId: string, tokens: { tokenId: string; token: string }[], baseMessage: BaseMessage) {
        const fcm = messaging();

        const message: MulticastMessage = {
            tokens: tokens.map((token) => token.token),
            ...baseMessage,
        };

        const responses = await fcm.sendEachForMulticast(message);

        logger.debug('Response from FCM', responses);

        let i = 0;
        for (const response of responses.responses) {
            if (
                response.error &&
                (response.error.code === 'messaging/registration-token-not-registered' ||
                    response.error.code === 'messaging/invalid-argument')
            ) {
                const tokenId = tokens[i].tokenId;
                await userNotificationRegistrationTokenService.delete(userId, tokenId);
                logger.warn(`User notification registration token ${tokenId} deleted`);
            }
            i++;
        }
    }
}
