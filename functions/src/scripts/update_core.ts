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

import { credential, firestore } from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import { coreVersion } from '../data';
import { FieldValue } from 'firebase-admin/firestore';

if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
    initializeApp();
} else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require('../../../credentials.json');
    initializeApp({
        credential: credential.cert(serviceAccount),
    });
}

console.log('Updating core data...');

async function setVersion() {
    const db = firestore();
    const doc = await db.collection('/core').doc('version').get();
    if (doc.exists) {
        await db
            .collection('/core')
            .doc('version')
            .update({
                ...coreVersion,
                modificationDate: FieldValue.serverTimestamp(),
            });
    } else {
        await db
            .collection('/core')
            .doc('version')
            .set({
                ...coreVersion,
                creationDate: FieldValue.serverTimestamp(),
                modificationDate: FieldValue.serverTimestamp(),
            });
    }
}

setVersion().then(() => {
    console.log('Version have been updated');
});
