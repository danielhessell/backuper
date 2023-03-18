import "dotenv/config";

import AdmZip from "adm-zip";
import { S3 } from "aws-sdk";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { paths } from "./paths.json";

async function main() {
  try {
    const zip = new AdmZip();

    const filename = `${new Date()}.zip`;
    const outputFile = `./tmp/backup/${filename}`;

    for (const path of paths) {
      const dirname = process.cwd().split("/");
      const targetPath = "../".repeat(dirname.length - 3) + path;

      process.stdout.write("Copying directories...\n");
      fs.cpSync(targetPath, './tmp/data', { force: true, recursive: true });
    }

    process.stdout.write("Deleting node_modules directories...\n");
    execSync("find ./tmp -name node_modules -type d -print0|xargs -0 rm -rf --");

    process.stdout.write("Ziping folder...\n");
    zip.addLocalFolder('./tmp/data');
    zip.writeZip(outputFile);

    process.stdout.write("Uploading backup...\n");
    process.stdout.write(`${process.cwd()}/tmp/backup/${filename}\n`);
    const s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: "us-east-1"
    });
    await s3.upload({
      Bucket: String(process.env.BUCKET),
      ContentType: "application/zip",
      Key: filename,
      Body: `${process.cwd()}/tmp/backup/${filename}`,
    }).promise();

    execSync("rm -rf tmp/data/* && rm -rf tmp/backup/*");

    process.stdout.write(`Created ${outputFile} successfully!\n`);
  } catch (error) {
    execSync("rm -rf tmp/data/* && rm -rf tmp/backup/*");
    process.stdout.write("ERROR\n");
    process.stdout.write(JSON.stringify(error));
  }
}

main();
