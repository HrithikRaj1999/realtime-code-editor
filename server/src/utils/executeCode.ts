import path from "path";
import fs from "fs";
import { exec } from "child_process";

const getCommand = (
  language: string,
  filePath: string,
  outputPath: string,
  fileName: string
): string => {
  switch (language) {
    case "js":
      return `node ${filePath}`;
    case "cpp":
      //Compilation with g++:  g++ ${filePath} -o ${outputPath}/${fileName}.out
      //Execution of the Compiled Program: && ${outputPath}/${fileName}.out
      return `g++ ${filePath} -o ${outputPath}/${fileName}.out && ${outputPath}/${fileName}.out`;
    default:
      return `node ${filePath}`;
  }
};

export default function executeCode(
  filePath: string,
  language: string
): Promise<string> {
  const outputPath = path.join(__dirname, "..", "output");

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  const fileName = path.basename(filePath).split(".")[0];
  const command = getCommand(language, filePath, outputPath, fileName);
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr.toString());
      }
      if (stderr) {
        reject(stderr);
      }
      resolve(stdout);
    });
  });
}
