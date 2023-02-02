/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import axios, { AxiosInstance } from "axios";

import { Poster } from "./abstract-poster";
import config from "./config";
import * as logs from "./logs";

class FirestorePoster extends Poster {
  private instance: AxiosInstance;
  private apiUrl: string;

  constructor(
    urlFieldName: string,
    shortUrlFieldName: string,
    bearerAccessToken: string,
    apiURL: string
  ) {
    super(urlFieldName, shortUrlFieldName);
    this.apiUrl = apiURL;
    this.instance = axios.create({
      headers: {
        Authorization: `Bearer ${bearerAccessToken}`,
        "Content-Type": "application/json",
      },
    });

    logs.init();
  }

  protected async processSnapshot(
    snapshot: admin.firestore.DocumentSnapshot<{
      input;
      output?;
      metadata: { currentVersion?: number | undefined };
    }>
  ): Promise<void> {
    const body = this.extractBody(snapshot);
    const { metadata } = snapshot.data();
    const currentVersion = metadata?.currentVersion || 0;

    try {
      const response: any = await this.instance.post(this.apiUrl, body);

      const { data } = response;

      const output = this.template.render({ data, currentVersion });

      await this.updateDocument(snapshot, { output });
    } catch (err) {
      logs.error(err);
    }
  }
}

const poster = new FirestorePoster(
  config.inputFieldName,
  config.outputFieldName,
  config.bearerAccessToken,
  config.apiURL
);

export const firestorePostRequest = functions.firestore
  .document(config.collectionPath)
  .onWrite(async (change) => {
    return poster.onDocumentWrite(change);
  });
