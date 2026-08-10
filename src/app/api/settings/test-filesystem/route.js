import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import fs from 'fs/promises';
import path from 'path';

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST() {
  try {
    console.log("Testing file system access...");

    const testDir = '/tmp'; // Use tmp directory which is usually writable
    const testFileName = `test-file-${Date.now()}.txt`;
    const testFilePath = path.join(testDir, testFileName);
    const testContent = `File system test - ${new Date().toISOString()}`;

    // Test write operation
    await fs.writeFile(testFilePath, testContent, 'utf8');
    console.log("File write test successful");

    // Test read operation
    const readContent = await fs.readFile(testFilePath, 'utf8');
    console.log("File read test successful");

    // Test delete operation
    await fs.unlink(testFilePath);
    console.log("File delete test successful");

    // Check available disk space (Unix/Linux only)
    let diskSpaceInfo = null;
    try {
      if (process.platform !== 'win32') {
        const { execSync } = require('child_process');
        const dfOutput = execSync('df -k /').toString();
        const lines = dfOutput.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          diskSpaceInfo = {
            total: parseInt(parts[1]) * 1024, // Convert to bytes
            used: parseInt(parts[2]) * 1024,
            available: parseInt(parts[3]) * 1024,
          };
        }
      }
    } catch (diskError) {
      console.log("Disk space check not available:", diskError.message);
    }

    return success("File system test successful! Read, write, and delete operations working correctly.", {
      operations: {
        write: "success",
        read: "success", 
        delete: "success",
      },
      testContent: readContent,
      diskSpace: diskSpaceInfo,
      timestamp: new Date().toISOString(),
    }, 200, {
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("File system test error:", err);

    let errorMessage = "File system test failed.";
    let errorCode = "filesystem_test_failed";

    if (err.code === "EACCES") {
      errorMessage = "Permission denied. The application doesn't have write access to the file system.";
      errorCode = "permission_denied";
    } else if (err.code === "ENOSPC") {
      errorMessage = "No space left on device. Please free up disk space.";
      errorCode = "no_disk_space";
    } else if (err.code === "EROFS") {
      errorMessage = "Read-only file system. Cannot write to disk.";
      errorCode = "read_only_filesystem";
    }

    return failure(errorMessage, errorCode, 500, {
      headers: corsHeaders,
    });
  }
}