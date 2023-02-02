import * as admin from "firebase-admin";

import * as Mustache from "mustache";

interface TemplateData {
  template: Record<string, string>;
  version: number;
}

export default class Template {
  document: admin.firestore.DocumentReference;
  private templateData: TemplateData;
  private ready: boolean;
  private waits: (() => void)[];

  constructor(collection: admin.firestore.DocumentReference) {
    this.document = collection;
    this.document.onSnapshot(this.updateTemplates.bind(this));
    this.ready = false;
    this.waits = [];
  }

  private waitUntilReady(): Promise<void> {
    if (this.ready) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.waits.push(resolve);
    });
  }

  private updateTemplates(
    snap: admin.firestore.DocumentSnapshot<TemplateData>
  ) {
    const data = snap.data();

    this.templateData = data;

    this.ready = true;
    this.waits.forEach((wait) => wait());
  }

  checkTemplateExists = async () => {
    const snap = await this.document.get();
    return snap.exists;
  };

  async render({
    data,
    currentVersion,
  }: {
    data: any;
    currentVersion?: number;
  }): Promise<any> {
    await this.waitUntilReady();

    if (!this.templateData) {
      //fallback, check if template does exist, results may be cached
      // checkingMissingTemplate(name);
      const templateExists = this.checkTemplateExists();

      if (!templateExists)
        return Promise.reject(
          new Error(`Tried to render non-existent template`)
        );
    }

    const templateData = this.templateData.template;
    const version = this.templateData.version;

    if (!currentVersion) {
      return {
        data: JSON.parse(Mustache.render(JSON.stringify(templateData), data)),
        currentVersion: version,
      };
    } else if (version > currentVersion) {
      // handle this in a user-specified way
    } else if (version < currentVersion) {
      // handle this in a user-specified way
    } else {
      // probably do nothing
    }
  }
}
