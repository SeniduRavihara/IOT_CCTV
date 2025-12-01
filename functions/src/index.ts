import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
const Busboy = require("busboy");

admin.initializeApp();

setGlobalOptions({ maxInstances: 10 });

export const processImage = onRequest({ cors: true }, (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const busboy = Busboy({ headers: req.headers });
  const tmpdir = os.tmpdir();
  const uploads: { [key: string]: string } = {};
  const fileWrites: Promise<void>[] = [];

  busboy.on("file", (fieldname: string, file: any, info: any) => {
    const { filename } = info;
    const filepath = path.join(tmpdir, filename);
    uploads[fieldname] = filepath;

    const writeStream = fs.createWriteStream(filepath);
    file.pipe(writeStream);

    const promise = new Promise<void>((resolve, reject) => {
      file.on("end", () => {
        writeStream.end();
      });
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
    fileWrites.push(promise);
  });

  busboy.on("finish", async () => {
    await Promise.all(fileWrites);

    try {
      for (const file in uploads) {
        const filepath = uploads[file];
        const destination = `captures/${uuidv4()}.jpg`;
        
        await admin.storage().bucket().upload(filepath, {
          destination,
          metadata: {
            contentType: "image/jpeg",
          },
        });
        
        logger.info(`Uploaded ${filepath} to ${destination}`);
        fs.unlinkSync(filepath); // Clean up temp file
      }
      
      // TODO: Trigger Face Recognition here
      logger.info("Face detection placeholder triggered.");

      res.status(200).send({ message: "Image processed successfully" });
    } catch (error) {
      logger.error("Error processing image", error);
      res.status(500).send({ error: "Internal Server Error" });
    }
  });

  busboy.end(req.rawBody);
});
