import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";

const codeDir = path.join(__dirname, "..", "codes");

if (!fs.existsSync(codeDir)) {
  fs.mkdirSync(codeDir, { recursive: true });
}
export default async function generateFile(format: string, code: string) {
  const filePath = path.join(codeDir, `${uuid()}.${format}`);
  console.log(`Generating`, format, code);
  fs.writeFileSync(filePath, code);
  return filePath;
}
